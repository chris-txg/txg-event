import uuid
import contextvars
from typing import Callable, Optional
from django.http import HttpRequest, HttpResponse

# Context variables for thread-safe context propagation across service layers and audit
_correlation_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("correlation_id", default="")
_current_user_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_user_id", default=None)


def get_current_correlation_id() -> str:
    return _correlation_id_ctx.get()


def get_current_user_id() -> Optional[str]:
    return _current_user_ctx.get()


class RequestCorrelationMiddleware:
    """
    Enterprise middleware to:
    1. Extract or generate an X-Request-ID / Correlation ID for distributed tracing.
    2. Attach correlation ID to request and response headers.
    3. Store correlation ID and authenticated user in contextvars for deep service attribution.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        correlation_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.correlation_id = correlation_id
        corr_token = _correlation_id_ctx.set(correlation_id)

        response = self.get_response(request)

        # Propagate user id if authenticated
        if hasattr(request, "user") and request.user.is_authenticated:
            _current_user_ctx.set(str(request.user.id))

        response["X-Request-ID"] = correlation_id
        _correlation_id_ctx.reset(corr_token)
        return response

