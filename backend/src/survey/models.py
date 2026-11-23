import uuid
from typing import Any
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class SurveyPricingOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, help_text="Plan display name, e.g. Free Tier, Standard, Pro")
    code = models.SlugField(max_length=50, unique=True, help_text="Unique slug identifier, e.g. 'free', 'standard', 'pro'")
    description = models.TextField(blank=True, help_text="Plan features and marketing highlights")
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text="Price in INR (0.00 for free)",
    )
    currency = models.CharField(max_length=10, default="INR")
    is_free = models.BooleanField(
        default=False,
        db_index=True,
        help_text="If True, bypasses Razorpay checkout",
    )
    free_limit_per_user = models.PositiveIntegerField(
        default=1,
        help_text="Maximum times a single user can publish with this free plan",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Controls whether this pricing option is visible and available for selection",
    )
    display_order = models.PositiveIntegerField(default=0, help_text="Ordering in frontend UI")
    features = models.JSONField(
        default=list,
        blank=True,
        help_text="List of feature bullet points for frontend display",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "price", "-created_at"]
        indexes = [
            models.Index(fields=["is_active", "is_free"]),
            models.Index(fields=["code"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.code}) - {self.currency} {self.price} ({'Active' if self.is_active else 'Inactive'})"


class Coupon(models.Model):
    class DiscountType(models.TextChoices):
        PERCENTAGE = "percentage", "Percentage (%)"
        FLAT = "flat", "Flat Amount (INR)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.CharField(max_length=255, blank=True)
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.PERCENTAGE,
        db_index=True,
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Percentage (e.g. 50.00 for 50%) or Flat Amount in INR (e.g. 200.00)",
    )
    max_uses = models.PositiveIntegerField(
        default=100,
        help_text="Total number of times this coupon can be redeemed platform-wide.",
    )
    max_uses_per_user = models.PositiveIntegerField(
        default=1,
        help_text="Max times a single user can redeem this coupon.",
    )
    valid_from = models.DateTimeField(null=True, blank=True, db_index=True)
    valid_until = models.DateTimeField(null=True, blank=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    applicable_plans = models.ManyToManyField(
        SurveyPricingOption,
        blank=True,
        related_name="coupons",
        help_text="Applicable pricing plans. If none selected, applies to all paid plans.",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["code", "is_active"]),
            models.Index(fields=["is_active", "valid_until"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} ({self.get_discount_type_display()}: {self.discount_value})"

    def clean(self) -> None:
        from decimal import Decimal
        if self.discount_type == self.DiscountType.PERCENTAGE and self.discount_value > Decimal("100.00"):
            raise ValidationError({"discount_value": "Percentage discount cannot exceed 100%."})
        if self.discount_value <= Decimal("0.00"):
            raise ValidationError({"discount_value": "Discount value must be greater than zero."})
        if self.valid_from and self.valid_until and self.valid_from > self.valid_until:
            raise ValidationError({"valid_until": "Valid until date cannot be earlier than valid from date."})

    def is_currently_valid(self) -> bool:
        if not self.is_active:
            return False
        now = timezone.now()
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        return True


class Survey(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        CLOSED = "closed", "Closed"

    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public (Anyone can see)"
        PRIVATE = "private", "Private (Requires authentication or invite)"

    class DuplicateRule(models.TextChoices):
        ALLOW_MULTIPLE = "allow_multiple", "Allow Multiple Submissions"
        ONE_PER_USER = "one_per_user", "One Submission Per User"
        ONE_PER_IP = "one_per_ip", "One Submission Per IP Address"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "projects.EventProject",
        on_delete=models.CASCADE,
        related_name="surveys",
        db_index=True,
        null=True,
        blank=False,
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_surveys",
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    visibility = models.CharField(
        max_length=20,
        choices=Visibility.choices,
        default=Visibility.PUBLIC,
        db_index=True,
    )
    allow_anonymous = models.BooleanField(
        default=True,
        help_text="If true, unauthenticated respondents can submit answers.",
    )
    duplicate_rule = models.CharField(
        max_length=20,
        choices=DuplicateRule.choices,
        default=DuplicateRule.ONE_PER_USER,
    )
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    is_paid = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Indicates whether the required publishing fee has been paid.",
    )
    pricing_option = models.ForeignKey(
        SurveyPricingOption,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="surveys",
        db_index=True,
        help_text="Pricing tier chosen when published.",
    )
    applied_coupon = models.ForeignKey(
        Coupon,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="surveys",
        db_index=True,
        help_text="Coupon code applied for publishing.",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "visibility"]),
            models.Index(fields=["created_by", "status"]),
            models.Index(fields=["project", "status"]),
            models.Index(fields=["created_by", "is_paid"]),
            models.Index(fields=["pricing_option", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.get_status_display()})"

    def clean(self) -> None:
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError({"end_date": "End date cannot be earlier than start date."})

    @property
    def is_active(self) -> bool:
        """
        Determines whether the survey is currently open for submissions.
        Considers manual status and optional scheduling time-window.
        """
        if self.status != self.Status.PUBLISHED:
            return False
        now = timezone.now()
        if self.start_date and now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        return True

    @property
    def response_count(self) -> int:
        return self.responses.count()

    def can_edit_structure(self) -> bool:
        """
        Returns False if survey is closed or already has submitted responses to preserve data integrity.
        """
        if self.status == self.Status.CLOSED:
            return False
        return not self.responses.exists()


class Question(models.Model):
    class QuestionType(models.TextChoices):
        TEXT = "text", "Text"
        NUMBER = "number", "Number"
        SINGLE = "single", "Single Choice"
        MULTIPLE = "multiple", "Multiple Choice"
        BOOLEAN = "boolean", "Yes/No"
        DATE = "date", "Date"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    survey = models.ForeignKey(
        Survey,
        on_delete=models.CASCADE,
        related_name="questions",
        db_index=True,
    )
    text = models.TextField()
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.TEXT,
    )
    is_required = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "created_at"]
        indexes = [
            models.Index(fields=["survey", "order"]),
        ]

    def __str__(self) -> str:
        return f"Q: {self.text[:50]} ({self.question_type})"


class QuestionChoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="choices",
        db_index=True,
    )
    text = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        indexes = [
            models.Index(fields=["question", "order"]),
        ]

    def __str__(self) -> str:
        return self.text


class SurveyResponse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    survey = models.ForeignKey(
        Survey,
        on_delete=models.CASCADE,
        related_name="responses",
        db_index=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="survey_responses",
        db_index=True,
    )
    respondent_ip = models.GenericIPAddressField(null=True, blank=True)
    respondent_session = models.CharField(max_length=255, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-submitted_at"]
        indexes = [
            models.Index(fields=["survey", "submitted_at"]),
            models.Index(fields=["user", "submitted_at"]),
            models.Index(fields=["survey", "respondent_ip"]),
        ]

    def __str__(self) -> str:
        user_label = self.user.username if self.user else f"Anonymous ({self.respondent_ip or 'unknown'})"
        return f"Response to '{self.survey.title}' by {user_label} at {self.submitted_at}"


class Answer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    response = models.ForeignKey(
        SurveyResponse,
        on_delete=models.CASCADE,
        related_name="answers",
        db_index=True,
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="answers",
        db_index=True,
    )
    value = models.JSONField(
        help_text="Validated answer payload (text, number, bool, choice string/uuid, or list of choices)"
    )

    class Meta:
        unique_together = [("response", "question")]
        indexes = [
            models.Index(fields=["question"]),
        ]

    def __str__(self) -> str:
        return f"Answer for Q: {self.question_id} in Response: {self.response_id}"


class SurveyPayment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    survey = models.ForeignKey(
        Survey,
        on_delete=models.CASCADE,
        related_name="payments",
        db_index=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="survey_payments",
        db_index=True,
    )
    pricing_option = models.ForeignKey(
        SurveyPricingOption,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
        db_index=True,
        help_text="Pricing tier associated with this payment.",
    )
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
        db_index=True,
        help_text="Coupon code used for this payment, if any.",
    )
    razorpay_order_id = models.CharField(max_length=100, unique=True, db_index=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Amount in INR")
    currency = models.CharField(max_length=10, default="INR")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    error_code = models.CharField(max_length=100, blank=True, null=True)
    error_description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["survey", "status"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["razorpay_order_id"]),
        ]

    def __str__(self) -> str:
        return f"Payment {self.id} for Survey '{self.survey_id}' - {self.status}"


class CouponUsage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.PROTECT,
        related_name="usages",
        db_index=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="coupon_usages",
        db_index=True,
    )
    survey = models.ForeignKey(
        Survey,
        on_delete=models.CASCADE,
        related_name="coupon_usages",
        db_index=True,
    )
    original_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2)
    used_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-used_at"]
        indexes = [
            models.Index(fields=["coupon", "user"]),
            models.Index(fields=["user", "used_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.coupon.code} used by {self.user.username} on Survey '{self.survey.title}' (-INR {self.discount_amount})"


