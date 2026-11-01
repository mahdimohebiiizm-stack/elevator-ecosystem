from typing import Callable
from fastapi import Depends, Header, Request

from infrastructure.idempotency.storage import (
    IdempotencyStorage,
    get_idempotency_storage,
)
from schemas.webhook import WebhookPayload


class IdempotencyContext:
    """
    Context object managing the lifecycle of an idempotent request transaction.
    """

    def __init__(
        self, key: str, is_duplicate: bool, storage: IdempotencyStorage
    ) -> None:
        self.key = key
        self.is_duplicate = is_duplicate
        self.storage = storage

    async def mark_completed(self, ttl_seconds: int = 86400) -> None:
        """Marks the operation as fully completed in persistent storage."""
        if not self.is_duplicate:
            await self.storage.mark_processed(self.key, ttl_seconds)

    async def release_lock(self) -> None:
        """Releases the lock on failure to allow retry attempts."""
        if not self.is_duplicate:
            await self.storage.release_lock(self.key)


async def check_webhook_idempotency(
    payload: WebhookPayload,
    request: Request,
    storage: IdempotencyStorage = Depends(get_idempotency_storage),
) -> IdempotencyContext:
    """
    FastAPI dependency extracting update_id and verifying whether the incoming
    event has already been locked or processed to guarantee Exactly-Once semantics.
    """
    # Extract platform from path parameters
    platform: str = request.path_params.get("platform", "generic")
    idempotency_key = f"webhook:{platform}:{payload.update_id}"

    # Check if already processed
    if await storage.is_processed(idempotency_key):
        return IdempotencyContext(
            key=idempotency_key, is_duplicate=True, storage=storage
        )

    # Attempt to acquire exclusive lock
    acquired = await storage.acquire_lock(idempotency_key, ttl_seconds=300)
    if not acquired:
        return IdempotencyContext(
            key=idempotency_key, is_duplicate=True, storage=storage
        )

    return IdempotencyContext(key=idempotency_key, is_duplicate=False, storage=storage)
