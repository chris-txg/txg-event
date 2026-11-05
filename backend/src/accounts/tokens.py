from typing import Any
from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """
    Generates single-use, cryptographically secure tokens for email verification.
    Includes user.is_verified and user.email in the hash so the token is immediately
    invalidated once verified or if the user's email address changes.
    """

    def _make_hash_value(self, user: Any, timestamp: int) -> str:
        return f"{user.pk}{user.is_verified}{user.email}{timestamp}"


email_verification_token = EmailVerificationTokenGenerator()

