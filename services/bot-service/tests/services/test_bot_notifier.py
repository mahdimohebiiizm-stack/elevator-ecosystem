from unittest.mock import AsyncMock, patch
import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.services.bot_notifier import BotNotificationService
from db.models.user import User, UserRole


@pytest.mark.asyncio
async def test_bot_notifier_send_to_user_safe_failure_handling() -> None:
    """
    Critical Architecture Rule:
    Outgoing HTTP requests MUST NOT raise exceptions that abort transactions,
    even when network times out or user blocked the bot.
    """
    user_with_tg = User(
        messenger_id=f"tg_user_{uuid.uuid4().hex[:6]}",
        phone="09121110000",
        telegram_id="12345678",
        role=UserRole.CUSTOMER,
    )

    with patch("httpx.AsyncClient.post", side_effect=Exception("Network Timeout")):
        # Should not raise exception
        success = await BotNotificationService.send_to_user(
            user_with_tg, "پیام تست سامانه"
        )
        assert success is False


@pytest.mark.asyncio
async def test_bot_notifier_send_to_user_success_mock(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "dummy_tg_token")
    monkeypatch.setenv("BALE_BOT_TOKEN", "dummy_bale_token")
    user_with_tg = User(
        messenger_id=f"tg_user_{uuid.uuid4().hex[:6]}",
        phone="09121110001",
        telegram_id="87654321",
        bale_id="998877",
        role=UserRole.CUSTOMER,
    )

    mock_resp = AsyncMock()
    mock_resp.is_success = True
    mock_resp.status_code = 200

    with patch("httpx.AsyncClient.post", return_value=mock_resp):
        success = await BotNotificationService.send_to_user(
            user_with_tg, "پیام تاییدیه سرویس"
        )
        assert success is True


@pytest.mark.asyncio
async def test_bot_notifier_notify_admins(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "dummy_tg_token")
    admin_user = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:6]}",
        phone=f"0913{uuid.uuid4().int % 10000000:07d}",
        name="مدیر تست نوتیفیکیشن",
        role=UserRole.ADMIN,
        telegram_id=str(uuid.uuid4().int % 10000000),
    )
    db_session.add(admin_user)
    await db_session.commit()

    mock_resp = AsyncMock()
    mock_resp.is_success = True

    with patch("httpx.AsyncClient.post", return_value=mock_resp):
        notified = await BotNotificationService.notify_admins(
            "آلارم فوری برای مدیران", db_session
        )
        assert notified >= 1
