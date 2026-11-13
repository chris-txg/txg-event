import uuid
from typing import Any
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


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
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "visibility"]),
            models.Index(fields=["created_by", "status"]),
            models.Index(fields=["project", "status"]),
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
        Returns False if survey already has submitted responses to preserve data integrity.
        """
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
