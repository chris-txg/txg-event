from django.contrib import admin
from survey.models import (
    Answer,
    Coupon,
    CouponUsage,
    Question,
    QuestionChoice,
    RazorpayWebhookLog,
    Survey,
    SurveyPayment,
    SurveyPricingOption,
    SurveyResponse,
)


@admin.register(RazorpayWebhookLog)
class RazorpayWebhookLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "event_type",
        "event_id",
        "status",
        "payment",
        "ip_address",
        "received_at",
        "processed_at",
    )
    list_filter = ("event_type", "status", "received_at")
    search_fields = ("event_id", "event_type", "signature", "payment__razorpay_order_id")
    readonly_fields = (
        "id",
        "event_id",
        "event_type",
        "payload",
        "headers",
        "signature",
        "status",
        "error_message",
        "payment",
        "ip_address",
        "received_at",
        "processed_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "discount_type",
        "discount_value",
        "is_active",
        "max_uses",
        "max_uses_per_user",
        "valid_from",
        "valid_until",
        "created_at",
    )
    list_filter = ("discount_type", "is_active", "valid_until")
    search_fields = ("code", "description")
    list_editable = ("is_active",)
    readonly_fields = ("id", "created_at", "updated_at")
    filter_horizontal = ("applicable_plans",)


@admin.register(CouponUsage)
class CouponUsageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "coupon",
        "user",
        "survey",
        "original_amount",
        "discount_amount",
        "final_amount",
        "used_at",
    )
    list_filter = ("coupon", "used_at")
    search_fields = ("coupon__code", "user__username", "user__email", "survey__title")
    readonly_fields = (
        "id",
        "coupon",
        "user",
        "survey",
        "original_amount",
        "discount_amount",
        "final_amount",
        "used_at",
    )

    def has_add_permission(self, request):
        return False


@admin.register(SurveyPricingOption)
class SurveyPricingOptionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "code",
        "price",
        "currency",
        "is_free",
        "free_limit_per_user",
        "is_active",
        "display_order",
        "created_at",
    )
    list_filter = ("is_active", "is_free")
    search_fields = ("name", "code", "description")
    list_editable = ("is_active", "price", "display_order", "free_limit_per_user")
    ordering = ("display_order", "price")



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
        "is_paid",
        "pricing_option",
        "applied_coupon",
        "visibility",
        "allow_anonymous",
        "duplicate_rule",
        "created_by",
        "response_count",
        "created_at",
    )
    list_filter = ("status", "is_paid", "pricing_option", "applied_coupon", "visibility", "allow_anonymous", "duplicate_rule")
    search_fields = ("title", "description", "created_by__username", "created_by__email", "applied_coupon__code")
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
            {"fields": ("status", "is_paid", "pricing_option", "applied_coupon", "visibility", "allow_anonymous", "duplicate_rule", "start_date", "end_date")},
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


@admin.register(SurveyPayment)
class SurveyPaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "survey",
        "user",
        "pricing_option",
        "coupon",
        "razorpay_order_id",
        "razorpay_payment_id",
        "amount",
        "currency",
        "status",
        "created_at",
    )
    list_filter = ("status", "pricing_option", "coupon", "currency", "created_at")
    search_fields = (
        "razorpay_order_id",
        "razorpay_payment_id",
        "coupon__code",
        "survey__title",
        "user__username",
    )
    readonly_fields = ("id", "created_at", "updated_at")

