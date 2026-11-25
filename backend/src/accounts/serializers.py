import os
from typing import Any, Optional
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import (
    AuditLog,
    CustomerProfile,
    CustomerType,
    RoleChoices,
    UserType,
    VendorCategory,
    VendorProfile,
)
from accounts.services import AuthService
from accounts.validators import validate_gst_number, validate_pan_number
from core.utils.images import validate_image_file

User = get_user_model()


class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "customer_type",
            "company_name",
            "gst_number",
            "pan_number",
            "industry_type",
            "designation",
            "billing_address",
            "city",
            "state",
            "postal_code",
            "country",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_gst_number(self, value: Optional[str]) -> Optional[str]:
        if value:
            return validate_gst_number(value)
        return value

    def validate_pan_number(self, value: Optional[str]) -> Optional[str]:
        if value:
            return validate_pan_number(value)
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        customer_type = attrs.get("customer_type", getattr(self.instance, "customer_type", CustomerType.B2C))
        gst_number = attrs.get("gst_number", getattr(self.instance, "gst_number", None))
        company_name = attrs.get("company_name", getattr(self.instance, "company_name", None))

        if customer_type == CustomerType.B2B:
            if not gst_number:
                raise serializers.ValidationError({"gst_number": "GST Number is mandatory for B2B corporate customers."})
            if not company_name:
                raise serializers.ValidationError({"company_name": "Company Name is mandatory for B2B corporate customers."})
        return attrs


class VendorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorProfile
        fields = [
            "id",
            "business_name",
            "business_category",
            "description",
            "gst_number",
            "pan_number",
            "website",
            "business_address",
            "city",
            "state",
            "postal_code",
            "country",
            "is_verified_vendor",
            "years_in_business",
            "service_radius_km",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_verified_vendor", "created_at", "updated_at"]

    def validate_gst_number(self, value: Optional[str]) -> Optional[str]:
        if value:
            return validate_gst_number(value)
        return value

    def validate_pan_number(self, value: Optional[str]) -> Optional[str]:
        if value:
            return validate_pan_number(value)
        return value


class UserSummarySerializer(serializers.ModelSerializer):
    """Lean serializer for authentication responses."""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "user_type",
            "role",
            "avatar",
            "is_verified",
            "password_updated",
        ]
        read_only_fields = fields


