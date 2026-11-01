from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
import pytest

from core.exceptions import (
    AuthenticationError,
    ForbiddenError,
    InsufficientStockError,
    InvalidOrderError,
    NotFoundError,
)
from infrastructure.web.correlation import CorrelationIdMiddleware
from infrastructure.web.error_handlers import register_error_handlers


def _create_error_test_app() -> FastAPI:
    test_app = FastAPI()
    test_app.add_middleware(CorrelationIdMiddleware)
    register_error_handlers(test_app)

    @test_app.get("/error/not-found")
    async def route_not_found() -> None:
        raise NotFoundError("Product with ID 123 was not found.")

    @test_app.get("/error/insufficient-stock")
    async def route_insufficient_stock() -> None:
        raise InsufficientStockError(
            "Insufficient stock for product. Requested: 10, Available: 2."
        )

    @test_app.get("/error/invalid-order")
    async def route_invalid_order() -> None:
        raise InvalidOrderError("Order items cannot be empty.")

    @test_app.get("/error/unauthorized")
    async def route_unauthorized() -> None:
        raise AuthenticationError("Invalid security token provided.")

    @test_app.get("/error/forbidden")
    async def route_forbidden() -> None:
        raise ForbiddenError("User lacks required administrative privileges.")

    @test_app.get("/error/unhandled-500")
    async def route_unhandled() -> None:
        raise RuntimeError("Unexpected internal crash simulation.")

    return test_app


@pytest.mark.asyncio
async def test_rfc7807_not_found_error_mapping() -> None:
    app = _create_error_test_app()
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    ) as client:
        res = await client.get("/error/not-found")
        assert res.status_code == 404
        assert res.headers["content-type"] == "application/problem+json"
        assert "X-Correlation-ID" in res.headers

        data = res.json()
        assert data["status"] == 404
        assert data["code"] == "NOT_FOUND"
        assert data["title"] == "Resource Not Found"
        assert "Product with ID 123 was not found." in data["message"]
        assert "timestamp" in data
        assert "correlation_id" in data


@pytest.mark.asyncio
async def test_rfc7807_insufficient_stock_error_mapping() -> None:
    app = _create_error_test_app()
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    ) as client:
        res = await client.get("/error/insufficient-stock")
        assert res.status_code == 409
        data = res.json()
        assert data["status"] == 409
        assert data["code"] == "INSUFFICIENT_STOCK"
        assert "Requested: 10, Available: 2" in data["message"]


@pytest.mark.asyncio
async def test_rfc7807_authentication_and_forbidden_error_mapping() -> None:
    app = _create_error_test_app()
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    ) as client:
        res_auth = await client.get("/error/unauthorized")
        assert res_auth.status_code == 401
        assert res_auth.json()["code"] == "UNAUTHORIZED"

        res_forbid = await client.get("/error/forbidden")
        assert res_forbid.status_code == 403
        assert res_forbid.json()["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_rfc7807_unhandled_500_sanitized_response() -> None:
    app = _create_error_test_app()
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    ) as client:
        res = await client.get("/error/unhandled-500")
        assert res.status_code == 500
        data = res.json()
        assert data["status"] == 500
        assert data["code"] == "INTERNAL_SERVER_ERROR"
        # Verify internal implementation details (e.g. traceback/RuntimeError) are NOT leaked
        assert "Unexpected internal crash simulation" not in data["message"]
        assert "correlation_id" in data
        assert data["details"] is None
