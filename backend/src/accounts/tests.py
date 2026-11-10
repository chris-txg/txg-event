import io
import os
import shutil
import tempfile
from PIL import Image
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import (
    AuditAction,
    AuditLog,
    CustomerProfile,
    CustomerType,
    RoleChoices,
    UserType,
    VendorCategory,
    VendorProfile,
)
from accounts.tasks import process_user_avatar_to_webp, send_verification_email
from accounts.tokens import email_verification_token
from core.utils.images import convert_image_to_webp, validate_image_file

User = get_user_model()


class AuthTests(APITestCase):
    def setUp(self) -> None:
        self.register_url = reverse("auth_register")
        self.login_url = reverse("auth_login")
        self.logout_url = reverse("auth_logout")
        self.me_url = reverse("auth_me")
        self.customer_profile_url = reverse("auth_customer_profile")
        self.vendor_profile_url = reverse("auth_vendor_profile")
        self.change_password_url = reverse("auth_password_change")
        self.reset_request_url = reverse("auth_password_reset")
        self.reset_confirm_url = reverse("auth_password_reset_confirm")
        self.verify_email_url = reverse("auth_verify_email")
        self.resend_verification_url = reverse("auth_resend_verification")
        self.audit_logs_url = reverse("auth_audit_logs")

        self.user_data = {
            "username": "johndoe",
            "email": "john@example.com",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
            "first_name": "John",
            "last_name": "Doe",
            "user_type": UserType.CUSTOMER,
        }

        self.temp_media_dir = tempfile.mkdtemp()
        self._media_override = override_settings(MEDIA_ROOT=self.temp_media_dir)
        self._media_override.enable()

    def tearDown(self) -> None:
        self._media_override.disable()
        if os.path.exists(self.temp_media_dir):
            shutil.rmtree(self.temp_media_dir, ignore_errors=True)

    def _create_test_image(self, filename: str = "test.png", format: str = "PNG", size: tuple[int, int] = (500, 500), color: str = "blue") -> SimpleUploadedFile:
        file_obj = io.BytesIO()
        image = Image.new("RGB", size, color=color)
        image.save(file_obj, format=format)
        file_obj.seek(0)
        return SimpleUploadedFile(name=filename, content=file_obj.read(), content_type=f"image/{format.lower()}")

    def test_register_b2c_customer_success(self) -> None:
        payload = self.user_data.copy()
        payload["customer_profile"] = {
            "customer_type": CustomerType.B2C,
            "city": "Bengaluru",
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("tokens", response.data)
        self.assertTrue(User.objects.filter(email="john@example.com").exists())

        # CustomerProfile created
        user = User.objects.get(email="john@example.com")
        self.assertEqual(user.user_type, UserType.CUSTOMER)
        self.assertTrue(CustomerProfile.objects.filter(user=user, customer_type=CustomerType.B2C).exists())

    def test_register_b2b_customer_success(self) -> None:
        payload = {
            "username": "corpacct",
            "email": "corp@example.com",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
            "first_name": "Alice",
            "last_name": "Corp",
            "user_type": UserType.CUSTOMER,
            "customer_profile": {
                "customer_type": CustomerType.B2B,
                "company_name": "Acme Event Solutions Pvt Ltd",
                "gst_number": "29ABCDE1234F1Z5",
                "pan_number": "ABCDE1234F",
                "city": "Bengaluru",
            },
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(email="corp@example.com")
        profile = CustomerProfile.objects.get(user=user)
        self.assertEqual(profile.customer_type, CustomerType.B2B)
        self.assertEqual(profile.gst_number, "29ABCDE1234F1Z5")
        self.assertEqual(profile.company_name, "Acme Event Solutions Pvt Ltd")

    def test_register_b2b_missing_or_invalid_gst(self) -> None:
        # Missing GST
        payload_missing_gst = {
            "username": "corpfail",
            "email": "corpfail@example.com",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
            "user_type": UserType.CUSTOMER,
            "customer_profile": {
                "customer_type": CustomerType.B2B,
                "company_name": "Acme Corp",
            },
        }
        res = self.client.post(self.register_url, payload_missing_gst, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Invalid GST format
        payload_invalid_gst = payload_missing_gst.copy()
        payload_invalid_gst["customer_profile"] = {
            "customer_type": CustomerType.B2B,
            "company_name": "Acme Corp",
            "gst_number": "INVALID_GST",
        }
        res_invalid = self.client.post(self.register_url, payload_invalid_gst, format="json")
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_vendor_success(self) -> None:
        payload = {
            "username": "soundvendor",
            "email": "sound@example.com",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
            "user_type": UserType.VENDOR,
            "vendor_profile": {
                "business_name": "Elite Pro Audio & Lighting",
                "business_category": VendorCategory.AUDIO_VISUAL,
                "city": "Bengaluru",
                "gst_number": "29ABCDE1234F1Z5",
                "years_in_business": 8,
            },
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(email="sound@example.com")
        self.assertEqual(user.user_type, UserType.VENDOR)
        self.assertTrue(VendorProfile.objects.filter(user=user, business_name="Elite Pro Audio & Lighting").exists())

    def test_register_duplicate_email(self) -> None:
        self.client.post(self.register_url, self.user_data, format="json")
        dup_data = self.user_data.copy()
        dup_data["username"] = "john2"
        response = self.client.post(self.register_url, dup_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_username_and_email(self) -> None:
        self.client.post(self.register_url, self.user_data, format="json")

        # Login with username
        login_res_username = self.client.post(
            self.login_url,
            {"identifier": "johndoe", "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(login_res_username.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_res_username.data["tokens"])

        # Login with email
        login_res_email = self.client.post(
            self.login_url,
            {"identifier": "john@example.com", "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(login_res_email.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_res_email.data["tokens"])

    def test_login_invalid_credentials(self) -> None:
        response = self.client.post(
            self.login_url,
            {"identifier": "nonexistent@example.com", "password": "wrongpassword"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(AuditLog.objects.filter(action=AuditAction.LOGIN_FAILED).exists())

    def test_logout_and_token_blacklist(self) -> None:
        reg_response = self.client.post(self.register_url, self.user_data, format="json")
        access_token = reg_response.data["tokens"]["access"]
        refresh_token = reg_response.data["tokens"]["refresh"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logout_response = self.client.post(
            self.logout_url,
            {"refresh": refresh_token},
            format="json",
        )
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

        # Attempt to refresh using the blacklisted refresh token
        refresh_url = reverse("token_refresh")
        refresh_response = self.client.post(refresh_url, {"refresh": refresh_token}, format="json")
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_current_user_profile(self) -> None:
        reg_response = self.client.post(self.register_url, self.user_data, format="json")
        access_token = reg_response.data["tokens"]["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        profile_res = self.client.get(self.me_url)
        self.assertEqual(profile_res.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_res.data["email"], "john@example.com")
        self.assertEqual(profile_res.data["user_type"], UserType.CUSTOMER)

        # Update profile
        update_res = self.client.patch(self.me_url, {"phone_number": "+1234567890"}, format="json")
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res.data["phone_number"], "+1234567890")

    def test_customer_profile_retrieve_and_update(self) -> None:
        reg_response = self.client.post(self.register_url, self.user_data, format="json")
        access_token = reg_response.data["tokens"]["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        cust_res = self.client.get(self.customer_profile_url)
        self.assertEqual(cust_res.status_code, status.HTTP_200_OK)

        # Upgrade customer to B2B
        upgrade_res = self.client.patch(
            self.customer_profile_url,
            {
                "customer_type": CustomerType.B2B,
                "company_name": "Mega Events Ltd",
                "gst_number": "29ABCDE1234F1Z5",
                "city": "Mumbai",
            },
            format="json",
        )
        self.assertEqual(upgrade_res.status_code, status.HTTP_200_OK)
        self.assertEqual(upgrade_res.data["customer_type"], CustomerType.B2B)
        self.assertEqual(upgrade_res.data["gst_number"], "29ABCDE1234F1Z5")

    def test_change_password(self) -> None:
        reg_response = self.client.post(self.register_url, self.user_data, format="json")
        access_token = reg_response.data["tokens"]["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        change_res = self.client.post(
            self.change_password_url,
            {
                "old_password": "StrongPassword123!",
                "new_password": "NewStrongPassword456!",
                "new_password_confirm": "NewStrongPassword456!",
            },
            format="json",
        )
        self.assertEqual(change_res.status_code, status.HTTP_200_OK)

        # Verify old password no longer works
        old_login = self.client.post(
            self.login_url,
            {"identifier": "johndoe", "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(old_login.status_code, status.HTTP_400_BAD_REQUEST)

        # Verify new password works
        new_login = self.client.post(
            self.login_url,
            {"identifier": "johndoe", "password": "NewStrongPassword456!"},
            format="json",
        )
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)

    def test_password_reset_flow(self) -> None:
        self.client.post(self.register_url, self.user_data, format="json")
        user = User.objects.get(email="john@example.com")

        # Request reset
        req_res = self.client.post(self.reset_request_url, {"email": "john@example.com"}, format="json")
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)

        # Generate token for user
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Confirm reset
        confirm_res = self.client.post(
            self.reset_confirm_url,
            {
                "uid": uid,
                "token": token,
                "new_password": "ResetPassword789!",
                "new_password_confirm": "ResetPassword789!",
            },
            format="json",
        )
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        # Test login with new password
        login_res = self.client.post(
            self.login_url,
            {"identifier": "john@example.com", "password": "ResetPassword789!"},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)

    def test_audit_log_immutability(self) -> None:
        log = AuditLog.objects.create(action=AuditAction.REGISTER, details={"test": "ok"})

        # Updating must raise PermissionError
        with self.assertRaises(PermissionError):
            log.action = AuditAction.LOGIN_SUCCESS
            log.save()

        # Deleting must raise PermissionError
        with self.assertRaises(PermissionError):
            log.delete()

    def test_email_verification_flow(self) -> None:
        self.client.post(self.register_url, self.user_data, format="json")
        user = User.objects.get(email="john@example.com")
        self.assertFalse(user.is_verified)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)

        # Verify via POST
        res = self.client.post(self.verify_email_url, {"uid": uid, "token": token}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertTrue(user.is_verified)

        # Audit log recorded
        self.assertTrue(AuditLog.objects.filter(actor=user, action=AuditAction.EMAIL_VERIFIED).exists())

        # Once verified, old token cannot be reused (stateless token changes when is_verified=True)
        res_repeat = self.client.post(self.verify_email_url, {"uid": uid, "token": token}, format="json")
        self.assertEqual(res_repeat.status_code, status.HTTP_400_BAD_REQUEST)

    def test_email_verification_invalid_token(self) -> None:
        self.client.post(self.register_url, self.user_data, format="json")
        user = User.objects.get(email="john@example.com")
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        res = self.client.post(self.verify_email_url, {"uid": uid, "token": "invalid-token-123"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertFalse(user.is_verified)

    def test_email_verification_via_get_link(self) -> None:
        self.client.post(self.register_url, self.user_data, format="json")
        user = User.objects.get(email="john@example.com")
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)

        # GET request simulating email client link click
        res = self.client.get(f"{self.verify_email_url}?uid={uid}&token={token}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_verified)

    def test_resend_verification_email(self) -> None:
        self.client.post(self.register_url, self.user_data, format="json")
        res = self.client.post(self.resend_verification_url, {"email": "john@example.com"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("message", res.data)

    def test_send_verification_email_celery_task(self) -> None:
        user = User.objects.create_user(
            username="celerytest",
            email="celery@example.com",
            password="StrongPassword123!",
        )
        mail.outbox = []
        result = send_verification_email(str(user.id))
        self.assertTrue(result)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Verify your email address", mail.outbox[0].subject)
        self.assertIn(user.email, mail.outbox[0].to)

    def test_avatar_registration_and_celery_task(self) -> None:
        image_file = self._create_test_image(filename="avatar.png", format="PNG", size=(1200, 1200))
        payload = self.user_data.copy()
        payload["avatar"] = image_file

        response = self.client.post(self.register_url, payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("avatar", response.data["user"])
        self.assertIsNotNone(response.data["user"]["avatar"])

        user = User.objects.get(email="john@example.com")
        self.assertTrue(bool(user.avatar))
        # Initially saved with temporary path
        self.assertTrue(user.avatar.name.startswith("avatars/temp/"))
        temp_file_path = user.avatar.path
        self.assertTrue(os.path.exists(temp_file_path))

        # Run Celery task for WebP conversion
        result = process_user_avatar_to_webp(str(user.id))
        self.assertTrue(result)

        user.refresh_from_db()
        self.assertTrue(user.avatar.name.endswith(".webp"))
        self.assertTrue(user.avatar.name.startswith(f"avatars/{user.id}/"))
        self.assertTrue(os.path.exists(user.avatar.path))

        # Temp file was cleaned up
        self.assertFalse(os.path.exists(temp_file_path))

        # Verify image format and downscaled dimensions (max 800x800)
        with Image.open(user.avatar.path) as img:
            self.assertEqual(img.format, "WEBP")
            self.assertLessEqual(img.width, 800)
            self.assertLessEqual(img.height, 800)

        # Idempotency check: running again returns True and doesn't re-process
        repeat_result = process_user_avatar_to_webp(str(user.id))
        self.assertTrue(repeat_result)

    def test_avatar_profile_patch_update(self) -> None:
        reg_response = self.client.post(self.register_url, self.user_data, format="json")
        access_token = reg_response.data["tokens"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Upload avatar via PATCH /api/auth/me/
        new_avatar = self._create_test_image(filename="profile.jpg", format="JPEG", size=(600, 600))
        patch_res = self.client.patch(self.me_url, {"avatar": new_avatar}, format="multipart")
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)

        user = User.objects.get(email="john@example.com")
        self.assertTrue(user.avatar.name.startswith("avatars/temp/"))

        # Trigger conversion task
        process_user_avatar_to_webp(str(user.id))
        user.refresh_from_db()
        self.assertTrue(user.avatar.name.endswith(".webp"))
        first_webp_path = user.avatar.path
        self.assertTrue(os.path.exists(first_webp_path))

        # Replace avatar with a second image
        second_avatar = self._create_test_image(filename="second.png", format="PNG", size=(400, 400))
        patch_res2 = self.client.patch(self.me_url, {"avatar": second_avatar}, format="multipart")
        self.assertEqual(patch_res2.status_code, status.HTTP_200_OK)

        # Old webp was removed
        self.assertFalse(os.path.exists(first_webp_path))

    def test_avatar_invalid_file_rejected(self) -> None:
        # 1. Plain text file disguised with .txt extension
        fake_file = SimpleUploadedFile("script.txt", b"plain text content", content_type="text/plain")
        payload = self.user_data.copy()
        payload["avatar"] = fake_file
        res = self.client.post(self.register_url, payload, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("avatar", res.data)

        # 2. Corrupt file disguised with .png extension
        fake_png = SimpleUploadedFile("fake.png", b"not a real image binary stream", content_type="image/png")
        payload["avatar"] = fake_png
        res2 = self.client.post(self.register_url, payload, format="multipart")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("avatar", res2.data)

