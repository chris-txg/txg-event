from typing import Any
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.services import get_client_ip
from survey.models import (
    Answer,
    Coupon,
    CouponUsage,
    Question,
    QuestionChoice,
    Survey,
    SurveyPricingOption,
    SurveyResponse,
)
from survey.permissions import IsSurveyOwnerOrStaff
from survey.serializers import (
    AnswerDetailSerializer,
    CouponValidateRequestSerializer,
    CouponValidateResponseSerializer,
    QuestionChoiceSerializer,
    QuestionCreateSerializer,
    QuestionSerializer,
    SurveyCreatePaymentOrderRequestSerializer,
    SurveyCreateUpdateSerializer,
    SurveyDetailSerializer,
    SurveyListSerializer,
    SurveyPaymentOrderResponseSerializer,
    SurveyPaymentVerifySerializer,
    SurveyPricingOptionSerializer,
    SurveyPublishRequestSerializer,
    SurveyResponseDetailSerializer,
    SurveySubmitSerializer,
)
from survey.services import CouponService, RazorpayService, SurveyService



class SurveyListCreateView(generics.ListCreateAPIView):
    """
    List surveys or create a new survey.
    - Public / Unauthenticated: lists published public surveys.
    - Query ?mine=true (requires auth): lists surveys created by current user.
    """

    def get_permissions(self) -> list[Any]:
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        mine = self.request.query_params.get("mine", "").lower() in ("true", "1")
        if mine:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_serializer_class(self) -> Any:
        if self.request.method == "POST":
            return SurveyCreateUpdateSerializer
        return SurveyListSerializer

    def get_queryset(self) -> Any:
        user = self.request.user
        mine = self.request.query_params.get("mine", "").lower() in ("true", "1")

        if mine:
            qs = Survey.objects.filter(created_by=user).select_related("created_by", "project")
            project_param = self.request.query_params.get("project")
            if project_param:
                qs = qs.filter(project_id=project_param)
            return qs

        # Default explore listing:
        qs = Survey.objects.select_related("created_by", "project")
        project_param = self.request.query_params.get("project")
        if project_param:
            qs = qs.filter(project_id=project_param)
        status_param = self.request.query_params.get("status")
        visibility_param = self.request.query_params.get("visibility")

        if user.is_authenticated and (user.is_staff or getattr(user, "role", None) in ["ADMIN", "SUPERADMIN"]):
            # Staff can see all if requested
            if status_param:
                qs = qs.filter(status=status_param)
            if visibility_param:
                qs = qs.filter(visibility=visibility_param)
            return qs

        # Regular users / Anonymous: only published surveys
        # If authenticated, include public published surveys OR private surveys
        if user.is_authenticated:
            qs = qs.filter(status=Survey.Status.PUBLISHED)
        else:
            qs = qs.filter(status=Survey.Status.PUBLISHED, visibility=Survey.Visibility.PUBLIC)

        if visibility_param:
            qs = qs.filter(visibility=visibility_param)

        return qs

    def perform_create(self, serializer: Any) -> None:
        serializer.save(created_by=self.request.user)

    @extend_schema(
        tags=["Surveys - Management"],
        summary="List surveys (Supports ?mine=true for creator's surveys)",
        parameters=[
            OpenApiParameter(name="mine", description="Set to 'true' to list only surveys created by you.", required=False, type=bool),
            OpenApiParameter(name="status", description="Filter by status (draft, published, closed)", required=False, type=str),
            OpenApiParameter(name="visibility", description="Filter by visibility (public, private)", required=False, type=str),
        ],
    )
    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return super().get(request, *args, **kwargs)

    @extend_schema(
        tags=["Surveys - Management"],
        summary="Create a new survey (Draft by default)",
        request=SurveyCreateUpdateSerializer,
        responses={status.HTTP_201_CREATED: SurveyDetailSerializer},
    )
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        detail_serializer = SurveyDetailSerializer(serializer.instance)
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)


class SurveyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a survey.
    Only creator or admin can update/delete.
    """

    queryset = Survey.objects.select_related("created_by").prefetch_related(
        Prefetch("questions", queryset=Question.objects.prefetch_related("choices"))
    )
    lookup_field = "id"

    def get_permissions(self) -> list[Any]:
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsSurveyOwnerOrStaff()]

    def get_serializer_class(self) -> Any:
        if self.request.method in ["PUT", "PATCH"]:
            return SurveyCreateUpdateSerializer
        return SurveyDetailSerializer

    def perform_destroy(self, instance: Survey) -> None:
        if instance.responses.exists():
            raise ValidationError("Cannot delete survey because responses have already been submitted.")
        instance.delete()

    @extend_schema(tags=["Surveys - Management"], summary="Get survey details")
    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        survey = self.get_object()
        # If draft or private, verify permissions
        if survey.status == Survey.Status.DRAFT:
            if not request.user.is_authenticated or (survey.created_by != request.user and not request.user.is_staff):
                raise PermissionDenied("You do not have permission to view this draft survey.")
        elif survey.visibility == Survey.Visibility.PRIVATE and not request.user.is_authenticated:
            raise PermissionDenied("Authentication is required to view this private survey.")
        return super().get(request, *args, **kwargs)

    @extend_schema(tags=["Surveys - Management"], summary="Update survey metadata")
    def patch(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return super().patch(request, *args, **kwargs)

    @extend_schema(tags=["Surveys - Management"], summary="Delete survey (only if no responses exist)")
    def delete(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return super().delete(request, *args, **kwargs)


class SurveyPricingOptionsListView(APIView):
    """
    Returns all active pricing options, including free tier availability and remaining limits for the user.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=["Surveys - Payments"],
        summary="List active pricing options for publishing surveys",
        responses={status.HTTP_200_OK: SurveyPricingOptionSerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        plans = SurveyPricingOption.objects.filter(is_active=True).order_by("display_order", "price")
        serializer = SurveyPricingOptionSerializer(plans, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class SurveyPublishView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSurveyOwnerOrStaff]

    @extend_schema(
        tags=["Surveys - Management"],
        summary="Publish a survey (Supports active free tier with user limit or requires completed payment)",
        request=SurveyPublishRequestSerializer,
        responses={
            status.HTTP_200_OK: OpenApiResponse(description="Survey published successfully."),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Validation error or cannot publish without questions."),
            status.HTTP_402_PAYMENT_REQUIRED: OpenApiResponse(description="Payment required or free limit reached."),
        },
    )
    def post(self, request: Request, id: str) -> Response:
        survey = get_object_or_404(Survey, id=id)
        self.check_object_permissions(request, survey)

        if survey.status == Survey.Status.CLOSED:
            return Response(
                {
                    "detail": "This survey is closed and cannot be reopened or republished.",
                    "code": "SURVEY_CLOSED",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        req_serializer = SurveyPublishRequestSerializer(data=request.data or {})
        req_serializer.is_valid(raise_exception=True)
        opt_code = req_serializer.validated_data.get("pricing_option_code")
        opt_id = req_serializer.validated_data.get("pricing_option_id")

        pricing_option = None
        if opt_id:
            pricing_option = get_object_or_404(SurveyPricingOption, id=opt_id)
        elif opt_code:
            pricing_option = get_object_or_404(SurveyPricingOption, code=opt_code)
        elif not survey.is_paid:
            # Check if there is an active free plan available
            pricing_option = SurveyPricingOption.objects.filter(is_active=True, is_free=True).first()

        coupon_code = req_serializer.validated_data.get("coupon_code")
        coupon = None
        if coupon_code:
            try:
                coupon = Coupon.objects.get(code__iexact=coupon_code.strip())
            except Coupon.DoesNotExist:
                return Response(
                    {"detail": f"Coupon code '{coupon_code}' does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            SurveyService.publish_survey(survey, pricing_option=pricing_option, coupon=coupon)
        except DjangoValidationError as exc:
            msg = exc.messages[0] if hasattr(exc, "messages") else str(exc)
            if "limit" in msg.lower() or "payment" in msg.lower():
                return Response(
                    {
                        "detail": msg,
                        "code": "PAYMENT_REQUIRED",
                        "survey_id": str(survey.id),
                        "payment_order_url": f"/api/surveys/{survey.id}/payment/order/",
                        "pricing_options_url": "/api/surveys/pricing-options/",
                    },
                    status=status.HTTP_402_PAYMENT_REQUIRED,
                )
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        plan_name = survey.pricing_option.name if survey.pricing_option else "Standard"
        return Response(
            {
                "message": f"Survey '{survey.title}' is now published and active under the '{plan_name}' plan.",
                "status": survey.status,
                "is_paid": survey.is_paid,
                "pricing_option": survey.pricing_option.code if survey.pricing_option else None,
                "applied_coupon": survey.applied_coupon.code if survey.applied_coupon else None,
            },
            status=status.HTTP_200_OK,
        )


class SurveyCreatePaymentOrderView(APIView):
    """
    Creates a Razorpay payment order for the selected survey publishing pricing option.
    """

    permission_classes = [permissions.IsAuthenticated, IsSurveyOwnerOrStaff]

    @extend_schema(
        tags=["Surveys - Payments"],
        summary="Create a Razorpay order to pay for a selected pricing option",
        request=SurveyCreatePaymentOrderRequestSerializer,
        responses={
            status.HTTP_200_OK: SurveyPaymentOrderResponseSerializer,
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Survey already paid or error."),
        },
    )
    def post(self, request: Request, id: str) -> Response:
        survey = get_object_or_404(Survey, id=id)
        self.check_object_permissions(request, survey)

        if survey.status == Survey.Status.CLOSED:
            return Response(
                {
                    "detail": "Cannot create payment order for a closed survey.",
                    "code": "SURVEY_CLOSED",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if survey.is_paid:
            return Response(
                {"detail": "This survey is already paid and ready to publish."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        req_serializer = SurveyCreatePaymentOrderRequestSerializer(data=request.data or {})
        req_serializer.is_valid(raise_exception=True)
        opt_code = req_serializer.validated_data.get("pricing_option_code")
        opt_id = req_serializer.validated_data.get("pricing_option_id")
        coupon_code = req_serializer.validated_data.get("coupon_code")

        pricing_option = None
        if opt_id:
            pricing_option = get_object_or_404(SurveyPricingOption, id=opt_id)
        elif opt_code:
            pricing_option = get_object_or_404(SurveyPricingOption, code=opt_code)
        else:
            # Default to first active paid plan
            pricing_option = SurveyPricingOption.objects.filter(is_active=True, is_free=False).first()

        coupon = None
        if coupon_code:
            try:
                coupon = Coupon.objects.get(code__iexact=coupon_code.strip())
            except Coupon.DoesNotExist:
                return Response(
                    {"detail": f"Coupon code '{coupon_code}' does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            payment = RazorpayService.create_order(
                survey=survey,
                user=request.user,
                pricing_option=pricing_option,
                coupon=coupon,
            )
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        key_id, _, _ = RazorpayService.get_credentials()
        from decimal import Decimal
        discount_amount = (
            (pricing_option.price - payment.amount)
            if (pricing_option and payment.coupon)
            else Decimal("0.00")
        )
        data = {
            "order_id": payment.razorpay_order_id,
            "amount": payment.amount,
            "amount_paise": int(payment.amount * 100),
            "currency": payment.currency,
            "key_id": key_id,
            "survey_id": survey.id,
            "survey_title": survey.title,
            "pricing_option_code": pricing_option.code if pricing_option else "standard",
            "pricing_option_name": pricing_option.name if pricing_option else "Standard Plan",
            "coupon_code": payment.coupon.code if payment.coupon else None,
            "discount_amount": discount_amount,
        }
        return Response(data, status=status.HTTP_200_OK)


class SurveyCouponValidateView(APIView):
    """
    Validates a coupon code against a survey and intended pricing plan.
    Calculates the exact discount and final payable price.
    """

    permission_classes = [permissions.IsAuthenticated, IsSurveyOwnerOrStaff]

    @extend_schema(
        tags=["Surveys - Payments"],
        summary="Validate a coupon code and preview discount",
        request=CouponValidateRequestSerializer,
        responses={
            status.HTTP_200_OK: CouponValidateResponseSerializer,
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Coupon invalid, expired, or limit reached."),
        },
    )
    def post(self, request: Request, id: str) -> Response:
        survey = get_object_or_404(Survey, id=id)
        self.check_object_permissions(request, survey)

        serializer = CouponValidateRequestSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["coupon_code"]
        opt_code = serializer.validated_data.get("pricing_option_code")
        opt_id = serializer.validated_data.get("pricing_option_id")

        pricing_option = None
        if opt_id:
            pricing_option = get_object_or_404(SurveyPricingOption, id=opt_id)
        elif opt_code:
            pricing_option = get_object_or_404(SurveyPricingOption, code=opt_code)
        else:
            pricing_option = SurveyPricingOption.objects.filter(is_active=True, is_free=False).first()

        if not pricing_option:
            return Response(
                {"detail": "No active paid pricing option found to apply this coupon to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            coupon, discount_amount, final_price = CouponService.validate_coupon(
                code=code,
                user=request.user,
                pricing_option=pricing_option,
                survey=survey,
            )
        except DjangoValidationError as exc:
            msg = exc.messages[0] if hasattr(exc, "messages") else str(exc)
            return Response({"valid": False, "detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "valid": True,
                "coupon_code": coupon.code,
                "discount_type": coupon.discount_type,
                "discount_value": coupon.discount_value,
                "original_price": pricing_option.price,
                "discount_amount": discount_amount,
                "final_price": final_price,
                "currency": pricing_option.currency,
                "message": f"Coupon '{coupon.code}' applied! Discount of INR {discount_amount}.",
            },
            status=status.HTTP_200_OK,
        )


class SurveyVerifyPaymentView(APIView):
    """
    Verifies the Razorpay payment signature and marks the survey as paid.
    """

    permission_classes = [permissions.IsAuthenticated, IsSurveyOwnerOrStaff]

    @extend_schema(
        tags=["Surveys - Payments"],
        summary="Verify Razorpay payment signature and mark survey as paid",
        request=SurveyPaymentVerifySerializer,
        responses={
            status.HTTP_200_OK: OpenApiResponse(description="Payment verified successfully."),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Signature verification failed."),
        },
    )
    def post(self, request: Request, id: str) -> Response:
        survey = get_object_or_404(Survey, id=id)
        self.check_object_permissions(request, survey)

        serializer = SurveyPaymentVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payment = RazorpayService.verify_payment(
                survey=survey,
                user=request.user,
                razorpay_order_id=serializer.validated_data["razorpay_order_id"],
                razorpay_payment_id=serializer.validated_data["razorpay_payment_id"],
                razorpay_signature=serializer.validated_data["razorpay_signature"],
            )
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "status": "success",
                "message": "Payment verified successfully. You can now publish your survey.",
                "survey_id": str(survey.id),
                "is_paid": True,
                "payment_id": payment.razorpay_payment_id,
            },
            status=status.HTTP_200_OK,
        )


class RazorpayWebhookView(APIView):
    """
    Asynchronous Webhook listener called directly by Razorpay servers.
    Verifies X-Razorpay-Signature and marks payments/surveys as paid.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # No JWT needed from Razorpay server

    @extend_schema(
        tags=["Surveys - Payments"],
        summary="Razorpay server-to-server webhook callback",
        request=None,
        responses={
            status.HTTP_200_OK: OpenApiResponse(description="Webhook processed successfully."),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Signature verification failed."),
        },
    )
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        signature = request.headers.get("X-Razorpay-Signature") or request.META.get("HTTP_X_RAZORPAY_SIGNATURE", "")
        if not signature:
            return Response({"detail": "Missing X-Razorpay-Signature header."}, status=status.HTTP_400_BAD_REQUEST)

        raw_body = getattr(request, "_request", request).body
        client_ip = get_client_ip(request)
        headers_dict = {
            k: str(v)
            for k, v in request.headers.items()
            if k.lower() in ["x-razorpay-signature", "x-razorpay-event-id", "content-type", "user-agent"]
        }

        try:
            result = RazorpayService.process_webhook_event(
                raw_body=raw_body,
                received_signature=signature,
                headers=headers_dict,
                client_ip=client_ip,
            )
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"status": "ok", "result": result}, status=status.HTTP_200_OK)




class SurveyCloseView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSurveyOwnerOrStaff]

    @extend_schema(
        tags=["Surveys - Management"],
        summary="Close a survey (Stops accepting responses)",
        request=None,
        responses={status.HTTP_200_OK: OpenApiResponse(description="Survey closed successfully.")},
    )
    def post(self, request: Request, id: str) -> Response:
        survey = get_object_or_404(Survey, id=id)
        self.check_object_permissions(request, survey)
        SurveyService.close_survey(survey)
        return Response({"message": f"Survey '{survey.title}' is now closed."}, status=status.HTTP_200_OK)


class QuestionListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSurveyOwnerOrStaff]

    @extend_schema(
        tags=["Questions - Management"],
        summary="Add a question to a survey (with optional choices)",
        request=QuestionCreateSerializer,
        responses={status.HTTP_201_CREATED: QuestionSerializer},
    )
    def post(self, request: Request, id: str) -> Response:
        survey = get_object_or_404(Survey, id=id)
        self.check_object_permissions(request, survey)

        if not survey.can_edit_structure():
            return Response(
                {"detail": "Cannot add questions to a survey that already has recorded responses."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = QuestionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.save(survey=survey)
        return Response(QuestionSerializer(question).data, status=status.HTTP_201_CREATED)


class QuestionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSurveyOwnerOrStaff]

    @extend_schema(
        tags=["Questions - Management"],
        summary="Update a question",
        request=QuestionSerializer,
        responses={status.HTTP_200_OK: QuestionSerializer},
    )
    def patch(self, request: Request, id: str) -> Response:
        question = get_object_or_404(Question.objects.select_related("survey"), id=id)
        self.check_object_permissions(request, question)

        if not question.survey.can_edit_structure():
            return Response(
                {"detail": "Cannot modify questions for a closed survey or one with responses."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = QuestionSerializer(question, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["Questions - Management"],
        summary="Delete a question",
        responses={status.HTTP_204_NO_CONTENT: OpenApiResponse(description="Deleted.")},
    )
    def delete(self, request: Request, id: str) -> Response:
        question = get_object_or_404(Question.objects.select_related("survey"), id=id)
        self.check_object_permissions(request, question)

        if not question.survey.can_edit_structure():
            return Response(
                {"detail": "Cannot delete questions from a survey with existing responses."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        question.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class QuestionChoiceCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSurveyOwnerOrStaff]

    @extend_schema(
        tags=["Questions - Management"],
        summary="Add a choice option to a single or multiple choice question",
        request=QuestionChoiceSerializer,
        responses={status.HTTP_201_CREATED: QuestionChoiceSerializer},
    )
    def post(self, request: Request, id: str) -> Response:
        question = get_object_or_404(Question.objects.select_related("survey"), id=id)
        self.check_object_permissions(request, question)

        if not question.survey.can_edit_structure():
            return Response(
                {"detail": "Cannot add choices to a survey with existing responses."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if question.question_type not in [Question.QuestionType.SINGLE, Question.QuestionType.MULTIPLE]:
            return Response(
                {"detail": f"Choices can only be added to single or multiple choice questions, not {question.question_type}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = QuestionChoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        choice = serializer.save(question=question)
        return Response(QuestionChoiceSerializer(choice).data, status=status.HTTP_201_CREATED)


class QuestionChoiceDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSurveyOwnerOrStaff]

    @extend_schema(
        tags=["Questions - Management"],
        summary="Delete a choice option",
        responses={status.HTTP_204_NO_CONTENT: OpenApiResponse(description="Deleted.")},
    )
    def delete(self, request: Request, id: str) -> Response:
        choice = get_object_or_404(QuestionChoice.objects.select_related("question__survey"), id=id)
        self.check_object_permissions(request, choice)

        if not choice.question.survey.can_edit_structure():
            return Response(
                {"detail": "Cannot delete choices from a survey with existing responses."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        choice.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# -----------------------------------------------------------------
# Respondent Views
# -----------------------------------------------------------------

class PublicSurveyRetrieveView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=["Surveys - Participation"],
        summary="Get active published survey for answering",
        responses={
            status.HTTP_200_OK: SurveyDetailSerializer,
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Survey closed or inactive."),
            status.HTTP_403_FORBIDDEN: OpenApiResponse(description="Private survey requires authentication."),
        },
    )
    def get(self, request: Request, id: str) -> Response:
        survey = get_object_or_404(
            Survey.objects.select_related("created_by").prefetch_related(
                Prefetch("questions", queryset=Question.objects.prefetch_related("choices"))
            ),
            id=id,
        )

        if survey.visibility == Survey.Visibility.PRIVATE and not request.user.is_authenticated:
            return Response(
                {"detail": "This is a private survey. Please log in to participate."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not survey.is_active:
            return Response(
                {"detail": f"This survey is not currently active (Status: {survey.status})."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SurveyDetailSerializer(survey)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PublicSurveySubmitView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=["Surveys - Participation"],
        summary="Submit answers to an active survey (Authenticated or Anonymous)",
        request=SurveySubmitSerializer,
        responses={
            status.HTTP_201_CREATED: OpenApiResponse(description="Response recorded successfully."),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Validation error or duplicate submission."),
        },
    )
    def post(self, request: Request, id: str) -> Response:
        survey = get_object_or_404(Survey, id=id)
        client_ip = get_client_ip(request)

        serializer = SurveySubmitSerializer(
            data=request.data,
            context={"survey": survey, "request": request, "client_ip": client_ip},
        )
        serializer.is_valid(raise_exception=True)

        try:
            response_instance = SurveyService.submit_response(
                survey=survey,
                validated_answers=serializer.validated_data["validated_answers"],
                user=request.user if request.user.is_authenticated else None,
                client_ip=client_ip,
                session_id=request.session.session_key or "",
            )
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "message": "Thank you! Your survey responses have been submitted successfully.",
                "response_id": str(response_instance.id),
                "submitted_at": response_instance.submitted_at,
            },
            status=status.HTTP_201_CREATED,
        )


class MySubmissionsListView(generics.ListAPIView):
    """
    Returns all surveys and answers submitted by the currently authenticated user.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SurveyResponseDetailSerializer
    queryset = SurveyResponse.objects.none()

    @extend_schema(
        tags=["Surveys - Participation"],
        summary="View all surveys I have submitted",
        responses={status.HTTP_200_OK: SurveyResponseDetailSerializer(many=True)},
    )
    def get_queryset(self) -> Any:
        if getattr(self, "swagger_fake_view", False) or not self.request.user.is_authenticated:
            return SurveyResponse.objects.none()

        return (
            SurveyResponse.objects.filter(user=self.request.user)
            .select_related("survey", "user")
            .prefetch_related(
                Prefetch("answers", queryset=Answer.objects.select_related("question"))
            )
            .order_by("-submitted_at")
        )


# -----------------------------------------------------------------
# Analytics Views
# -----------------------------------------------------------------

class SurveyResponsesListView(generics.ListAPIView):
    """
    View all recorded submissions for a survey (Creator or Staff only).
    """

    permission_classes = [permissions.IsAuthenticated, IsSurveyOwnerOrStaff]
    serializer_class = SurveyResponseDetailSerializer
    queryset = SurveyResponse.objects.none()

    @extend_schema(
        tags=["Surveys - Analytics"],
        summary="List all responses to a survey (Creator or Staff only)",
    )
    def get_queryset(self) -> Any:
        if getattr(self, "swagger_fake_view", False) or "id" not in self.kwargs:
            return SurveyResponse.objects.none()

        survey_id = self.kwargs["id"]
        survey = get_object_or_404(Survey, id=survey_id)
        self.check_object_permissions(self.request, survey)

        return (
            SurveyResponse.objects.filter(survey=survey)
            .select_related("survey", "user")
            .prefetch_related(
                Prefetch("answers", queryset=Answer.objects.select_related("question"))
            )
            .order_by("-submitted_at")
        )


class SurveyAnalyticsView(APIView):
    """
    Returns aggregated statistical analysis of responses per question.
    """

    permission_classes = [permissions.IsAuthenticated, IsSurveyOwnerOrStaff]

    @extend_schema(
        tags=["Surveys - Analytics"],
        summary="Get survey statistical analytics & answer distributions",
        responses={status.HTTP_200_OK: OpenApiResponse(description="Survey analytics payload")},
    )
    def get(self, request: Request, id: str) -> Response:
        survey = get_object_or_404(Survey, id=id)
        self.check_object_permissions(request, survey)

        analytics = SurveyService.get_survey_analytics(survey)
        return Response(analytics, status=status.HTTP_200_OK)
