from typing import Any
from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import APIView


class IsSurveyOwnerOrStaff(permissions.BasePermission):
    """
    Custom permission to only allow creators of a survey (or staff/superadmins) to edit or manage it.
    """

    def has_object_permission(self, request: Request, view: APIView, obj: Any) -> bool:
        if request.user.is_staff or getattr(request.user, "role", None) in ["ADMIN", "SUPERADMIN"]:
            return True

        # If checking survey directly
        if hasattr(obj, "created_by"):
            return obj.created_by == request.user

        # If checking question or choice
        if hasattr(obj, "survey"):
            return obj.survey.created_by == request.user

        if hasattr(obj, "question"):
            return obj.question.survey.created_by == request.user

        return False

