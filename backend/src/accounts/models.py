import uuid
from typing import Any
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from accounts.validators import validate_gst_number, validate_pan_number


class UserType(models.TextChoices):
    VENDOR = 'VENDOR', 'Vendor'
    CUSTOMER = 'CUSTOMER', 'Customer'
    ADMIN = 'ADMIN', 'Admin'


class CustomerType(models.TextChoices):
    B2C = 'B2C', 'Business to Consumer (Individual)'
    B2B = 'B2B', 'Business to Business (Corporate)'


class VendorCategory(models.TextChoices):
    VENUE = 'VENUE', 'Venue & Event Spaces'
    CATERING = 'CATERING', 'Catering & Beverages'
    PHOTOGRAPHY = 'PHOTOGRAPHY', 'Photography & Videography'
    AUDIO_VISUAL = 'AUDIO_VISUAL', 'Audio, Visual & Lighting'
    DECORATION = 'DECORATION', 'Decoration, Stage & Fabrication'
    SECURITY = 'SECURITY', 'Security & Crowd Management'
    ENTERTAINMENT = 'ENTERTAINMENT', 'Music, DJ & Entertainment'
    TRANSPORT = 'TRANSPORT', 'Transport & Logistics'
    OTHER = 'OTHER', 'Other Services'


class RoleChoices(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin'
    COOPERATE = 'COOPERATE', 'Cooperate'
    ORGANIZER = 'ORGANIZER', 'Organizer'
    STAFF = 'STAFF', 'Staff'
    ATTENDEE = 'ATTENDEE', 'Attendee'


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    user_type = models.CharField(
        max_length=20,
        choices=UserType.choices,
        default=UserType.CUSTOMER,
        db_index=True,
    )
    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        default=RoleChoices.ATTENDEE,
        db_index=True,
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        db_index=True,
    )
    is_verified = models.BooleanField(default=False, db_index=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'is_active']),
            models.Index(fields=['user_type', 'is_active']),
            models.Index(fields=['role', 'is_active']),
            models.Index(fields=['username', 'is_active']),
        ]

    def __str__(self) -> str:
        return f"{self.username} ({self.email}) - {self.user_type}"


class CustomerProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='customer_profile',
    )
    customer_type = models.CharField(
        max_length=10,
        choices=CustomerType.choices,
        default=CustomerType.B2C,
        db_index=True,
    )

    # B2B Corporate Details
    company_name = models.CharField(max_length=255, blank=True, null=True)
    gst_number = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        db_index=True,
        validators=[validate_gst_number],
        help_text="15-character GSTIN for B2B Customers",
    )
    pan_number = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        validators=[validate_pan_number],
    )
    industry_type = models.CharField(max_length=100, blank=True, null=True)
    designation = models.CharField(max_length=100, blank=True, null=True)

    # Billing & Location Details
    billing_address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, default='India')

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Customer Profile'
        verbose_name_plural = 'Customer Profiles'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['customer_type', 'gst_number']),
            models.Index(fields=['city', 'customer_type']),
        ]

    def __str__(self) -> str:
        name = self.company_name if self.customer_type == CustomerType.B2B and self.company_name else self.user.username
        return f"{name} ({self.customer_type})"


class VendorProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vendor_profile',
    )
    business_name = models.CharField(max_length=255, db_index=True)
    business_category = models.CharField(
        max_length=30,
        choices=VendorCategory.choices,
        default=VendorCategory.OTHER,
        db_index=True,
    )
    description = models.TextField(blank=True, null=True)
    gst_number = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        db_index=True,
        validators=[validate_gst_number],
        help_text="15-character GSTIN",
    )
    pan_number = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        validators=[validate_pan_number],
    )
    website = models.URLField(blank=True, null=True)

    # Business Location & Coverage
    business_address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, db_index=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, default='India')

    # Operational & Verification
    is_verified_vendor = models.BooleanField(default=False, db_index=True)
    years_in_business = models.PositiveIntegerField(default=0)
    service_radius_km = models.PositiveIntegerField(default=50, help_text="Operating radius in kilometers")

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Vendor Profile'
        verbose_name_plural = 'Vendor Profiles'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['business_category', 'city']),
            models.Index(fields=['is_verified_vendor', 'business_category']),
        ]

    def __str__(self) -> str:
        return f"{self.business_name} ({self.business_category})"


class AuditAction(models.TextChoices):
    LOGIN_SUCCESS = 'LOGIN_SUCCESS', 'Login Success'
    LOGIN_FAILED = 'LOGIN_FAILED', 'Login Failed'
    LOGOUT = 'LOGOUT', 'Logout'
    REGISTER = 'REGISTER', 'Register'
    EMAIL_VERIFICATION_SENT = 'EMAIL_VERIFICATION_SENT', 'Email Verification Sent'
    EMAIL_VERIFIED = 'EMAIL_VERIFIED', 'Email Verified'
    PASSWORD_CHANGE = 'PASSWORD_CHANGE', 'Password Change'
    PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST', 'Password Reset Request'
    PASSWORD_RESET_CONFIRM = 'PASSWORD_RESET_CONFIRM', 'Password Reset Confirm'
    PROFILE_UPDATE = 'PROFILE_UPDATE', 'Profile Update'
    TOKEN_REFRESH = 'TOKEN_REFRESH', 'Token Refresh'


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        db_index=True,
    )
    action = models.CharField(
        max_length=50,
        choices=AuditAction.choices,
        db_index=True,
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, default='')
    correlation_id = models.CharField(max_length=64, blank=True, default='', db_index=True)
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['actor', 'timestamp']),
        ]

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self._state.adding:
            raise PermissionError("Audit log records are immutable and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args: Any, **kwargs: Any) -> tuple[int, dict[str, int]]:
        raise PermissionError("Audit log records are immutable and cannot be deleted.")

    def __str__(self) -> str:
        actor_name = self.actor.username if self.actor else "Anonymous"
        return f"[{self.timestamp}] {actor_name} - {self.action}"
