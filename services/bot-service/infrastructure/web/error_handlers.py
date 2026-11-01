from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.exceptions import (
    AppError,
    AuthenticationError,
    ForbiddenError,
    InsufficientStockError,
    InvalidOrderError,
    InvalidPaymentError,
    LockAcquisitionError,
    NotFoundError,
    PaymentProviderError,
)
from infrastructure.web.correlation import get_correlation_id

logger = logging.getLogger("shopbot_backend.errors")


def create_rfc7807_problem_response(
    status_code: int,
    code: str,
    title: str,
    message: str,
    request: Request,
    details: Optional[Any] = None,
) -> JSONResponse:
    """
    Constructs an RFC 7807 (Problem Details for HTTP APIs) compliant JSONResponse.
    Ensures consistent error envelope formatting across all domain, application, and system exceptions.
    """
    correlation_id = get_correlation_id(request)
    timestamp = datetime.now(timezone.utc).isoformat()

    content: Dict[str, Any] = {
        "type": f"https://api.shopbot.com/errors/{code.lower()}",
        "title": title,
        "status": status_code,
        "code": code,
        "message": message,
        "details": details,
        "timestamp": timestamp,
        "path": request.url.path,
        "correlation_id": correlation_id,
    }

    return JSONResponse(
        status_code=status_code,
        content=content,
        headers={
            "Content-Type": "application/problem+json",
            "X-Correlation-ID": correlation_id,
        },
    )


def register_error_handlers(app: FastAPI) -> None:
    """
    Registers centralized RFC 7807 exception handlers on the FastAPI application instance.
    Enables Zero Try-Catch architecture in presentation layer routers.
    """

    @app.exception_handler(NotFoundError)
    async def not_found_exception_handler(
        request: Request, exc: NotFoundError
    ) -> JSONResponse:
        return create_rfc7807_problem_response(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            title="Resource Not Found",
            message=exc.message,
            request=request,
            details=exc.details,
        )

    @app.exception_handler(InsufficientStockError)
    async def insufficient_stock_exception_handler(
        request: Request, exc: InsufficientStockError
    ) -> JSONResponse:
        return create_rfc7807_problem_response(
            status_code=status.HTTP_409_CONFLICT,
            code="INSUFFICIENT_STOCK",
            title="Insufficient Inventory",
            message=exc.message,
            request=request,
            details=exc.details,
        )

    @app.exception_handler(LockAcquisitionError)
    async def lock_acquisition_error_handler(
        request: Request, exc: LockAcquisitionError
    ) -> JSONResponse:
        return create_rfc7807_problem_response(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="RESOURCE_LOCKED",
            title="Resource Temporarily Locked",
            message=exc.message,
            request=request,
            details=exc.details,
        )

    @app.exception_handler(InvalidOrderError)
    async def invalid_order_exception_handler(
        request: Request, exc: InvalidOrderError
    ) -> JSONResponse:
        return create_rfc7807_problem_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_ORDER",
            title="Invalid Order Request",
            message=exc.message,
            request=request,
            details=exc.details,
        )

    @app.exception_handler(AuthenticationError)
    async def authentication_error_handler(
        request: Request, exc: AuthenticationError
    ) -> JSONResponse:
        return create_rfc7807_problem_response(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="UNAUTHORIZED",
            title="Authentication Failed",
            message=exc.message,
            request=request,
            details=exc.details,
        )

    @app.exception_handler(ForbiddenError)
    async def forbidden_error_handler(
        request: Request, exc: ForbiddenError
    ) -> JSONResponse:
        return create_rfc7807_problem_response(
            status_code=status.HTTP_403_FORBIDDEN,
            code="FORBIDDEN",
            title="Forbidden Access",
            message=exc.message,
            request=request,
            details=exc.details,
        )

    @app.exception_handler(PaymentProviderError)
    async def payment_provider_error_handler(
        request: Request, exc: PaymentProviderError
    ) -> JSONResponse:
        return create_rfc7807_problem_response(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="PAYMENT_GATEWAY_ERROR",
            title="Payment Gateway Error",
            message=exc.message,
            request=request,
            details=exc.details,
        )

    @app.exception_handler(InvalidPaymentError)
    async def invalid_payment_error_handler(
        request: Request, exc: InvalidPaymentError
    ) -> JSONResponse:
        return create_rfc7807_problem_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_PAYMENT",
            title="Invalid Payment Request",
            message=exc.message,
            request=request,
            details=exc.details,
        )

    @app.exception_handler(AppError)
    async def general_app_error_handler(
        request: Request, exc: AppError
    ) -> JSONResponse:
        return create_rfc7807_problem_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="APPLICATION_ERROR",
            title="Application Error",
            message=exc.message,
            request=request,
            details=exc.details,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        formatted_errors: List[Dict[str, Any]] = []
        for error in exc.errors():
            formatted_errors.append(
                {
                    "loc": [str(x) for x in error.get("loc", [])],
                    "msg": error.get("msg", ""),
                    "type": error.get("type", ""),
                }
            )

        return create_rfc7807_problem_response(
            status_code=422,
            code="VALIDATION_ERROR",
            title="Request Validation Error",
            message="The submitted payload failed data contract validation.",
            request=request,
            details=formatted_errors,
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return create_rfc7807_problem_response(
            status_code=exc.status_code,
            code=f"HTTP_{exc.status_code}",
            title="HTTP Error",
            message=str(exc.detail),
            request=request,
            details=None,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        correlation_id = get_correlation_id(request)
        logger.critical(
            f"Unhandled system error [Correlation-ID: {correlation_id}] "
            f"during {request.method} {request.url.path}: {exc}",
            exc_info=True,
            extra={"correlation_id": correlation_id},
        )

        return create_rfc7807_problem_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INTERNAL_SERVER_ERROR",
            title="Internal Server Error",
            message="An unexpected server error occurred. Please reference the correlation ID for support.",
            request=request,
            details=None,
        )
