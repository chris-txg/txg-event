import os
from typing import Any
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from projects.models import EventProject, EventProjectDocument
from projects.permissions import IsProjectOwnerOrStaff
from projects.serializers import (
    EventProjectCreateUpdateSerializer,
    EventProjectDetailSerializer,
    EventProjectListSerializer,
)
from survey.models import Survey
from survey.serializers import SurveyListSerializer


class EventProjectListCreateView(generics.ListCreateAPIView):
    """
    List user's event projects or create a new Event Project (Draft or Created).
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self) -> Any:
        if self.request.method == "POST":
            return EventProjectCreateUpdateSerializer
        return EventProjectListSerializer

    def get_queryset(self) -> Any:
        if getattr(self, "swagger_fake_view", False) or not self.request.user.is_authenticated:
            return EventProject.objects.none()

        user = self.request.user
        qs = EventProject.objects.select_related("owner").annotate(
            survey_count=Count("surveys", distinct=True),
            document_count=Count("documents", distinct=True),
        )
        if not (user.is_staff or getattr(user, "role", None) in ["ADMIN", "SUPERADMIN"]):
            qs = qs.filter(owner=user)

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(project_name__icontains=search)
                | Q(event_city__icontains=search)
                | Q(event_category__icontains=search)
            )
        return qs

    @extend_schema(
        tags=["Projects"],
        summary="List event projects",
        parameters=[
            OpenApiParameter(name="status", description="Filter by status (draft, created)", required=False, type=str),
            OpenApiParameter(name="search", description="Search by project name, city, or category", required=False, type=str),
        ],
    )
    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return super().get(request, *args, **kwargs)

    @extend_schema(
        tags=["Projects"],
        summary="Create a new Event Project (Draft or Created)",
        request=EventProjectCreateUpdateSerializer,
        responses={
            status.HTTP_201_CREATED: EventProjectDetailSerializer,
            status.HTTP_400_BAD_REQUEST: OpenApiResponse(description="Validation error."),
        },
    )
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save(owner=request.user)
        detail = EventProject.objects.select_related("owner").prefetch_related("documents").annotate(
            survey_count=Count("surveys", distinct=True),
        ).get(pk=project.pk)
        return Response(
            EventProjectDetailSerializer(detail, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class EventProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete an Event Project owned by the authenticated user.
    """

    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrStaff]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = "id"

    def get_serializer_class(self) -> Any:
        if self.request.method in ["PUT", "PATCH"]:
            return EventProjectCreateUpdateSerializer
        return EventProjectDetailSerializer

    def get_queryset(self) -> Any:
        if getattr(self, "swagger_fake_view", False):
            return EventProject.objects.none()
        return EventProject.objects.select_related("owner").prefetch_related("documents").annotate(
            survey_count=Count("surveys", distinct=True),
        )

    @extend_schema(tags=["Projects"], summary="Retrieve event project details")
    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return super().get(request, *args, **kwargs)

    @extend_schema(tags=["Projects"], summary="Update an event project", responses={200: EventProjectDetailSerializer})
    def patch(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        detail = self.get_queryset().get(pk=instance.pk)
        return Response(EventProjectDetailSerializer(detail, context={"request": request}).data)

    @extend_schema(tags=["Projects"], summary="Replace an event project", responses={200: EventProjectDetailSerializer})
    def put(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        detail = self.get_queryset().get(pk=instance.pk)
        return Response(EventProjectDetailSerializer(detail, context={"request": request}).data)

    @extend_schema(tags=["Projects"], summary="Delete an event project")
    def delete(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return super().delete(request, *args, **kwargs)


class EventProjectDocumentDeleteView(APIView):
    """Delete a supporting document attached to an Event Project."""

    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrStaff]

    @extend_schema(
        tags=["Projects"],
        summary="Delete a supporting document from an event project",
        responses={204: OpenApiResponse(description="Document deleted.")},
    )
    def delete(self, request: Request, id: Any, doc_id: Any, *args: Any, **kwargs: Any) -> Response:
        project = get_object_or_404(EventProject, id=id)
        self.check_object_permissions(request, project)
        doc = get_object_or_404(EventProjectDocument, id=doc_id, project=project)

        file_path = None
        if doc.file:
            try:
                file_path = doc.file.path
            except (ValueError, OSError):
                file_path = None

        doc.delete()
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

        return Response(status=status.HTTP_204_NO_CONTENT)


class EventProjectSurveysListView(generics.ListAPIView):
    """List all surveys belonging to a specific Event Project."""

    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrStaff]
    serializer_class = SurveyListSerializer

    def get_queryset(self) -> Any:
        if getattr(self, "swagger_fake_view", False) or "id" not in self.kwargs:
            return Survey.objects.none()
        project = get_object_or_404(EventProject, id=self.kwargs["id"])
        self.check_object_permissions(self.request, project)
        return Survey.objects.filter(project=project).select_related("created_by", "project")

    @extend_schema(tags=["Projects"], summary="List surveys linked to an event project")
    def get(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return super().get(request, *args, **kwargs)

