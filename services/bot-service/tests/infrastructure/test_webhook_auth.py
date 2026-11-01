from typing import Any, Dict, Optional
import hashlib
import hmac
import pytest
from starlette.requests import Request

from infrastructure.security.webhook_auth import (
    HeaderTokenAuthenticator,
    HmacSignatureAuthenticator,
    PathTokenAuthenticator,
    WebhookSecurityRegistry,
)


def create_asgi_request(
    headers: Optional[Dict[str, str]] = None,
    query_string: str = "",
    body_bytes: bytes = b"",
) -> Request:
    """Helper creating a real Starlette Request instance for unit testing without mock typing mismatches."""
    raw_headers = [
        (k.lower().encode("latin-1"), v.encode("latin-1"))
        for k, v in (headers or {}).items()
    ]
    scope: Dict[str, Any] = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/webhooks/test",
        "headers": raw_headers,
        "query_string": query_string.encode("latin-1"),
    }

    async def receive() -> Dict[str, Any]:
        return {"type": "http.request", "body": body_bytes, "more_body": False}

    return Request(scope, receive)


@pytest.mark.asyncio
async def test_header_token_authenticator() -> None:
    auth = HeaderTokenAuthenticator()
    req = create_asgi_request(headers={"X-Telegram-Bot-Api-Secret-Token": "secret123"})
    assert await auth.authenticate(req, "telegram", "secret123") is True
    assert await auth.authenticate(req, "telegram", "wrongsecret") is False

    req_bearer = create_asgi_request(headers={"Authorization": "Bearer token456"})
    assert await auth.authenticate(req_bearer, "bale", "token456") is True


@pytest.mark.asyncio
async def test_path_token_authenticator() -> None:
    auth = PathTokenAuthenticator()
    req = create_asgi_request(query_string="token=querysecret")
    assert await auth.authenticate(req, "rubika", "querysecret") is True
    assert await auth.authenticate(req, "rubika", "wrong") is False


@pytest.mark.asyncio
async def test_hmac_signature_authenticator() -> None:
    secret = "hmac_secret_key"
    payload = b'{"update_id": 999, "text": "hello"}'
    valid_signature = hmac.new(
        secret.encode("utf-8"), payload, hashlib.sha256
    ).hexdigest()

    auth = HmacSignatureAuthenticator()
    req = create_asgi_request(
        headers={"X-Signature-SHA256": valid_signature}, body_bytes=payload
    )
    assert await auth.authenticate(req, "generic", secret) is True

    req_invalid = create_asgi_request(
        headers={"X-Signature-SHA256": "invalidsig"}, body_bytes=payload
    )
    assert await auth.authenticate(req_invalid, "generic", secret) is False


@pytest.mark.asyncio
async def test_webhook_security_registry_dynamic_strategies() -> None:
    registry = WebhookSecurityRegistry()
    registry.set_platform_secret("bale", "bale_special_key")
    registry.register_strategy("bale", HeaderTokenAuthenticator(["X-Bale-Secret"]))

    req_valid = create_asgi_request(headers={"X-Bale-Secret": "bale_special_key"})
    # Should not raise
    await registry.verify_request(req_valid, "bale")

    req_invalid = create_asgi_request(headers={"X-Bale-Secret": "wrong"})
    with pytest.raises(Exception):
        await registry.verify_request(req_invalid, "bale")
