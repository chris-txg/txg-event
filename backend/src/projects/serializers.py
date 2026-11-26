import json
import os
from typing import Any
from django.db import transaction
from rest_framework import serializers

from accounts.models import VendorProfile
from projects.models import EventProject, EventProjectDocument, EventVendor

MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
BLOCKED_DOCUMENT_EXTENSIONS = {
    ".exe",
    ".bat",
    ".cmd",
    ".sh",
    ".ps1",
    ".msi",
    ".dll",
    ".js",
    ".vbs",
    ".php",
}

REQUIRED_PROJECT_FIELDS = (
    "project_name",
    "event_segment",
    "event_category",
    "project_description",
    "event_objective",
    "organiser_name",
    "official_email",
    "event_country",
    "event_city",
    "event_format",
    "research_objective",
)


def validate_supporting_document(file_obj: Any) -> None:
    """Validates supporting document size and blocks dangerous executable extensions."""
    if file_obj.size > MAX_DOCUMENT_SIZE_BYTES:
        raise serializers.ValidationError("Supporting document size cannot exceed 10 MB.")
    ext = os.path.splitext(getattr(file_obj, "name", ""))[1].lower()
    if ext in BLOCKED_DOCUMENT_EXTENSIONS:
        raise serializers.ValidationError(f"File extension '{ext}' is not allowed for security reasons.")


class EventProjectDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventProjectDocument
        fields = [
            "id",
            "file",
            "original_filename",
            "file_size",
            "uploaded_at",
        ]
        read_only_fields = fields


class EventProjectListSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    survey_count = serializers.IntegerField(read_only=True)
    document_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = EventProject
        fields = [
            "id",
            "project_name",
            "status",
            "event_segment",
            "event_category",
            "event_subcategory",
            "event_country",
            "event_city",
            "event_format",
            "proposed_date",
            "currency",
            "estimated_budget_range",
            "required_services",
            "owner_username",
            "survey_count",
            "document_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class EventProjectDetailSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    documents = EventProjectDocumentSerializer(many=True, read_only=True)
    survey_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = EventProject
        fields = [
            "id",
            "status",
            "owner_username",
            # A. Basic project information
            "project_name",
            "event_segment",
            "event_category",
            "event_subcategory",
            "project_description",
            "event_objective",
            "organiser_name",
            "designation",
            "official_email",
            "contact_number",
            # B. Event & Organiser location
            "event_country",
            "event_state",
            "event_city",
            "event_locality",
            "organiser_country",
            "organiser_region",
            # C. Proposed event details
            "proposed_date",
            "duration",
            "expected_attendance",
            "event_format",
            "target_audience",
            # D. Budget and services
            "estimated_budget_range",
            "currency",
            "required_services",
            # E. Research requirements
            "research_objective",
            "research_start_date",
            "research_end_date",
            "documents",
            "survey_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class EventProjectCreateUpdateSerializer(serializers.ModelSerializer):
    supporting_documents = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True,
        help_text="Optional list of supporting document files (max 10 MB each).",
    )
    required_services = serializers.JSONField(required=False, default=list)

    class Meta:
        model = EventProject
        fields = [
            "id",
            "status",
            # A. Basic project information
            "project_name",
            "event_segment",
            "event_category",
            "event_subcategory",
            "project_description",
            "event_objective",
            "organiser_name",
            "designation",
            "official_email",
            "contact_number",
            # B. Event & Organiser location
            "event_country",
            "event_state",
            "event_city",
            "event_locality",
            "organiser_country",
            "organiser_region",
            # C. Proposed event details
            "proposed_date",
            "duration",
            "expected_attendance",
            "event_format",
            "target_audience",
            # D. Budget and services
            "estimated_budget_range",
            "currency",
            "required_services",
            # E. Research requirements
            "research_objective",
            "research_start_date",
            "research_end_date",
            "supporting_documents",
        ]
        read_only_fields = ["id"]

    def validate_required_services(self, value: Any) -> list[str]:
        if value is None or value == "":
            return []
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except json.JSONDecodeError:
                return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        raise serializers.ValidationError("required_services must be a list of service names.")

    def validate_supporting_documents(self, files: list[Any]) -> list[Any]:
        for file_obj in files:
            validate_supporting_document(file_obj)
        return files

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        research_start = attrs.get("research_start_date", getattr(self.instance, "research_start_date", None))
        research_end = attrs.get("research_end_date", getattr(self.instance, "research_end_date", None))
        if research_start and research_end and research_start > research_end:
            raise serializers.ValidationError(
                {"research_end_date": "Research end date cannot be earlier than research start date."}
            )

        target_status = attrs.get(
            "status",
            getattr(self.instance, "status", EventProject.Status.CREATED),
        )
        if target_status == EventProject.Status.CREATED:
            missing: dict[str, str] = {}
            for field in REQUIRED_PROJECT_FIELDS:
                val = attrs.get(field, getattr(self.instance, field, ""))
                if not str(val or "").strip():
                    missing[field] = "This field is required when creating a project."
            if missing:
                raise serializers.ValidationError(missing)

        return attrs

    def _save_documents(self, project: EventProject, files: list[Any]) -> None:
        for file_obj in files:
            EventProjectDocument.objects.create(
                project=project,
                file=file_obj,
                original_filename=getattr(file_obj, "name", "document")[:255],
                file_size=getattr(file_obj, "size", 0),
            )

    def create(self, validated_data: dict[str, Any]) -> EventProject:
        documents = validated_data.pop("supporting_documents", [])
        with transaction.atomic():
            project = EventProject.objects.create(**validated_data)
            self._save_documents(project, documents)
        return project

    def update(self, instance: EventProject, validated_data: dict[str, Any]) -> EventProject:
        documents = validated_data.pop("supporting_documents", [])
        with transaction.atomic():
            project = super().update(instance, validated_data)
            self._save_documents(project, documents)
        return project


class EventVendorListSerializer(serializers.ModelSerializer):
    vendor_id = serializers.UUIDField(source="vendor.id", read_only=True)
    vendor_name = serializers.CharField(source="vendor.business_name", read_only=True)
    vendor_category = serializers.CharField(source="vendor.business_category", read_only=True)
    vendor_city = serializers.CharField(source="vendor.city", read_only=True)
    is_verified_vendor = serializers.BooleanField(source="vendor.is_verified_vendor", read_only=True)
    vendor_phone = serializers.CharField(source="vendor.user.phone_number", read_only=True, default="")
    vendor_email = serializers.EmailField(source="vendor.user.email", read_only=True, default="")
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = EventVendor
        fields = [
            "id",
            "project_id",
            "vendor_id",
            "vendor_name",
            "vendor_category",
            "vendor_city",
            "is_verified_vendor",
            "vendor_phone",
            "vendor_email",
            "service_type",
            "status",
            "status_display",
            "agreed_budget",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class EventVendorCreateSerializer(serializers.ModelSerializer):
    vendor_id = serializers.UUIDField(required=True, write_only=True)
    service_type = serializers.CharField(required=False, allow_blank=True, default="")
    vendor_name = serializers.CharField(source="vendor.business_name", read_only=True)
    vendor_category = serializers.CharField(source="vendor.business_category", read_only=True)

    class Meta:
        model = EventVendor
        fields = [
            "id",
            "vendor_id",
            "vendor_name",
            "vendor_category",
            "service_type",
            "status",
            "agreed_budget",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "vendor_name", "vendor_category", "created_at"]

    def validate_vendor_id(self, value: Any) -> Any:
        if not VendorProfile.objects.filter(id=value).exists():
            raise serializers.ValidationError("VendorProfile with the specified ID does not exist.")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        vendor_id = attrs["vendor_id"]
        project = self.context["project"]
        if EventVendor.objects.filter(project=project, vendor_id=vendor_id).exists():
            raise serializers.ValidationError(
                {"vendor_id": "This vendor is already added to this event project."}
            )
        if not attrs.get("service_type"):
            vendor = VendorProfile.objects.only("business_category").get(id=vendor_id)
            attrs["service_type"] = vendor.business_category
        return attrs

    def create(self, validated_data: dict[str, Any]) -> EventVendor:
        vendor_id = validated_data.pop("vendor_id")
        project = self.context["project"]
        return EventVendor.objects.create(
            project=project,
            vendor_id=vendor_id,
            **validated_data,
        )


class EventVendorUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventVendor
        fields = ["service_type", "status", "agreed_budget", "notes"]


class EventVendorBudgetSummarySerializer(serializers.Serializer):
    total_allocated_budget = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_vendors_count = serializers.IntegerField()
    confirmed_vendors_count = serializers.IntegerField()
    estimated_budget_range = serializers.CharField()
    by_service_type = serializers.DictField()

