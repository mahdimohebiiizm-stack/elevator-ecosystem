import pytest
from httpx import ASGITransport, AsyncClient
from main import app


@pytest.mark.asyncio
async def test_health_check_endpoint(async_client: AsyncClient) -> None:
    """
    Ensure the /health endpoint returns HTTP 200 and valid health status.
    """
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["project"] == "ShopBot Backend"
    assert "environment" in data


@pytest.mark.asyncio
async def test_openapi_documentation_accessible(async_client: AsyncClient) -> None:
    """
    Ensure the OpenAPI schema is available at the configured prefix.
    """
    response = await async_client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert data["info"]["title"] == "ShopBot Backend"


@pytest.mark.asyncio
async def test_global_exception_handler() -> None:
    """
    Ensure unhandled exceptions are caught by the global exception handler skeleton
    and return HTTP 500 with a structured JSON response without crashing the application.
    """

    @app.get("/test-error-endpoint")
    async def error_endpoint() -> None:
        raise ValueError("Simulated unexpected failure")

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/test-error-endpoint")
        assert response.status_code == 500
        data = response.json()
        assert data["status"] == 500
        assert data["code"] == "INTERNAL_SERVER_ERROR"
        assert "An unexpected server error occurred" in data["message"]
        assert data["path"] == "/test-error-endpoint"
        assert "correlation_id" in data
