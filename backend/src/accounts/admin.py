from typing import Any
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.http import HttpRequest

from accounts.models import AuditLog, CustomerProfile, VendorInquiry, VendorProfile

User = get_user_model()


class CustomerProfileInline(admin.StackedInline):
    model = CustomerProfile
    can_delete = False
    extra = 0
    classes = ("collapse",)


class VendorProfileInline(admin.StackedInline):
    model = VendorProfile
    can_delete = False
    extra = 0
    classes = ("collapse",)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "username",
        "email",
        "user_type",
        "role",
        "is_verified",
        "is_staff",
        "is_active",
        "created_at",
    )
    list_filter = ("user_type", "role", "is_verified", "is_staff", "is_active")
    search_fields = ("username", "email", "phone_number")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [CustomerProfileInline, VendorProfileInline]

    fieldsets = (
        (
            "System Identifiers",
            {
                "fields": (
                    "id",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    ) + BaseUserAdmin.fieldsets + (
        (
            "Enterprise Classification & Verification",
            {
                "fields": (
                    "user_type",
                    "role",
                    "phone_number",
                    "is_verified",
                    "notes",
                )
            },
        ),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (
            "Enterprise Classification & Profile",
            {
                "fields": (
                    "email",
                    "user_type",
                    "role",
                    "phone_number",
                    "is_verified",
                )
            },
        ),
    )


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "customer_type",
        "company_name",
        "gst_number",
        "city",
        "created_at",
    )
    list_filter = ("customer_type", "city")
    search_fields = ("user__username", "user__email", "company_name", "gst_number", "city")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(VendorProfile)
class VendorProfileAdmin(admin.ModelAdmin):
    list_display = (
        "business_name",
        "business_category",
        "user",
        "city",
        "is_verified_vendor",
        "created_at",
    )
    list_filter = ("business_category", "is_verified_vendor", "city")
    search_fields = ("business_name", "user__username", "user__email", "gst_number", "city")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "timestamp",
        "actor",
        "action",
        "ip_address",
        "correlation_id",
    )
    list_filter = ("action", "timestamp")
    search_fields = (
        "actor__username",
        "actor__email",
        "ip_address",
        "correlation_id",
    )
    ordering = ("-timestamp",)

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False


@admin.register(VendorInquiry)
class VendorInquiryAdmin(admin.ModelAdmin):
    list_display = (
        "sender_name",
        "vendor",
        "project",
        "status",
        "event_date",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("sender_name", "sender_email", "sender_phone", "vendor__business_name", "message")
    readonly_fields = ("id", "created_at", "updated_at")

