from django.contrib import admin
from survey.models import Answer, Question, QuestionChoice, Survey, SurveyResponse


class QuestionChoiceInline(admin.TabularInline):
    model = QuestionChoice
    extra = 1
    fields = ("text", "order")


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 0
    show_change_link = True
    fields = ("text", "question_type", "is_required", "order")


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 0
    can_delete = False
    readonly_fields = ("question", "value")


@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "status",
        "visibility",
        "allow_anonymous",
        "duplicate_rule",
        "created_by",
        "response_count",
        "created_at",
    )
    list_filter = ("status", "visibility", "allow_anonymous", "duplicate_rule")
    search_fields = ("title", "description", "created_by__username", "created_by__email")
    readonly_fields = ("id", "created_at", "updated_at", "response_count")
    ordering = ("-created_at",)
    inlines = [QuestionInline]

    fieldsets = (
        (
            "System Identifiers",
            {"fields": ("id", "created_at", "updated_at", "response_count")},
        ),
        (
            "Survey Details",
            {"fields": ("title", "description", "created_by")},
        ),
        (
            "Publishing & Access Controls",
            {"fields": ("status", "visibility", "allow_anonymous", "duplicate_rule", "start_date", "end_date")},
        ),
    )


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "survey", "text", "question_type", "is_required", "order")
    list_filter = ("question_type", "is_required")
    search_fields = ("text", "survey__title")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [QuestionChoiceInline]


@admin.register(SurveyResponse)
class SurveyResponseAdmin(admin.ModelAdmin):
    list_display = ("id", "survey", "user", "respondent_ip", "submitted_at")
    list_filter = ("survey", "submitted_at")
    search_fields = ("survey__title", "user__username", "respondent_ip")
    readonly_fields = ("id", "submitted_at")
    inlines = [AnswerInline]


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ("id", "response", "question", "value")
    readonly_fields = ("id",)
