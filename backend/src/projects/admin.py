from django.contrib import admin

# Register your models here.
from projects.models import EventProject, EventProjectDocument, EventVendor


class EventProjectDocumentInline(admin.TabularInline):
    model = EventProjectDocument
    extra = 0
    readonly_fields = ("id", "original_filename", "file_size", "uploaded_at")


class EventVendorInline(admin.TabularInline):
    model = EventVendor
    extra = 0
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(EventProject)
class EventProjectAdmin(admin.ModelAdmin):
    list_display = (
        "project_name",
        "owner",
        "status",
        "event_segment",
        "event_city",
        "proposed_date",
        "created_at",
    )
    list_filter = ("status", "event_format", "currency", "event_country")
    search_fields = ("project_name", "organiser_name", "official_email", "event_city")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [EventProjectDocumentInline, EventVendorInline]


@admin.register(EventVendor)
class EventVendorAdmin(admin.ModelAdmin):
    list_display = (
        "project",
        "vendor",
        "service_type",
        "status",
        "agreed_budget",
        "created_at",
    )
    list_filter = ("service_type", "status", "created_at")
    search_fields = ("project__project_name", "vendor__business_name", "notes")
    readonly_fields = ("id", "created_at", "updated_at")


