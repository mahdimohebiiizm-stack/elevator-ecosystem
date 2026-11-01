import uuid
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

CORRELATION_ID_HEADER: str = "X-Correlation-ID"


def get_correlation_id(request: Request) -> str:
    """
    Extracts the correlation ID from request state, fallback to headers or generates a new UUID.
    """
    if hasattr(request.state, "correlation_id") and request.state.correlation_id:
        return str(request.state.correlation_id)

    header_val = request.headers.get(CORRELATION_ID_HEADER) or request.headers.get(
        "X-Request-ID"
    )
    if header_val:
        return header_val

    return str(uuid.uuid4())


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware ensuring every HTTP request carries a unique Correlation ID for distributed tracing.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        correlation_id = get_correlation_id(request)
        request.state.correlation_id = correlation_id

        response: Response = await call_next(request)
        response.headers[CORRELATION_ID_HEADER] = correlation_id
        return response
