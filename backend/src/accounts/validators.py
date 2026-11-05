import re
from django.core.exceptions import ValidationError

GST_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")


def validate_gst_number(value: str) -> str:
    """Validates 15-character Indian GSTIN format."""
    if not value:
        return value
    cleaned = value.upper().strip()
    if not GST_REGEX.match(cleaned):
        raise ValidationError("Invalid GST Number format. Must be a 15-character valid GSTIN (e.g. 27ABCDE1234F1Z5).")
    return cleaned


def validate_pan_number(value: str) -> str:
    """Validates 10-character Indian PAN format."""
    if not value:
        return value
    cleaned = value.upper().strip()
    if not PAN_REGEX.match(cleaned):
        raise ValidationError("Invalid PAN Number format. Must be 10 characters (e.g. ABCDE1234F).")
    return cleaned

