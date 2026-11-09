from datetime import date
from typing import Any
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from survey.models import Answer, Question, QuestionChoice, Survey, SurveyResponse


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
    is_active = serializers.BooleanField(read_only=True)
    response_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Survey
        fields = [
            "id",
            "title",
            "description",
            "status",
            "visibility",
            "allow_anonymous",
            "duplicate_rule",
            "start_date",
            "end_date",
            "created_by_username",
            "is_active",
            "response_count",
            "created_at",
            "updated_at",
        ]


class SurveyDetailSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    response_count = serializers.IntegerField(read_only=True)
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Survey
        fields = [
            "id",
            "title",
            "description",
            "status",
            "visibility",
            "allow_anonymous",
            "duplicate_rule",
            "start_date",
            "end_date",
            "created_by_username",
            "is_active",
            "response_count",
            "questions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by_username", "is_active", "response_count", "created_at", "updated_at"]


class SurveyCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Survey
        fields = [
            "id",
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

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
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
            if is_authenticated:
                if SurveyResponse.objects.filter(survey=survey, user=request.user).exists():
                    raise serializers.ValidationError("You have already submitted a response to this survey.")
            elif survey.duplicate_rule == Survey.DuplicateRule.ONE_PER_USER and not is_authenticated:
                # If survey strictly allows one per user and anonymous is allowed, track by IP
                if client_ip and SurveyResponse.objects.filter(survey=survey, respondent_ip=client_ip).exists():
                    raise serializers.ValidationError("A response from this IP address has already been submitted.")

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

