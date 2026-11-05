from typing import Any
from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import AuditAction, AuditLog, CustomerProfile, VendorProfile
from accounts.serializers import (
    AuditLogSerializer,
    ChangePasswordSerializer,
    CustomerProfileSerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    ResendVerificationEmailSerializer,
    UserProfileSerializer,
    UserSummarySerializer,
    VendorProfileSerializer,
    VerifyEmailSerializer,
)
from accounts.services import AuthService, record_audit_log


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Authentication"],
        summary="Register a new user account",
        request=RegisterSerializer,
        responses={
            status.HTTP_201_CREATED: OpenApiResponse(
                description="Account registered successfully. Returns user data and JWT tokens."
            ),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Validation error."),
        },
    )
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = RegisterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Automatically issue tokens upon successful registration
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["username"] = user.username

        return Response(
            {
                "message": "User registered successfully.",
                "user": UserSummarySerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Authentication"],
        summary="Authenticate and receive JWT tokens",
        request=LoginSerializer,
        responses={
            status.HTTP_200_OK: OpenApiResponse(description="Authentication successful."),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Invalid credentials."),
        },
    )
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        return Response(
            {
                "message": "Login successful.",
                "user": UserSummarySerializer(user).data,
                "tokens": {
                    "access": serializer.validated_data["access"],
                    "refresh": serializer.validated_data["refresh"],
                },
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Authentication"],
        summary="Logout and blacklist refresh token",
        request=LogoutSerializer,
        responses={
            status.HTTP_200_OK: OpenApiResponse(description="Logged out and token blacklisted."),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Invalid token."),
        },
    )
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        record_audit_log(
            action=AuditAction.LOGOUT,
            actor=request.user,
            request=request,
            details={"status": "success"},
        )

        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)


class CurrentUserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    @extend_schema(
        tags=["Accounts"],
        summary="Get current user profile",
    )
    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return super().get(request, *args, **kwargs)

    @extend_schema(
        tags=["Accounts"],
        summary="Update current user profile",
    )
    def patch(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return super().patch(request, *args, **kwargs)

    def get_object(self) -> Any:
        from django.contrib.auth import get_user_model
        return get_user_model().objects.select_related("customer_profile", "vendor_profile").get(pk=self.request.user.pk)

    def perform_update(self, serializer: UserProfileSerializer) -> None:
        user = serializer.save()
        record_audit_log(
            action=AuditAction.PROFILE_UPDATE,
            actor=user,
            request=self.request,
            details={"updated_fields": list(serializer.validated_data.keys())},
        )


class CustomerProfileDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CustomerProfileSerializer

    @extend_schema(
        tags=["Accounts"],
        summary="Retrieve or update customer profile (B2C / B2B corporate details)",
    )
    def get_object(self) -> Any:
        profile, _ = CustomerProfile.objects.get_or_create(user=self.request.user)
        return profile


class VendorProfileDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VendorProfileSerializer

    @extend_schema(
        tags=["Accounts"],
        summary="Retrieve or update vendor business profile",
    )
    def get_object(self) -> Any:
        profile, _ = VendorProfile.objects.get_or_create(user=self.request.user)
        return profile


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Authentication"],
        summary="Change user password",
        request=ChangePasswordSerializer,
        responses={
            status.HTTP_200_OK: OpenApiResponse(description="Password changed successfully."),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Invalid password details."),
        },
    )
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            AuthService.change_password(
                user=request.user,
                old_password=serializer.validated_data["old_password"],
                new_password=serializer.validated_data["new_password"],
                request=request,
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else list(exc.messages), status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Authentication"],
        summary="Request a password reset link",
        request=PasswordResetRequestSerializer,
        responses={
            status.HTTP_200_OK: OpenApiResponse(
                description="Generic confirmation response to avoid account enumeration."
            ),
        },
    )
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        AuthService.request_password_reset(
            email=serializer.validated_data["email"],
            request=request,
        )

        return Response(
            {"message": "If an account with this email exists, a password reset link has been dispatched."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Authentication"],
        summary="Confirm password reset with token",
        request=PasswordResetConfirmSerializer,
        responses={
            status.HTTP_200_OK: OpenApiResponse(description="Password reset successful."),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Invalid token or password requirements."),
        },
    )
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            AuthService.confirm_password_reset(
                uidb64=serializer.validated_data["uid"],
                token=serializer.validated_data["token"],
                new_password=serializer.validated_data["new_password"],
                request=request,
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else list(exc.messages), status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Password has been successfully reset. You can now login."}, status=status.HTTP_200_OK)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Authentication"],
        summary="Verify email address with token (POST)",
        request=VerifyEmailSerializer,
        responses={
            status.HTTP_200_OK: OpenApiResponse(description="Email verified successfully."),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Invalid or expired verification token."),
        },
    )
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            AuthService.verify_email(
                uidb64=serializer.validated_data["uid"],
                token=serializer.validated_data["token"],
                request=request,
            )
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, "message_dict") else list(exc.messages),
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"message": "Email address verified successfully. Your account is fully active."}, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["Authentication"],
        summary="Verify email address with token via link (GET)",
        responses={
            status.HTTP_200_OK: OpenApiResponse(description="Email verified successfully."),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Invalid or expired verification token."),
        },
    )
    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        uid = request.query_params.get("uid")
        token = request.query_params.get("token")

        if not uid or not token:
            return Response({"detail": "Missing uid or token query parameters."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            AuthService.verify_email(uidb64=uid, token=token, request=request)
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, "message_dict") else list(exc.messages),
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"message": "Email address verified successfully. Your account is fully active."}, status=status.HTTP_200_OK)


class ResendVerificationEmailView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Authentication"],
        summary="Resend email verification link",
        request=ResendVerificationEmailSerializer,
        responses={
            status.HTTP_200_OK: OpenApiResponse(description="Verification email dispatched if unverified."),
        },
    )
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = ResendVerificationEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        AuthService.resend_verification_email(
            email=serializer.validated_data["email"],
            request=request,
        )

        return Response(
            {"message": "If an unverified account with this email exists, a new verification link has been sent."},
            status=status.HTTP_200_OK,
        )


class AuditLogListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.none()

    @extend_schema(
        tags=["Audit & Compliance"],
        summary="List user audit logs (or all logs for staff)",
    )
    def get_queryset(self) -> Any:
        if getattr(self, "swagger_fake_view", False) or not self.request.user.is_authenticated:
            return AuditLog.objects.none()

        # Optimized lean query per GEMINI.md rules: select_related and only necessary fields
        qs = AuditLog.objects.select_related("actor")
        if not self.request.user.is_staff:
            qs = qs.filter(actor=self.request.user)
        return qs.only(
            "id",
            "action",
            "ip_address",
            "user_agent",
            "correlation_id",
            "details",
            "timestamp",
            "actor__id",
            "actor__username",
        )
