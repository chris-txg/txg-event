from django.contrib import admin

# Register your models here.
from projects.models import EventProject, EventProjectDocument


class EventProjectDocumentInline(admin.TabularInline):
    model = EventProjectDocument
    extra = 0
    readonly_fields = ("id", "original_filename", "file_size", "uploaded_at")


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
    inlines = [EventProjectDocumentInline]

