import hashlib
import hmac
import json
import logging

import statistics
import uuid
from decimal import Decimal
from typing import Any, Optional
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Avg, Count, Max, Min
from django.utils import timezone

from survey.models import Answer, Question, QuestionChoice, Survey, SurveyPayment, SurveyResponse

logger = logging.getLogger(__name__)
User = get_user_model()


class SurveyService:
    @staticmethod
    def publish_survey(survey: Survey) -> Survey:
        if not survey.is_paid:
            raise ValidationError("Payment is required before publishing this survey. Please complete payment first.")

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


class RazorpayService:
    """Handles Razorpay order creation, signature verification, and payment settlement."""

    RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders"

    @classmethod
    def get_credentials(cls) -> tuple[str, str, Decimal]:
        key_id = getattr(settings, "RAZORPAY_KEY_ID", "") or ""
        key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "") or ""
        fee_inr = Decimal(str(getattr(settings, "SURVEY_PUBLISH_FEE_INR", 499)))
        return key_id, key_secret, fee_inr

    @classmethod
    def create_order(
        cls,
        survey: Survey,
        user: Any,
        amount_inr: Optional[Decimal] = None,
    ) -> SurveyPayment:
        """
        Creates a Razorpay order via Razorpay REST API and records a pending SurveyPayment.
        """
        if survey.is_paid:
            raise ValidationError("This survey is already paid and ready to publish.")

        key_id, key_secret, default_fee = cls.get_credentials()
        final_amount = amount_inr if amount_inr is not None else default_fee
        amount_paise = int(final_amount * 100)

        # Receipt identifier up to 40 chars
        receipt_id = f"surv_{str(survey.id).replace('-', '')[:20]}"
        payload = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt_id,
            "notes": {
                "survey_id": str(survey.id),
                "survey_title": survey.title[:40],
                "user_id": str(user.id),
            },
        }

        order_id = ""
        # If real Razorpay keys are configured, invoke the official Razorpay Orders endpoint
        if key_id and key_secret and not key_id.startswith("mock_"):
            try:
                response = requests.post(
                    cls.RAZORPAY_ORDERS_URL,
                    auth=(key_id, key_secret),
                    json=payload,
                    timeout=10,
                )
                if response.status_code in [200, 201]:
                    order_data = response.json()
                    order_id = order_data.get("id", "")
                else:
                    logger.error(f"Razorpay order creation failed: {response.status_code} - {response.text}")
                    raise ValidationError(f"Failed to create Razorpay order: {response.text}")
            except requests.RequestException as exc:
                logger.exception("Network error while connecting to Razorpay API")
                raise ValidationError("Failed to communicate with Razorpay. Please check network or try again.")
        else:
            # Fallback for local sandbox/testing without active test API keys
            order_id = f"order_mock_{uuid.uuid4().hex[:14]}"

        payment = SurveyPayment.objects.create(
            survey=survey,
            user=user,
            razorpay_order_id=order_id,
            amount=final_amount,
            currency="INR",
            status=SurveyPayment.Status.PENDING,
        )
        return payment

    @classmethod
    def verify_payment(
        cls,
        survey: Survey,
        user: Any,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> SurveyPayment:
        """
        Validates HMAC SHA-256 signature and atomically marks the Survey as paid.
        """
        key_id, key_secret, _ = cls.get_credentials()

        with transaction.atomic():
            # Concurrency locking per GEMINI.md
            try:
                payment = SurveyPayment.objects.select_for_update().get(
                    survey=survey,
                    razorpay_order_id=razorpay_order_id,
                )
            except SurveyPayment.DoesNotExist:
                raise ValidationError(f"No payment order found for order ID '{razorpay_order_id}'.")

            if payment.status == SurveyPayment.Status.SUCCESS:
                # Already processed idempotently
                return payment

            # Cryptographic signature check: HMAC-SHA256(order_id + "|" + payment_id, secret)
            if key_secret and not key_secret.startswith("mock_"):
                data_to_sign = f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8")
                expected_signature = hmac.new(
                    key_secret.encode("utf-8"),
                    data_to_sign,
                    hashlib.sha256,
                ).hexdigest()

                if not hmac.compare_digest(expected_signature, razorpay_signature):
                    payment.status = SurveyPayment.Status.FAILED
                    payment.error_code = "BAD_REQUEST_ERROR"
                    payment.error_description = "Invalid payment signature."
                    payment.save(update_fields=["status", "error_code", "error_description", "updated_at"])
                    raise ValidationError("Payment signature verification failed.")
            else:
                # In sandbox/testing mode, accept test signature if mock keys are present
                if not (
                    razorpay_signature in ["valid_test_signature", "mock_signature"]
                    or razorpay_signature.startswith("mock_")
                ):
                    payment.status = SurveyPayment.Status.FAILED
                    payment.error_description = "Invalid mock test signature."
                    payment.save(update_fields=["status", "error_description", "updated_at"])
                    raise ValidationError("Payment signature verification failed.")

            # Mark payment success and survey paid
            payment.razorpay_payment_id = razorpay_payment_id
            payment.razorpay_signature = razorpay_signature
            payment.status = SurveyPayment.Status.SUCCESS
            payment.save(update_fields=["razorpay_payment_id", "razorpay_signature", "status", "updated_at"])

            locked_survey = Survey.objects.select_for_update().get(id=survey.id)
            locked_survey.is_paid = True
            locked_survey.save(update_fields=["is_paid", "updated_at"])

        return payment

    @classmethod
    def verify_webhook_signature(cls, raw_body: bytes, received_signature: str) -> bool:
        webhook_secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "") or ""
        if not webhook_secret or webhook_secret.startswith("mock_"):
            return (
                received_signature in ["valid_test_signature", "mock_signature"]
                or received_signature.startswith("mock_")
            )
        expected_sig = hmac.new(webhook_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_sig, received_signature)

    @classmethod
    def process_webhook_event(cls, raw_body: bytes, received_signature: str) -> dict[str, Any]:
        """
        Processes server-to-server Razorpay webhook events (payment.captured, order.paid).
        """
        if not cls.verify_webhook_signature(raw_body, received_signature):
            logger.warning("Razorpay webhook received with invalid signature.")
            raise ValidationError("Invalid webhook signature.")

        try:
            event_data = json.loads(raw_body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise ValidationError("Malformed JSON payload in webhook.")

        event_name = event_data.get("event")
        logger.info(f"Received Razorpay webhook event: {event_name}")

        if event_name in ["payment.captured", "order.paid"]:
            payment_entity = event_data.get("payload", {}).get("payment", {}).get("entity", {})
            order_entity = event_data.get("payload", {}).get("order", {}).get("entity", {})

            order_id = payment_entity.get("order_id") or order_entity.get("id")
            payment_id = payment_entity.get("id")

            if not order_id:
                return {"status": "ignored", "detail": "No order_id found in webhook payload."}

            with transaction.atomic():
                try:
                    payment = SurveyPayment.objects.select_for_update().get(razorpay_order_id=order_id)
                except SurveyPayment.DoesNotExist:
                    logger.warning(f"SurveyPayment for order {order_id} not found in database.")
                    return {"status": "ignored", "detail": f"Order {order_id} not found."}

                if payment.status != SurveyPayment.Status.SUCCESS:
                    payment.status = SurveyPayment.Status.SUCCESS
                    if payment_id:
                        payment.razorpay_payment_id = payment_id
                    payment.save(update_fields=["status", "razorpay_payment_id", "updated_at"])

                    survey = Survey.objects.select_for_update().get(id=payment.survey_id)
                    if not survey.is_paid:
                        survey.is_paid = True
                        survey.save(update_fields=["is_paid", "updated_at"])

                return {"status": "success", "order_id": order_id, "is_paid": True}

        return {"status": "ignored", "event": event_name}



