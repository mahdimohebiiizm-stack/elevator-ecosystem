import asyncio
import pytest

from infrastructure.idempotency.storage import InMemoryIdempotencyStorage


@pytest.mark.asyncio
async def test_in_memory_idempotency_storage_locking_and_marking() -> None:
    storage = InMemoryIdempotencyStorage()
    key = "webhook:telegram:1001"

    # First acquire succeeds
    assert await storage.acquire_lock(key, ttl_seconds=60) is True

    # Immediate second acquire fails (lock is active)
    assert await storage.acquire_lock(key, ttl_seconds=60) is False

    # Mark as processed
    await storage.mark_processed(key, ttl_seconds=60)

    # Processed status is true
    assert await storage.is_processed(key) is True

    # Cannot acquire lock after processed
    assert await storage.acquire_lock(key, ttl_seconds=60) is False


@pytest.mark.asyncio
async def test_in_memory_idempotency_storage_release_lock() -> None:
    storage = InMemoryIdempotencyStorage()
    key = "webhook:bale:2002"

    assert await storage.acquire_lock(key, ttl_seconds=60) is True

    # Release lock on failure
    await storage.release_lock(key)

    # Can acquire lock again after release
    assert await storage.acquire_lock(key, ttl_seconds=60) is True
