import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import create_access_token
from db.models.user import User, UserRole
from main import app


@pytest.mark.asyncio
async def test_admin_notify_user_permissions(db_session: AsyncSession) -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Unauthenticated -> 401
        res_unauth = await client.post(
            "/api/v1/admin/notify-user",
            json={"user_id": str(uuid.uuid4()), "message": "سلام"},
        )
        assert res_unauth.status_code == 401

        # 2. Customer user (Non-admin) -> 403
        customer = User(
            phone=f"+98912{uuid.uuid4().hex[:7]}",
            role=UserRole.CUSTOMER,
            messenger_id=f"cust_{uuid.uuid4().hex[:6]}",
        )
        db_session.add(customer)
        await db_session.commit()
        await db_session.refresh(customer)

        customer_token = create_access_token(
            subject=str(customer.id),
            extra_claims={"role": "CUSTOMER", "phone": customer.phone},
        )
        res_cust = await client.post(
            "/api/v1/admin/notify-user",
            json={"user_id": str(customer.id), "message": "سلام"},
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert res_cust.status_code == 403


@pytest.mark.asyncio
async def test_admin_notify_user_success(
    db_session: AsyncSession, monkeypatch
) -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin = User(
            phone=f"+98913{uuid.uuid4().hex[:7]}",
            role=UserRole.ADMIN,
            messenger_id=f"admin_{uuid.uuid4().hex[:6]}",
        )
        target_user = User(
            phone=f"+98935{uuid.uuid4().hex[:7]}",
            name="علی کرمانی",
            role=UserRole.CUSTOMER,
            telegram_id=str(uuid.uuid4().int)[:10],
            messenger_id=f"cust_{uuid.uuid4().hex[:6]}",
        )
        db_session.add_all([admin, target_user])
        await db_session.commit()
        await db_session.refresh(admin)
        await db_session.refresh(target_user)

        admin_token = create_access_token(
            subject=str(admin.id),
            extra_claims={"role": "ADMIN", "phone": admin.phone},
        )

        # Mock BotNotificationService.send_to_user
        from api.v1.services.bot_notifier import BotNotificationService

        async def mock_send(user, text):
            return True

        monkeypatch.setattr(BotNotificationService, "send_to_user", mock_send)

        # Dispatch message
        res = await client.post(
            "/api/v1/admin/notify-user",
            json={
                "user_id": str(target_user.id),
                "message": "پیش‌فاکتور آسانسور آماده است.",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["user_id"] == str(target_user.id)
        assert data["has_telegram"] is True
        assert data["bot_dispatched"] is True

        # Verify dual-channel persistence: In-app Notification was persisted in database
        from sqlalchemy import select
        from db.models.notification import Notification

        notif_stmt = select(Notification).where(Notification.user_id == target_user.id)
        notif_res = await db_session.execute(notif_stmt)
        notif_record = notif_res.scalar_one_or_none()
        assert notif_record is not None
        assert notif_record.message == "پیش‌فاکتور آسانسور آماده است."
        assert notif_record.title == "پیام مستقیم مدیریت آسانرو"
