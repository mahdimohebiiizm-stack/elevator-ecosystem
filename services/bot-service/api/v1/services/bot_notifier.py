import logging
import os
from typing import Any, List, Optional
from dotenv import load_dotenv
import httpx
import requests
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from core.config import settings
from db.models.user import User, UserRole

load_dotenv()

logger = logging.getLogger("shopbot_backend.services.bot_notifier")


class BotNotificationService:
    """
    Proactive Omnichannel Bot Notification Service for Telegram and Bale.
    Dispatches outbound push notifications to users and administrators
    without ever disrupting or rolling back active database transactions.
    """

    @staticmethod
    def _get_tokens() -> tuple[str, str]:
        telegram_token = (
            os.getenv("TELEGRAM_BOT_TOKEN")
            or getattr(settings, "TELEGRAM_BOT_TOKEN", "")
            or ""
        ).strip().strip('"').strip("'")
        bale_token = (
            os.getenv("BALE_BOT_TOKEN")
            or getattr(settings, "BALE_BOT_TOKEN", "")
            or ""
        ).strip().strip('"').strip("'")
        return telegram_token, bale_token

    @classmethod
    async def send_to_user(cls, user: User, text: str) -> bool:
        """
        Asynchronously sends outbound message to the user on Telegram and/or Bale.
        Guaranteed to never raise an exception that aborts database transactions.
        """
        if not user:
            logger.warning("[BotNotifier] Received null user for notification dispatch.")
            return False

        telegram_token, bale_token = cls._get_tokens()
        dispatched_any = False

        # Extract Telegram Chat ID (with fallback to numeric messenger_id)
        telegram_chat_id = user.telegram_id
        if not telegram_chat_id and user.messenger_id and (
            user.messenger_id.startswith("tg_") or user.messenger_id.startswith("telegram_")
        ):
            potential_id = user.messenger_id.split("_")[-1]
            if potential_id.isdigit():
                telegram_chat_id = potential_id

        # Extract Bale Chat ID (with fallback to numeric messenger_id)
        bale_chat_id = user.bale_id
        if not bale_chat_id and user.messenger_id and user.messenger_id.startswith("bale_"):
            potential_id = user.messenger_id.split("_")[-1]
            if potential_id.isdigit():
                bale_chat_id = potential_id

        # 1. Telegram Dispatch
        if telegram_chat_id and telegram_token:
            endpoint = f"https://api.telegram.org/bot{telegram_token}/sendMessage"
            payload = {
                "chat_id": telegram_chat_id,
                "text": text,
            }
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(endpoint, json=payload)
                    if resp.is_success:
                        dispatched_any = True
                        logger.info(
                            f"[BotNotifier] Telegram message sent to user {user.id} ({user.phone})"
                        )
                    else:
                        logger.warning(
                            f"[BotNotifier] Telegram API returned status {resp.status_code}: {resp.text}"
                        )
            except Exception as exc:
                logger.error(
                    f"[BotNotifier] Non-fatal error sending Telegram notification to {user.id}: {exc}"
                )

        # 2. Bale Dispatch
        if bale_chat_id and bale_token:
            endpoint = f"https://tapi.bale.ai/bot{bale_token}/sendMessage"
            payload = {
                "chat_id": bale_chat_id,
                "text": text,
            }
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(endpoint, json=payload)
                    if resp.is_success:
                        dispatched_any = True
                        logger.info(
                            f"[BotNotifier] Bale message sent to user {user.id} ({user.phone})"
                        )
                    else:
                        logger.warning(
                            f"[BotNotifier] Bale API returned status {resp.status_code}: {resp.text}"
                        )
            except Exception as exc:
                logger.error(
                    f"[BotNotifier] Non-fatal error sending Bale notification to {user.id}: {exc}"
                )

        if not user.telegram_id and not user.bale_id:
            logger.info(
                f"[BotNotifier] User {user.id} ({user.phone}) has neither telegram_id nor bale_id, skipping push."
            )

        return dispatched_any

    @classmethod
    def send_to_user_sync(cls, user: User, text: str) -> bool:
        """
        Synchronous fallback using requests.post for blocking/sync execution contexts.
        Guaranteed to never raise an exception that aborts database transactions.
        """
        if not user:
            return False

        telegram_token, bale_token = cls._get_tokens()
        dispatched_any = False

        # Extract Telegram Chat ID
        telegram_chat_id = user.telegram_id
        if not telegram_chat_id and user.messenger_id and (
            user.messenger_id.startswith("tg_") or user.messenger_id.startswith("telegram_")
        ):
            potential_id = user.messenger_id.split("_")[-1]
            if potential_id.isdigit():
                telegram_chat_id = potential_id

        # Extract Bale Chat ID
        bale_chat_id = user.bale_id
        if not bale_chat_id and user.messenger_id and user.messenger_id.startswith("bale_"):
            potential_id = user.messenger_id.split("_")[-1]
            if potential_id.isdigit():
                bale_chat_id = potential_id

        if telegram_chat_id and telegram_token:
            endpoint = f"https://api.telegram.org/bot{telegram_token}/sendMessage"
            payload = {"chat_id": telegram_chat_id, "text": text}
            try:
                resp = requests.post(endpoint, json=payload, timeout=8.0)
                if resp.status_code < 400:
                    dispatched_any = True
            except Exception as exc:
                logger.error(f"[BotNotifier Sync] Telegram error: {exc}")

        if bale_chat_id and bale_token:
            endpoint = f"https://tapi.bale.ai/bot{bale_token}/sendMessage"
            payload = {"chat_id": bale_chat_id, "text": text}
            try:
                resp = requests.post(endpoint, json=payload, timeout=8.0)
                if resp.status_code < 400:
                    dispatched_any = True
            except Exception as exc:
                logger.error(f"[BotNotifier Sync] Bale error: {exc}")

        return dispatched_any

    @classmethod
    async def notify_admins(cls, text: str, session: Any) -> int:
        """
        Fetches all users with role == 'ADMIN' and broadcasts notification text to each.
        Compatible with both AsyncSession and IUnitOfWork.
        """
        try:
            real_session = getattr(session, "session", session)
            stmt = select(User).where(User.role == UserRole.ADMIN)
            res = await real_session.execute(stmt)
            admins = res.scalars().all()

            notified_count = 0
            for admin in admins:
                sent = await cls.send_to_user(admin, text)
                if sent:
                    notified_count += 1
            return notified_count
        except Exception as exc:
            logger.error(f"[BotNotifier] Error broadcasting to admins: {exc}")
            return 0

    @classmethod
    def notify_admins_sync(cls, text: str, session: Session) -> int:
        """
        Synchronous variant of notify_admins using requests.
        """
        try:
            stmt = select(User).where(User.role == UserRole.ADMIN)
            admins = session.execute(stmt).scalars().all()
            notified_count = 0
            for admin in admins:
                sent = cls.send_to_user_sync(admin, text)
                if sent:
                    notified_count += 1
            return notified_count
        except Exception as exc:
            logger.error(f"[BotNotifier Sync] Error broadcasting to admins: {exc}")
            return 0
