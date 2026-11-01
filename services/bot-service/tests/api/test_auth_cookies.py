import uuid
from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from main import app


@pytest.mark.asyncio
async def test_auth_httponly_cookie_flow(db_session: AsyncSession) -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        messenger_id = f"web_user_{uuid.uuid4().hex[:8]}"
        payload = {
            "messenger_id": messenger_id,
            "phone": "+989129998877",
        }

        # 1. Login should return 200 and set HttpOnly access_token cookie
        login_res = await client.post("/api/v1/users/login", json=payload)
        assert login_res.status_code == 200
        assert "access_token" in login_res.cookies
        cookie_header = login_res.headers.get("set-cookie", "")
        assert "HttpOnly" in cookie_header or "httponly" in cookie_header.lower()

        # 2. Authenticated /me request using HttpOnly cookie in client
        me_res = await client.get("/api/v1/users/me")
        assert me_res.status_code == 200
        user_data = me_res.json()
        assert user_data["messenger_id"] == messenger_id
        assert user_data["phone"] == "+989129998877"

        # 3. Logout should clear cookie
        logout_res = await client.post("/api/v1/users/logout")
        assert logout_res.status_code == 200

        # Create a new unauthenticated client to verify 401 without cookie
        async with AsyncClient(transport=transport, base_url="http://test") as fresh_client:
            unauth_res = await fresh_client.get("/api/v1/users/me")
            assert unauth_res.status_code == 401
            assert unauth_res.json()["code"] == "UNAUTHORIZED"
