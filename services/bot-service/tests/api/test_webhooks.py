from httpx import ASGITransport, AsyncClient
import pytest

from core.config import settings
from infrastructure.idempotency.storage import (
    InMemoryIdempotencyStorage,
    set_idempotency_storage,
)
from infrastructure.security.webhook_auth import webhook_security_registry
from main import app


@pytest.fixture(autouse=True)
def reset_idempotency_and_security() -> None:
    """Ensure clean idempotency storage and security registry for each test."""
    set_idempotency_storage(InMemoryIdempotencyStorage())
    webhook_security_registry.set_platform_secret("telegram", "test-telegram-secret")


@pytest.mark.asyncio
async def test_webhook_ingest_successful_and_idempotent_replay() -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"X-Telegram-Bot-Api-Secret-Token": "test-telegram-secret"}
        payload = {
            "update_id": 880011,
            "message": {
                "from": {"id": 1234567},
                "text": "/start",
            },
        }

        # First request: new update_id -> processed: True
        res_1 = await client.post(
            "/api/v1/webhooks/telegram", json=payload, headers=headers
        )
        assert res_1.status_code == 200
        data_1 = res_1.json()
        assert data_1["status"] == "ok"
        assert data_1["update_id"] == 880011
        assert data_1["processed"] is True

        # Second request (Replay): same update_id -> returns 200 OK immediately with processed: False
        res_2 = await client.post(
            "/api/v1/webhooks/telegram", json=payload, headers=headers
        )
        assert res_2.status_code == 200
        data_2 = res_2.json()
        assert data_2["status"] == "ok"
        assert data_2["update_id"] == 880011
        assert data_2["processed"] is False
        assert "without reprocessing" in data_2["message"]


@pytest.mark.asyncio
async def test_webhook_ingest_unauthorized_token() -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"X-Telegram-Bot-Api-Secret-Token": "wrong-secret-token"}
        payload = {"update_id": 880022}

        res = await client.post(
            "/api/v1/webhooks/telegram", json=payload, headers=headers
        )
        assert res.status_code == 401
        assert res.headers["content-type"] == "application/problem+json"

        data = res.json()
        assert data["code"] == "UNAUTHORIZED"
        assert data["status"] == 401
        assert "Invalid security token" in data["message"]


@pytest.mark.asyncio
async def test_webhook_path_token_authentication_strategy() -> None:
    webhook_security_registry.set_platform_secret("rubika", "rubika-secret-key")
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {"update_id": 990033}

        # Query param strategy (?token=...)
        res = await client.post(
            "/api/v1/webhooks/rubika?token=rubika-secret-key", json=payload
        )
        assert res.status_code == 200
        assert res.json()["processed"] is True
