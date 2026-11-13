from typing import Any
from rest_framework import permissions
from rest_framework.request import Request


class IsProjectOwnerOrStaff(permissions.BasePermission):
    """
    Allows access only to the EventProject owner or platform staff/admin users.
    """

    def has_object_permission(self, request: Request, view: Any, obj: Any) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or getattr(request.user, "role", None) in ["ADMIN", "SUPERADMIN"]:
            return True
        return obj.owner_id == request.user.id

