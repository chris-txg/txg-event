import logging
from typing import Any
from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from accounts.tokens import email_verification_token
from core.utils.images import convert_image_to_webp

logger = logging.getLogger(__name__)
User = get_user_model()


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
    Asynchronously sends an email verification link to a registered user.
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

        display_name = user.first_name or user.username
        subject = "Verify your email address - Event Platform"
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@eventplatform.com")
        recipient_list = [user.email]

        text_content = (
            f"Hello {display_name},\n\n"
            f"Thank you for registering on Event Platform!\n\n"
            f"Please verify your email address by clicking the link below:\n"
            f"{verification_link}\n\n"
            f"This link will expire in {getattr(settings, 'PASSWORD_RESET_TIMEOUT', 259200) // 3600} hours.\n\n"
            f"If you did not create this account, please ignore this email.\n\n"
            f"Best regards,\n"
            f"The Event Platform Team"
        )

        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify your email</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0f172a; margin-top: 0;">Verify your email address</h2>
    <p>Hello <strong>{display_name}</strong>,</p>
    <p>Thank you for creating an account on Event Platform. Please confirm your email address to activate all platform features.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{verification_link}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
    </div>
    <p style="font-size: 13px; color: #64748b;">Or paste this link into your browser:<br><a href="{verification_link}" style="color: #4f46e5; word-break: break-all;">{verification_link}</a></p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">If you didn't create an account, you can safely ignore this email.</p>
  </div>
</body>
</html>"""

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=recipient_list,
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()

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


