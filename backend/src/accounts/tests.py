from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
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
