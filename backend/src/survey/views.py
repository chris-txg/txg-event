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
from survey.models import Answer, Question, QuestionChoice, Survey, SurveyResponse
from survey.permissions import IsSurveyOwnerOrStaff
from survey.serializers import (
    AnswerDetailSerializer,
    QuestionChoiceSerializer,
    QuestionCreateSerializer,
    QuestionSerializer,
    SurveyCreateUpdateSerializer,
    SurveyDetailSerializer,
    SurveyListSerializer,
    SurveyResponseDetailSerializer,
    SurveySubmitSerializer,
)
from survey.services import SurveyService


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


class SurveyPublishView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSurveyOwnerOrStaff]

    @extend_schema(
        tags=["Surveys - Management"],
        summary="Publish a survey (Opens it for responses)",
        request=None,
        responses={
            status.HTTP_200_OK: OpenApiResponse(description="Survey published successfully."),
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Cannot publish without questions."),
        },
    )
    def post(self, request: Request, id: str) -> Response:
        survey = get_object_or_404(Survey, id=id)
        self.check_object_permissions(request, survey)
        try:
            SurveyService.publish_survey(survey)
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": f"Survey '{survey.title}' is now published and active."}, status=status.HTTP_200_OK)


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
