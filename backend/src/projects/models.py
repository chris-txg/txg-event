import os
import uuid
from typing import Any
from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.core.exceptions import ValidationError
from django.db import models


def project_document_upload_path(instance: Any, filename: str) -> str:
    """Stores supporting project documents under a project-scoped UUID path."""
    ext = os.path.splitext(filename)[1].lower()
    return f"projects/{instance.project_id}/documents/{uuid.uuid4().hex}{ext}"


class EventProject(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        CREATED = "created", "Created"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_projects",
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CREATED,
        db_index=True,
    )

    # A. Basic project information
    project_name = models.CharField(max_length=255, db_index=True)
    event_segment = models.CharField(max_length=120, blank=True, default="")
    event_category = models.CharField(max_length=120, blank=True, default="")
    event_subcategory = models.CharField(max_length=120, blank=True, default="")
    project_description = models.TextField(blank=True, default="")
    event_objective = models.TextField(blank=True, default="")
    organiser_name = models.CharField(max_length=150, blank=True, default="")
    designation = models.CharField(max_length=150, blank=True, default="")
    official_email = models.EmailField(blank=True, default="")
    contact_number = models.CharField(max_length=30, blank=True, default="")

    # B. Event location & Organiser location
    event_country = models.CharField(max_length=100, blank=True, default="")
    event_state = models.CharField(max_length=100, blank=True, default="")
    event_city = models.CharField(max_length=100, blank=True, default="", db_index=True)
    event_locality = models.CharField(max_length=150, blank=True, default="")
    organiser_country = models.CharField(max_length=100, blank=True, default="")
    organiser_region = models.CharField(max_length=100, blank=True, default="")

    # C. Proposed event details
    proposed_date = models.DateField(null=True, blank=True)
    duration = models.CharField(max_length=100, blank=True, default="")
    expected_attendance = models.CharField(max_length=100, blank=True, default="")
    event_format = models.CharField(max_length=100, blank=True, default="")
    target_audience = models.TextField(blank=True, default="")

    # D. Budget and services
    estimated_budget_range = models.CharField(max_length=120, blank=True, default="")
    currency = models.CharField(max_length=20, blank=True, default="")
    required_services = models.JSONField(default=list, blank=True)

    # E. Research requirements
    research_objective = models.TextField(blank=True, default="")
    research_start_date = models.DateField(null=True, blank=True)
    research_end_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Event Project"
        verbose_name_plural = "Event Projects"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "status", "-created_at"]),
            models.Index(fields=["status", "event_city"]),
            GinIndex(fields=["required_services"]),
        ]

    def __str__(self) -> str:
        return f"{self.project_name} ({self.get_status_display()})"

    def clean(self) -> None:
        if (
            self.research_start_date
            and self.research_end_date
            and self.research_start_date > self.research_end_date
        ):
            raise ValidationError(
                {"research_end_date": "Research end date cannot be earlier than research start date."}
            )


class EventProjectDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        EventProject,
        on_delete=models.CASCADE,
        related_name="documents",
        db_index=True,
    )
    file = models.FileField(upload_to=project_document_upload_path, max_length=255)
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveBigIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Event Project Document"
        verbose_name_plural = "Event Project Documents"
        ordering = ["-uploaded_at"]

    def __str__(self) -> str:
        return f"{self.original_filename} ({self.project_id})"

