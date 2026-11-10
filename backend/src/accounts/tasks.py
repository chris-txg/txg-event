import logging
from typing import Any
from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from accounts.tokens import email_verification_token
from core.utils.images import convert_image_to_webp

logger = logging.getLogger(__name__)
User = get_user_model()


def _send_templated_email(
    subject: str,
    recipient_email: str,
    text_template: str,
    html_template: str,
    context: dict[str, Any],
) -> None:
    """Renders plain-text and branded HTML templates and dispatches a multipart email."""
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@eventplatform.com")
    text_content = render_to_string(text_template, context)
    html_content = render_to_string(html_template, context)

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=from_email,
        to=[recipient_email],
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send()


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    rate_limit="100/m",
    time_limit=300,
    soft_time_limit=240,
)
def send_verification_email(self: Any, user_id: str) -> bool:
    """
    Asynchronously sends a branded Event Manager email verification link to a registered user.
    Idempotent: If the user is already verified, skips transmission.
    """
    try:
        user = User.objects.only("id", "email", "first_name", "username", "is_verified").get(id=user_id)
    except User.DoesNotExist:
        logger.warning("Verification email aborted: user %s does not exist.", user_id)
        return False

    # Idempotency check: Don't send if already verified
    if user.is_verified:
        logger.info("User %s is already verified. Skipping email transmission.", user_id)
        return True

    try:
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        verification_link = f"{frontend_url}/verify-email?uid={uidb64}&token={token}"

        context = {
            "display_name": user.first_name or user.username,
            "verification_link": verification_link,
            "expiry_hours": getattr(settings, "PASSWORD_RESET_TIMEOUT", 259200) // 3600,
        }

        _send_templated_email(
            subject="Verify your email address - Event Manager",
            recipient_email=user.email,
            text_template="accounts/emails/verify_email.txt",
            html_template="accounts/emails/verify_email.html",
            context=context,
        )

        logger.info("Verification email successfully dispatched for user %s (%s).", user_id, user.email)
        return True

    except Exception as exc:
        logger.exception("Failed to send verification email for user %s: %s", user_id, exc)
        countdown = 2 ** self.request.retries * 30
        raise self.retry(exc=exc, countdown=countdown)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    rate_limit="100/m",
    time_limit=300,
    soft_time_limit=240,
)
def send_password_reset_email(self: Any, user_id: str) -> bool:
    """
    Asynchronously sends a branded Event Manager password reset link matching the frontend /reset-password route.
    """
    try:
        user = User.objects.only("id", "email", "first_name", "username", "is_active", "password", "last_login").get(
            id=user_id,
            is_active=True,
        )
    except User.DoesNotExist:
        logger.warning("Password reset email aborted: active user %s does not exist.", user_id)
        return False

    try:
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        reset_link = f"{frontend_url}/reset-password?uid={uidb64}&token={token}"

        context = {
            "display_name": user.first_name or user.username,
            "reset_link": reset_link,
            "expiry_hours": getattr(settings, "PASSWORD_RESET_TIMEOUT", 259200) // 3600,
        }

        _send_templated_email(
            subject="Reset your password - Event Manager",
            recipient_email=user.email,
            text_template="accounts/emails/password_reset.txt",
            html_template="accounts/emails/password_reset.html",
            context=context,
        )

        logger.info("Password reset email successfully dispatched for user %s (%s).", user_id, user.email)
        return True

    except Exception as exc:
        logger.exception("Failed to send password reset email for user %s: %s", user_id, exc)
        countdown = 2 ** self.request.retries * 30
        raise self.retry(exc=exc, countdown=countdown)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    rate_limit="100/m",
    time_limit=300,
    soft_time_limit=240,
)
def process_user_avatar_to_webp(self: Any, user_id: str) -> bool:
    """
    Asynchronously converts a user's uploaded temporary avatar to WebP format.
    Idempotent: If the avatar is already .webp and not in temp, skips conversion.
    """
    try:
        user = User.objects.only("id", "avatar").get(id=user_id)
    except User.DoesNotExist:
        logger.warning("Avatar conversion aborted: user %s does not exist.", user_id)
        return False

    if not user.avatar or not user.avatar.name:
        logger.info("User %s has no avatar. Skipping conversion.", user_id)
        return True

    current_path = user.avatar.name.replace("\\", "/")
    # Idempotency check: If already converted to webp and outside temp folder
    if current_path.endswith(".webp") and not current_path.startswith("avatars/temp/"):
        logger.info("Avatar for user %s is already processed: %s", user_id, current_path)
        return True

    try:
        source_full_path = user.avatar.path
        output_dir_relative = f"avatars/{user_id}"
        new_relative_path = convert_image_to_webp(
            source_file_path=source_full_path,
            output_dir_relative=output_dir_relative,
            max_dimensions=(800, 800),
            quality=85,
            delete_source=True,
        )

        user.avatar.name = new_relative_path
        user.save(update_fields=["avatar"])
        logger.info("Successfully converted avatar to WebP for user %s: %s", user_id, new_relative_path)
        return True
    except FileNotFoundError:
        logger.warning("Source avatar file for user %s not found on disk.", user_id)
        return False
    except Exception as exc:
        logger.exception("Failed to convert avatar to WebP for user %s: %s", user_id, exc)
        countdown = 2 ** self.request.retries * 30
        raise self.retry(exc=exc, countdown=countdown)


