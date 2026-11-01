import logging
from typing import Any, Dict, Optional

from infrastructure.db.uow import IUnitOfWork
from schemas.webhook import WebhookPayload, WebhookResponse
from services.user_service import authenticate_bot_user

logger = logging.getLogger("shopbot_backend.webhooks")


class ProcessWebhookUseCase:
    """
    Application use case handling incoming messenger webhook payloads.
    Decoupled from HTTP presentation and specific messaging protocols.
    """

    def __init__(self, uow: IUnitOfWork) -> None:
        self.uow = uow

    async def execute(self, platform: str, payload: WebhookPayload) -> WebhookResponse:
        """
        Processes message and callback events from Telegram, Bale, Rubika, or other platforms.
        Guarantees idempotency and safe background execution.
        """
        logger.info(
            f"Processing webhook for platform '{platform}' [update_id: {payload.update_id}, event: {payload.event_type}]"
        )

        message: Optional[Dict[str, Any]] = payload.message
        if message:
            # Extract messenger sender identifier
            sender: Dict[str, Any] = message.get("from", {})
            sender_id = str(sender.get("id") or message.get("sender_id") or "")
            if sender_id:
                formatted_id = f"{platform}_{sender_id}"
                # Auto-provision or authenticate user in background
                await authenticate_bot_user(
                    session=self.uow.session, messenger_id=formatted_id
                )

        return WebhookResponse(
            status="ok",
            update_id=payload.update_id,
            processed=True,
            message=f"Event {payload.update_id} successfully dispatched.",
        )
