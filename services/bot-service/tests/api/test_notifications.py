import uuid
from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import create_access_token
from db.models.notification import Notification
from db.models.user import User, UserRole
from main import app


@pytest.mark.asyncio
async def test_notifications_my_and_mark_read(db_session: AsyncSession) -> None:
    user = User(
        messenger_id=f"user_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
        name="کاربر تست اعلان",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    # Add 2 notifications
    n1 = Notification(
        user_id=user.id,
        title="تایید سفارش",
        message="سفارش شما تایید شد",
        is_read=False,
    )
    n2 = Notification(
        user_id=user.id,
        title="پاسخ تیکت",
        message="پاسخ به تیکت شما ارسال شد",
        is_read=False,
    )
    db_session.add_all([n1, n2])
    await db_session.commit()
    await db_session.refresh(n1)
    await db_session.refresh(n2)

    user_token = create_access_token(subject=str(user.id))
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Unauthenticated -> 401
        res_unauth = await client.get("/api/v1/notifications/my")
        assert res_unauth.status_code == 401

        # 2. Get my notifications -> 200
        res = await client.get(
            "/api/v1/notifications/my",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["unread_count"] == 2
        assert len(data["items"]) == 2

        # 3. Mark single notification as read
        res_read = await client.patch(
            f"/api/v1/notifications/{n1.id}/read",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res_read.status_code == 200
        assert res_read.json()["is_read"] is True

        # Check remaining unread count
        res_after = await client.get(
            "/api/v1/notifications/my",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res_after.json()["unread_count"] == 1

        # 4. Mark all as read
        res_all = await client.patch(
            "/api/v1/notifications/read-all",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res_all.status_code == 200
        assert res_all.json()["unread_count"] == 0
