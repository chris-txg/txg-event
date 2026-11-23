from datetime import date
from typing import Any, Optional
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from projects.models import EventProject
from survey.models import (
    Answer,
    Coupon,
    CouponUsage,
    Question,
    QuestionChoice,
    Survey,
    SurveyPayment,
    SurveyPricingOption,
    SurveyResponse,
)


class SurveyPricingOptionSerializer(serializers.ModelSerializer):
    user_used_count = serializers.SerializerMethodField()
    user_remaining_count = serializers.SerializerMethodField()
    is_available_for_user = serializers.SerializerMethodField()

    class Meta:
        model = SurveyPricingOption
        fields = [
            "id",
            "name",
            "code",
            "description",
            "price",
            "currency",
            "is_free",
            "free_limit_per_user",
            "is_active",
            "display_order",
            "features",
            "user_used_count",
            "user_remaining_count",
            "is_available_for_user",
        ]

    def _get_user(self) -> Optional[Any]:
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            return request.user
        return None

    def get_user_used_count(self, obj: SurveyPricingOption) -> int:
        user = self._get_user()
        if not user or not obj.is_free:
            return 0
        return Survey.objects.filter(
            created_by=user,
            pricing_option=obj,
            status__in=[Survey.Status.PUBLISHED, Survey.Status.CLOSED],
        ).count()

    def get_user_remaining_count(self, obj: SurveyPricingOption) -> int:
        if not obj.is_free:
            return 999
        used = self.get_user_used_count(obj)
        return max(0, obj.free_limit_per_user - used)

    def get_is_available_for_user(self, obj: SurveyPricingOption) -> bool:
        if not obj.is_active:
            return False
        if not obj.is_free:
            return True
        return self.get_user_remaining_count(obj) > 0


class QuestionChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionChoice
        fields = ["id", "text", "order"]


class QuestionSerializer(serializers.ModelSerializer):
    choices = QuestionChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "survey",
            "text",
            "question_type",
            "is_required",
            "order",
            "choices",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "survey", "created_at", "updated_at"]


class QuestionCreateSerializer(serializers.ModelSerializer):
    choices = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        write_only=True,
        help_text="Optional list of choice texts for SINGLE or MULTIPLE questions.",
    )

    class Meta:
        model = Question
        fields = [
            "id",
            "text",
            "question_type",
            "is_required",
            "order",
            "choices",
        ]

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        q_type = attrs.get("question_type")
        choices = attrs.get("choices", [])
        if q_type in [Question.QuestionType.SINGLE, Question.QuestionType.MULTIPLE] and not choices:
            raise serializers.ValidationError(
                {"choices": f"At least one choice must be provided for {q_type} question type."}
            )
        return attrs

    def create(self, validated_data: dict[str, Any]) -> Question:
        choices_data = validated_data.pop("choices", [])
        with transaction.atomic():
            question = Question.objects.create(**validated_data)
            for idx, text in enumerate(choices_data):
                QuestionChoice.objects.create(question=question, text=text, order=idx)
        return question


class SurveyListSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    project_name = serializers.CharField(source="project.project_name", read_only=True, allow_null=True)
    is_active = serializers.BooleanField(read_only=True)
    response_count = serializers.IntegerField(read_only=True)
    pricing_option = SurveyPricingOptionSerializer(read_only=True)

    class Meta:
        model = Survey
        fields = [
            "id",
            "project",
            "project_name",
            "title",
            "description",
            "status",
            "visibility",
            "allow_anonymous",
            "duplicate_rule",
            "start_date",
            "end_date",
            "is_paid",
            "pricing_option",
            "created_by_username",
            "is_active",
            "response_count",
            "created_at",
            "updated_at",
        ]


class SurveyDetailSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    project_name = serializers.CharField(source="project.project_name", read_only=True, allow_null=True)
    is_active = serializers.BooleanField(read_only=True)
    response_count = serializers.IntegerField(read_only=True)
    pricing_option = SurveyPricingOptionSerializer(read_only=True)
    applied_coupon_code = serializers.CharField(source="applied_coupon.code", read_only=True, allow_null=True)
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Survey
        fields = [
            "id",
            "project",
            "project_name",
            "title",
            "description",
            "status",
            "visibility",
            "allow_anonymous",
            "duplicate_rule",
            "start_date",
            "end_date",
            "is_paid",
            "pricing_option",
            "applied_coupon_code",
            "created_by_username",
            "is_active",
            "response_count",
            "questions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_paid",
            "pricing_option",
            "applied_coupon_code",
            "created_by_username",
            "project_name",
            "is_active",
            "response_count",
            "created_at",
            "updated_at",
        ]


class SurveyCreateUpdateSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(
        queryset=EventProject.objects.all(),
        required=True,
        help_text="UUID of the Event Project this survey belongs to.",
    )

    class Meta:
        model = Survey
        fields = [
            "id",
            "project",
            "title",
            "description",
            "status",
            "visibility",
            "allow_anonymous",
            "duplicate_rule",
            "start_date",
            "end_date",
        ]
        read_only_fields = ["id"]

    def validate_project(self, value: EventProject) -> EventProject:
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            is_admin = request.user.is_staff or getattr(request.user, "role", None) in ["ADMIN", "SUPERADMIN"]
            if not is_admin and value.owner_id != request.user.id:
                raise serializers.ValidationError("You can only create surveys for your own Event Projects.")
        return value

    def validate_status(self, value: str) -> str:
        if self.instance and self.instance.status == Survey.Status.CLOSED and value != Survey.Status.CLOSED:
            raise serializers.ValidationError("Cannot change the status of a closed survey.")

        if value == Survey.Status.PUBLISHED:
            is_paid = getattr(self.instance, "is_paid", False) if self.instance else False
            if not is_paid:
                raise serializers.ValidationError(
                    "Cannot set status to 'published' without payment. Please complete payment and use the publish endpoint."
                )
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if self.instance and self.instance.status == Survey.Status.CLOSED:
            raise serializers.ValidationError("Cannot modify a closed survey. It is finalized.")

        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and start > end:
            raise serializers.ValidationError({"end_date": "End date cannot be earlier than start date."})
        return attrs


class AnswerSubmissionItemSerializer(serializers.Serializer):
    question_id = serializers.UUIDField(required=True)
    value = serializers.JSONField(required=True, allow_null=True)


class SurveySubmitSerializer(serializers.Serializer):
    answers = AnswerSubmissionItemSerializer(many=True, required=True)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        survey: Survey = self.context["survey"]
        request = self.context.get("request")

        # 1. Survey Availability Check
        if not survey.is_active:
            raise serializers.ValidationError("This survey is not currently accepting responses.")

        # 2. Authentication and Visibility Check
        is_authenticated = bool(request and request.user and request.user.is_authenticated)
        if survey.visibility == Survey.Visibility.PRIVATE and not is_authenticated:
            raise serializers.ValidationError("Authentication is required to participate in this private survey.")

        if not survey.allow_anonymous and not is_authenticated:
            raise serializers.ValidationError("Anonymous submissions are not allowed for this survey. Please log in.")

        # 3. Duplicate Submission Rule Check
        client_ip = self.context.get("client_ip")
        if survey.duplicate_rule == Survey.DuplicateRule.ONE_PER_USER:
            if not is_authenticated:
                raise serializers.ValidationError(
                    "You must be logged in to participate in this survey because it is restricted to one response per user."
                )
            if SurveyResponse.objects.filter(survey=survey, user=request.user).exists():
                raise serializers.ValidationError("You have already submitted a response to this survey.")

        elif survey.duplicate_rule == Survey.DuplicateRule.ONE_PER_IP:
            if client_ip and SurveyResponse.objects.filter(survey=survey, respondent_ip=client_ip).exists():
                raise serializers.ValidationError("A response from this IP address has already been submitted.")

        # 4. Answers Validation Against Questions
        questions = {q.id: q for q in survey.questions.prefetch_related("choices").all()}
        submitted_answers = attrs.get("answers", [])
        submitted_map = {ans["question_id"]: ans["value"] for ans in submitted_answers}

        # Check required questions
        missing_required = []
        for q_id, q in questions.items():
            if q.is_required:
                val = submitted_map.get(q_id)
                if val is None or val == "" or val == []:
                    missing_required.append(f"Question '{q.text[:40]}' is required.")
        if missing_required:
            raise serializers.ValidationError({"answers": missing_required})

        # Deep type validation per question
        validated_answers = []
        for ans in submitted_answers:
            q_id = ans["question_id"]
            val = ans["value"]
            if q_id not in questions:
                raise serializers.ValidationError({"answers": f"Question {q_id} does not belong to this survey."})

            q = questions[q_id]
            if val is not None:
                self._validate_value_type(q, val)
            validated_answers.append({"question": q, "value": val})

        attrs["validated_answers"] = validated_answers
        return attrs

    def _validate_value_type(self, question: Question, val: Any) -> None:
        q_type = question.question_type

        if q_type == Question.QuestionType.TEXT:
            if not isinstance(val, str):
                raise serializers.ValidationError({str(question.id): "Value must be a text string."})

        elif q_type == Question.QuestionType.NUMBER:
            if not isinstance(val, (int, float)) or isinstance(val, bool):
                raise serializers.ValidationError({str(question.id): "Value must be a valid number."})

        elif q_type == Question.QuestionType.BOOLEAN:
            if not isinstance(val, bool):
                raise serializers.ValidationError({str(question.id): "Value must be a boolean (true/false)."})

        elif q_type == Question.QuestionType.DATE:
            if not isinstance(val, str):
                raise serializers.ValidationError({str(question.id): "Value must be a date string in YYYY-MM-DD format."})
            try:
                date.fromisoformat(val)
            except ValueError:
                raise serializers.ValidationError({str(question.id): "Invalid date format. Expected YYYY-MM-DD."})

        elif q_type == Question.QuestionType.SINGLE:
            valid_choices = [c.text for c in question.choices.all()]
            valid_ids = [str(c.id) for c in question.choices.all()]
            if not (str(val) in valid_choices or str(val) in valid_ids):
                raise serializers.ValidationError(
                    {str(question.id): f"Invalid choice '{val}'. Must be one of: {valid_choices}"}
                )

        elif q_type == Question.QuestionType.MULTIPLE:
            if not isinstance(val, list):
                raise serializers.ValidationError({str(question.id): "Value must be a list of choices."})
            valid_choices = [c.text for c in question.choices.all()]
            valid_ids = [str(c.id) for c in question.choices.all()]
            for item in val:
                if not (str(item) in valid_choices or str(item) in valid_ids):
                    raise serializers.ValidationError(
                        {str(question.id): f"Invalid choice '{item}'. Permitted options: {valid_choices}"}
                    )


class AnswerDetailSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source="question.text", read_only=True)
    question_type = serializers.CharField(source="question.question_type", read_only=True)

    class Meta:
        model = Answer
        fields = [
            "id",
            "question",
            "question_text",
            "question_type",
            "value",
        ]


class SurveyResponseDetailSerializer(serializers.ModelSerializer):
    survey_id = serializers.UUIDField(source="survey.id", read_only=True)
    survey_title = serializers.CharField(source="survey.title", read_only=True)
    respondent = serializers.CharField(source="user.username", default="Anonymous", read_only=True)
    answers = AnswerDetailSerializer(many=True, read_only=True)

    class Meta:
        model = SurveyResponse
        fields = [
            "id",
            "survey_id",
            "survey_title",
            "respondent",
            "respondent_ip",
            "submitted_at",
            "answers",
        ]


class SurveyPaymentOrderResponseSerializer(serializers.Serializer):
    order_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    amount_paise = serializers.IntegerField()
    currency = serializers.CharField()
    key_id = serializers.CharField()
    survey_id = serializers.UUIDField()
    survey_title = serializers.CharField()
    pricing_option_code = serializers.CharField(required=False, allow_blank=True)
    pricing_option_name = serializers.CharField(required=False, allow_blank=True)
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)


class SurveyPublishRequestSerializer(serializers.Serializer):
    pricing_option_code = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Plan code, e.g. 'free' or 'standard'",
    )
    pricing_option_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="UUID of active SurveyPricingOption",
    )
    coupon_code = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Optional coupon code (e.g. 'LAUNCH50' or 'VIPFREE')",
    )


class SurveyCreatePaymentOrderRequestSerializer(serializers.Serializer):
    pricing_option_code = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Code of paid plan, e.g. 'standard' or 'pro'",
    )
    pricing_option_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="UUID of active paid SurveyPricingOption",
    )
    coupon_code = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Optional coupon code to apply discount before payment",
    )


class CouponValidateRequestSerializer(serializers.Serializer):
    coupon_code = serializers.CharField(
        required=True,
        max_length=50,
        help_text="Coupon code to validate",
    )
    pricing_option_code = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Code of the pricing option to test against (e.g. 'standard')",
    )
    pricing_option_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="UUID of the pricing option to test against",
    )


class CouponValidateResponseSerializer(serializers.Serializer):
    valid = serializers.BooleanField()
    coupon_code = serializers.CharField()
    discount_type = serializers.CharField()
    discount_value = serializers.DecimalField(max_digits=10, decimal_places=2)
    original_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField()
    message = serializers.CharField()


class SurveyPaymentVerifySerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField(required=True, max_length=100)
    razorpay_payment_id = serializers.CharField(required=True, max_length=100)
    razorpay_signature = serializers.CharField(required=True, max_length=255)


class SurveyPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyPayment
        fields = [
            "id",
            "survey",
            "user",
            "razorpay_order_id",
            "razorpay_payment_id",
            "amount",
            "currency",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


