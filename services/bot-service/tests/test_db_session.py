from typing import AsyncGenerator
from unittest.mock import AsyncMock, patch
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient

from db.session import get_db


@pytest.mark.asyncio
async def test_get_db_session_lifecycle() -> None:
    """
    Test that get_db yields session, commits on clean exit, and closes on finally.
    """
    mock_session = AsyncMock(spec=AsyncSession)

    with patch("db.session.AsyncSessionLocal") as mock_session_local:
        # Configure context manager for AsyncSessionLocal
        mock_session_local.return_value.__aenter__.return_value = mock_session

        generator = get_db()
        session = await anext(generator)
        assert session is mock_session

        # Finish generator without errors -> should commit
        try:
            await anext(generator)
        except StopAsyncIteration:
            pass

        mock_session.commit.assert_awaited_once()
        mock_session.close.assert_awaited_once()
        mock_session.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_db_session_rollback_on_error() -> None:
    """
    Test that get_db rolls back the session when an unhandled exception occurs.
    """
    mock_session = AsyncMock(spec=AsyncSession)

    with patch("db.session.AsyncSessionLocal") as mock_session_local:
        mock_session_local.return_value.__aenter__.return_value = mock_session

        generator = get_db()
        session = await anext(generator)
        assert session is mock_session

        # Throw an exception into the generator
        with pytest.raises(RuntimeError, match="Database error occurred"):
            await generator.athrow(RuntimeError("Database error occurred"))

        mock_session.rollback.assert_awaited_once()
        mock_session.close.assert_awaited_once()
        mock_session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_db_mockability_in_fastapi_dependency_injection() -> None:
    """
    Demonstrate that get_db can be easily mocked in routes via dependency_overrides (TDD readiness).
    """
    test_app = FastAPI()
    mock_session = AsyncMock(spec=AsyncSession)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield mock_session

    test_app.dependency_overrides[get_db] = override_get_db

    @test_app.get("/test-db-injection")
    async def sample_endpoint(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
        assert db is mock_session
        return {"status": "injected"}

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/test-db-injection")
        assert response.status_code == 200
        assert response.json() == {"status": "injected"}
