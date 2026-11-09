import statistics
from typing import Any, Optional
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Avg, Count, Max, Min
from django.utils import timezone

from survey.models import Answer, Question, QuestionChoice, Survey, SurveyResponse

User = get_user_model()


class SurveyService:
    @staticmethod
    def publish_survey(survey: Survey) -> Survey:
        if not survey.questions.exists():
            raise ValidationError("Cannot publish a survey without questions. Please add questions first.")

        survey.status = Survey.Status.PUBLISHED
        if not survey.start_date:
            survey.start_date = timezone.now()
        survey.save(update_fields=["status", "start_date", "updated_at"])
        return survey

    @staticmethod
    def close_survey(survey: Survey) -> Survey:
        survey.status = Survey.Status.CLOSED
        survey.end_date = timezone.now()
        survey.save(update_fields=["status", "end_date", "updated_at"])
        return survey

    @staticmethod
    def submit_response(
        survey: Survey,
        validated_answers: list[dict[str, Any]],
        user: Optional[Any] = None,
        client_ip: Optional[str] = None,
        session_id: str = "",
    ) -> SurveyResponse:
        with transaction.atomic():
            # Concurrency protection with select_for_update per GEMINI.md
            locked_survey = Survey.objects.select_for_update().get(id=survey.id)
            if not locked_survey.is_active:
                raise ValidationError("Survey has just closed or is no longer active.")

            response_instance = SurveyResponse.objects.create(
                survey=locked_survey,
                user=user if user and user.is_authenticated else None,
                respondent_ip=client_ip,
                respondent_session=session_id,
            )

            answers_to_create = [
                Answer(
                    response=response_instance,
                    question=item["question"],
                    value=item["value"],
                )
                for item in validated_answers
            ]
            Answer.objects.bulk_create(answers_to_create, batch_size=500)

        return response_instance

    @staticmethod
    def get_survey_analytics(survey: Survey) -> dict[str, Any]:
        total_responses = survey.responses.count()
        questions = survey.questions.prefetch_related("choices", "answers").all()

        questions_analytics = []
        for q in questions:
            q_answers = [a.value for a in q.answers.all() if a.value is not None]
            answered_count = len(q_answers)
            stat_data: dict[str, Any] = {
                "question_id": str(q.id),
                "text": q.text,
                "question_type": q.question_type,
                "is_required": q.is_required,
                "answered_count": answered_count,
            }

            if q.question_type in [Question.QuestionType.SINGLE, Question.QuestionType.BOOLEAN]:
                counts: dict[str, int] = {}
                for val in q_answers:
                    s_val = str(val)
                    counts[s_val] = counts.get(s_val, 0) + 1

                distribution = []
                for k, count in counts.items():
                    distribution.append({
                        "option": k,
                        "count": count,
                        "percentage": round((count / answered_count) * 100, 2) if answered_count else 0,
                    })
                stat_data["distribution"] = distribution

            elif q.question_type == Question.QuestionType.MULTIPLE:
                counts: dict[str, int] = {}
                for val_list in q_answers:
                    if isinstance(val_list, list):
                        for item in val_list:
                            s_item = str(item)
                            counts[s_item] = counts.get(s_item, 0) + 1

                distribution = []
                for k, count in counts.items():
                    distribution.append({
                        "option": k,
                        "count": count,
                        "percentage": round((count / answered_count) * 100, 2) if answered_count else 0,
                    })
                stat_data["distribution"] = distribution

            elif q.question_type == Question.QuestionType.NUMBER:
                numeric_vals = [float(v) for v in q_answers if isinstance(v, (int, float))]
                if numeric_vals:
                    stat_data["summary"] = {
                        "min": min(numeric_vals),
                        "max": max(numeric_vals),
                        "avg": round(sum(numeric_vals) / len(numeric_vals), 2),
                        "median": round(statistics.median(numeric_vals), 2),
                    }
                else:
                    stat_data["summary"] = {"min": None, "max": None, "avg": None, "median": None}

            elif q.question_type in [Question.QuestionType.TEXT, Question.QuestionType.DATE]:
                # Sample recent responses
                stat_data["recent_samples"] = [str(v) for v in q_answers[:10]]

            questions_analytics.append(stat_data)

        return {
            "survey_id": str(survey.id),
            "survey_title": survey.title,
            "status": survey.status,
            "visibility": survey.visibility,
            "is_active": survey.is_active,
            "total_responses": total_responses,
            "questions": questions_analytics,
        }

