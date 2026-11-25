import logging
from typing import Any, Optional
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import HttpRequest
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from accounts.middleware import get_current_correlation_id
from accounts.models import AuditAction, AuditLog, CustomerProfile, UserType, VendorProfile
from accounts.tokens import email_verification_token

User = get_user_model()
logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {
    "password",
    "password_confirm",
    "old_password",
    "new_password",
    "new_password_confirm",
    "token",
    "access",
    "refresh",
    "secret",
    "authorization",
}


def sanitize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Sanitizes sensitive information from audit log payloads."""
    cleaned: dict[str, Any] = {}
    for key, val in payload.items():
        if any(sensitive in key.lower() for sensitive in SENSITIVE_KEYS):
            cleaned[key] = "[REDACTED]"
        elif isinstance(val, dict):
            cleaned[key] = sanitize_payload(val)
        else:
            cleaned[key] = val
    return cleaned


def get_client_ip(request: Optional[HttpRequest]) -> Optional[str]:
    """Safely extracts the client IP address considering proxy headers."""
    if not request:
        return None
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def record_audit_log(
    action: str,
    actor: Optional[Any] = None,
    request: Optional[HttpRequest] = None,
    details: Optional[dict[str, Any]] = None,
) -> AuditLog:
    """
    Creates an immutable audit log entry according to enterprise standards.
    """
    ip_address = get_client_ip(request)
    user_agent = request.META.get("HTTP_USER_AGENT", "")[:512] if request else ""
    correlation_id = getattr(request, "correlation_id", "") or get_current_correlation_id()
    scrubbed_details = sanitize_payload(details or {})

    # If actor is not passed explicitly, attempt to get it from request
    if actor is None and request and hasattr(request, "user") and request.user.is_authenticated:
        actor = request.user

    log_entry = AuditLog.objects.create(
        actor=actor,
        action=action,
        ip_address=ip_address,
        user_agent=user_agent,
        correlation_id=correlation_id,
        details=scrubbed_details,
    )
    logger.info(
        "AUDIT_EVENT: action=%s actor=%s ip=%s correlation_id=%s",
        action,
        str(actor.id) if actor else "Anonymous",
        ip_address,
        correlation_id,
    )
    return log_entry


class AuthService:
    """
    Encapsulates all authentication, identity, and verification business logic.
    """

    @staticmethod
    def register_user(
        validated_data: dict[str, Any],
        request: Optional[HttpRequest] = None,
    ) -> Any:
        password = validated_data.pop("password")
        validated_data.pop("password_confirm", None)
        customer_data = validated_data.pop("customer_profile", None)
        vendor_data = validated_data.pop("vendor_profile", None)

        with transaction.atomic():
            user = User(**validated_data)
            user.set_password(password)
            user.save()

            if user.user_type == UserType.CUSTOMER:
                CustomerProfile.objects.create(user=user, **(customer_data or {}))
            elif user.user_type == UserType.VENDOR:
                VendorProfile.objects.create(user=user, **(vendor_data or {}))

            record_audit_log(
                action=AuditAction.REGISTER,
                actor=user,
                request=request,
                details={
                    "username": user.username,
                    "email": user.email,
                    "user_type": user.user_type,
                    "role": user.role,
                },
            )

            # Enterprise Celery trigger: dispatch email verification task only after commit
            from accounts.tasks import process_user_avatar_to_webp, send_verification_email
            user_id = str(user.id)
            transaction.on_commit(lambda: send_verification_email.delay(user_id))

            if user.avatar:
                transaction.on_commit(lambda: process_user_avatar_to_webp.delay(user_id))

        return user

    @staticmethod
    def verify_email(
        uidb64: str,
        token: str,
        request: Optional[HttpRequest] = None,
    ) -> Any:
        """
        Validates the verification token and sets user.is_verified = True.
        """
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise ValidationError({"token": "Invalid or expired verification token."})

        if not email_verification_token.check_token(user, token):
            raise ValidationError({"token": "Invalid or expired verification token."})

        if not user.is_verified:
            with transaction.atomic():
                user.is_verified = True
                user.save(update_fields=["is_verified"])
                record_audit_log(
                    action=AuditAction.EMAIL_VERIFIED,
                    actor=user,
                    request=request,
                    details={"status": "verified"},
                )

        return user

    @staticmethod
    def resend_verification_email(
        email: str,
        request: Optional[HttpRequest] = None,
    ) -> None:
        """
        Re-sends an email verification link if the user exists and is unverified.
        Anti-enumeration safe: doesn't disclose if user exists.
        """
        from accounts.tasks import send_verification_email

        try:
            user = User.objects.only("id", "email", "is_verified").get(email__iexact=email, is_active=True)
            if not user.is_verified:
                user_id = str(user.id)
                transaction.on_commit(lambda: send_verification_email.delay(user_id))
                record_audit_log(
                    action=AuditAction.EMAIL_VERIFICATION_SENT,
                    actor=user,
                    request=request,
                    details={"email": email, "dispatched": True},
                )
            else:
                record_audit_log(
                    action=AuditAction.EMAIL_VERIFICATION_SENT,
                    actor=user,
                    request=request,
                    details={"email": email, "dispatched": False, "reason": "already_verified"},
                )
        except User.DoesNotExist:
            record_audit_log(
                action=AuditAction.EMAIL_VERIFICATION_SENT,
                actor=None,
                request=request,
                details={"email": email, "dispatched": False, "reason": "user_not_found"},
            )

    @staticmethod
    def authenticate_by_credentials(
        identifier: str,
        password: str,
        request: Optional[HttpRequest] = None,
    ) -> Optional[Any]:
        """
        Supports authenticating either by username or email.
        """
        user = None
        # Check if identifier matches email
        if "@" in identifier:
            try:
                candidate = User.objects.only("username", "is_active").get(email__iexact=identifier)
                user = authenticate(request=request, username=candidate.username, password=password)
            except User.DoesNotExist:
                user = None
        else:
            user = authenticate(request=request, username=identifier, password=password)

        if user and user.is_active:
            record_audit_log(
                action=AuditAction.LOGIN_SUCCESS,
                actor=user,
                request=request,
                details={"identifier": identifier},
            )
            return user

        # Record failed attempt
        record_audit_log(
            action=AuditAction.LOGIN_FAILED,
            actor=None,
            request=request,
            details={"identifier": identifier, "reason": "invalid_credentials_or_inactive"},
        )
        return None

    @staticmethod
    def change_password(
        user: Any,
        old_password: str,
        new_password: str,
        request: Optional[HttpRequest] = None,
    ) -> None:
        if not user.check_password(old_password):
            raise ValidationError({"old_password": "Old password is not correct."})

        validate_password(new_password, user=user)

        with transaction.atomic():
            user.set_password(new_password)
            user.password_updated = True
            user.save(update_fields=["password", "password_updated"])
            record_audit_log(
                action=AuditAction.PASSWORD_CHANGE,
                actor=user,
                request=request,
                details={"status": "success"},
            )

    @staticmethod
    def request_password_reset(
        email: str,
        request: Optional[HttpRequest] = None,
    ) -> None:
        """
        Generates token and triggers reset email.
        Prevents user enumeration by succeeding silently if email is not found.
        """
        from accounts.tasks import send_password_reset_email

        try:
            user = User.objects.only("id", "email", "username").get(email__iexact=email, is_active=True)

            record_audit_log(
                action=AuditAction.PASSWORD_RESET_REQUEST,
                actor=user,
                request=request,
                details={"email": email, "found": True},
            )

            user_id = str(user.id)
            transaction.on_commit(lambda: send_password_reset_email.delay(user_id))

        except User.DoesNotExist:
            record_audit_log(
                action=AuditAction.PASSWORD_RESET_REQUEST,
                actor=None,
                request=request,
                details={"email": email, "found": False},
            )

    @staticmethod
    def confirm_password_reset(
        uidb64: str,
        token: str,
        new_password: str,
        request: Optional[HttpRequest] = None,
    ) -> Any:
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise ValidationError({"token": "Invalid or expired reset token."})

        if not default_token_generator.check_token(user, token):
            raise ValidationError({"token": "Invalid or expired reset token."})

        validate_password(new_password, user=user)

        with transaction.atomic():
            user.set_password(new_password)
            user.password_updated = True
            user.save(update_fields=["password", "password_updated"])
            record_audit_log(
                action=AuditAction.PASSWORD_RESET_CONFIRM,
                actor=user,
                request=request,
                details={"status": "success"},
            )

        return user
