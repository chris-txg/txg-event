from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
    AuditLogListView,
    ChangePasswordView,
    CurrentUserProfileView,
    CustomerProfileDetailView,
    LoginView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    ResendVerificationEmailView,
    VendorDirectoryListView,
    VendorInquiryDetailView,
    VendorInquiryListView,
    VendorInquiryCreateView,
    VendorProfileDetailView,
    VendorPublicDetailView,
    VerifyEmailView,
)

urlpatterns = [
    # Authentication Lifecycle
    path("api/auth/register/", RegisterView.as_view(), name="auth_register"),
    path("api/auth/verify-email/", VerifyEmailView.as_view(), name="auth_verify_email"),
    path("api/auth/resend-verification/", ResendVerificationEmailView.as_view(), name="auth_resend_verification"),
    path("api/auth/login/", LoginView.as_view(), name="auth_login"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/logout/", LogoutView.as_view(), name="auth_logout"),
    path("api/auth/me/", CurrentUserProfileView.as_view(), name="auth_me"),
    path("api/auth/me/customer-profile/", CustomerProfileDetailView.as_view(), name="auth_customer_profile"),
    path("api/auth/me/vendor-profile/", VendorProfileDetailView.as_view(), name="auth_vendor_profile"),
    path("api/auth/password/change/", ChangePasswordView.as_view(), name="auth_password_change"),
    path("api/auth/password/reset/", PasswordResetRequestView.as_view(), name="auth_password_reset"),
    path("api/auth/password/reset/confirm/", PasswordResetConfirmView.as_view(), name="auth_password_reset_confirm"),

    # Vendor Directory & Inquiries
    path("api/vendors/", VendorDirectoryListView.as_view(), name="vendor_directory"),
    path("api/vendors/<uuid:id>/", VendorPublicDetailView.as_view(), name="vendor_public_detail"),
    path("api/vendors/<uuid:id>/inquire/", VendorInquiryCreateView.as_view(), name="vendor_inquire"),
    path("api/vendors/inquiries/", VendorInquiryListView.as_view(), name="vendor_inquiries_list"),
    path("api/vendors/inquiries/<uuid:id>/", VendorInquiryDetailView.as_view(), name="vendor_inquiry_detail"),

    # Audit & Compliance
    path("api/auth/audit-logs/", AuditLogListView.as_view(), name="auth_audit_logs"),
]