class UserProfileSerializer(serializers.ModelSerializer):
    """Detailed serializer for current user profile view and updates."""
    customer_profile = CustomerProfileSerializer(read_only=True)
    vendor_profile = VendorProfileSerializer(read_only=True)
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "user_type",
            "role",
            "avatar",
            "phone_number",
            "is_verified",
            "password_updated",
            "notes",
            "customer_profile",
            "vendor_profile",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "username", "email", "user_type", "role", "is_verified", "password_updated", "created_at", "updated_at"]

    def validate_avatar(self, value: Any) -> Any:
        if value:
            try:
                validate_image_file(value)
            except DjangoValidationError as exc:
                raise serializers.ValidationError(exc.messages if hasattr(exc, "messages") else str(exc))
        return value

    def update(self, instance: Any, validated_data: dict[str, Any]) -> Any:
        avatar_uploaded = "avatar" in validated_data
        new_avatar = validated_data.get("avatar")
        old_avatar_path = None
        if avatar_uploaded and instance.avatar:
            try:
                old_avatar_path = instance.avatar.path
            except (ValueError, OSError):
                old_avatar_path = None

        with transaction.atomic():
            user = super().update(instance, validated_data)
            if avatar_uploaded:
                if old_avatar_path and os.path.exists(old_avatar_path):
                    try:
                        new_path = getattr(user.avatar, "path", None)
                        if new_path != old_avatar_path:
                            os.remove(old_avatar_path)
                    except OSError:
                        pass

                if new_avatar:
                    from accounts.tasks import process_user_avatar_to_webp
                    user_id = str(user.id)
                    transaction.on_commit(lambda: process_user_avatar_to_webp.delay(user_id))

        return user


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})
    customer_profile = CustomerProfileSerializer(required=False)
    vendor_profile = VendorProfileSerializer(required=False)
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "user_type",
            "avatar",
            "phone_number",
            "customer_profile",
            "vendor_profile",
        ]

    def validate_avatar(self, value: Any) -> Any:
        if value:
            try:
                validate_image_file(value)
            except DjangoValidationError as exc:
                raise serializers.ValidationError(exc.messages if hasattr(exc, "messages") else str(exc))
        return value

    def validate_email(self, value: str) -> str:
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        # Run Django's configured password validators
        user_instance = User(username=attrs.get("username"), email=attrs.get("email"))
        validate_password(attrs["password"], user=user_instance)

        user_type = attrs.get("user_type", UserType.CUSTOMER)
        customer_data = attrs.get("customer_profile")
        vendor_data = attrs.get("vendor_profile")

        if user_type == UserType.CUSTOMER:
            if customer_data:
                cust_type = customer_data.get("customer_type", CustomerType.B2C)
                if cust_type == CustomerType.B2B:
                    if not customer_data.get("gst_number"):
                        raise serializers.ValidationError(
                            {"customer_profile": {"gst_number": "GST Number is required for B2B corporate customers."}}
                        )
                    if not customer_data.get("company_name"):
                        raise serializers.ValidationError(
                            {"customer_profile": {"company_name": "Company Name is required for B2B corporate customers."}}
                        )
                    validate_gst_number(customer_data["gst_number"])
        elif user_type == UserType.VENDOR:
            if not vendor_data:
                raise serializers.ValidationError(
                    {"vendor_profile": "Vendor profile details (business_name, city, category) are required for vendors."}
                )
            if not vendor_data.get("business_name"):
                raise serializers.ValidationError(
                    {"vendor_profile": {"business_name": "Business name is required for vendors."}}
                )

        return attrs

    def create(self, validated_data: dict[str, Any]) -> Any:
        request = self.context.get("request")
        return AuthService.register_user(validated_data, request=request)


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(
        required=True,
        help_text="Enter your username or email address.",
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        request = self.context.get("request")
        identifier = attrs["identifier"].strip()
        password = attrs["password"]

        user = AuthService.authenticate_by_credentials(identifier, password, request=request)
        if not user:
            raise serializers.ValidationError("Invalid credentials or account is deactivated.")

        refresh = RefreshToken.for_user(user)
        refresh["user_type"] = user.user_type
        refresh["role"] = user.role
        refresh["username"] = user.username

        return {
            "user": user,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=True, help_text="Refresh token to blacklist.")

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        refresh_token = attrs["refresh"]
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            raise serializers.ValidationError({"refresh": "Invalid, expired, or blacklisted token."})
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True, style={"input_type": "password"})
    new_password = serializers.CharField(required=True, write_only=True, style={"input_type": "password"})
    new_password_confirm = serializers.CharField(required=True, write_only=True, style={"input_type": "password"})

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "New passwords do not match."})
        if attrs["old_password"] == attrs["new_password"]:
            raise serializers.ValidationError({"new_password": "New password cannot be the same as old password."})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value: str) -> str:
        return value.lower().strip()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, write_only=True, style={"input_type": "password"})
    new_password_confirm = serializers.CharField(required=True, write_only=True, style={"input_type": "password"})

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "New passwords do not match."})
        return attrs


class VerifyEmailSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True, help_text="Base64 encoded User UUID.")
    token = serializers.CharField(required=True, help_text="Cryptographically secure email verification token.")


class ResendVerificationEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True, help_text="Registered email address to re-receive verification link.")

    def validate_email(self, value: str) -> str:
        return value.lower().strip()


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor_username",
            "action",
            "ip_address",
            "user_agent",
            "correlation_id",
            "details",
            "timestamp",
        ]
        read_only_fields = fields
