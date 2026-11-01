import asyncio
import pytest

from core.exceptions import LockAcquisitionError
from core.locks import DistributedLockManager, distributed_lock


@pytest.mark.asyncio
async def test_distributed_lock_acquire_and_release() -> None:
    """
    Test standard acquisition and safe release of a distributed lock.
    """
    manager = DistributedLockManager()
    resource = "test:resource:1"

    token = await manager.acquire_lock(resource, ttl_seconds=5, timeout_seconds=1.0)
    assert token is not None

    # Releasing with correct token should succeed
    released = await manager.release_lock(resource, token)
    assert released is True

    # Releasing again with same token should return False (already released)
    released_again = await manager.release_lock(resource, token)
    assert released_again is False


@pytest.mark.asyncio
async def test_distributed_lock_concurrency_conflict() -> None:
    """
    Test that a second lock acquisition fails with LockAcquisitionError when held.
    """
    manager = DistributedLockManager()
    resource = "test:resource:conflict"

    token1 = await manager.acquire_lock(resource, ttl_seconds=5, timeout_seconds=1.0)
    assert token1 is not None

    # Second acquisition with short timeout should raise LockAcquisitionError
    with pytest.raises(LockAcquisitionError) as exc_info:
        await manager.acquire_lock(
            resource, ttl_seconds=5, timeout_seconds=0.1, retry_delay=0.02
        )
    assert "Could not acquire distributed lock" in str(exc_info.value)

    # Release token1
    await manager.release_lock(resource, token1)

    # Now token2 should acquire cleanly
    token2 = await manager.acquire_lock(resource, ttl_seconds=5, timeout_seconds=1.0)
    assert token2 is not None
    await manager.release_lock(resource, token2)


@pytest.mark.asyncio
async def test_distributed_lock_context_manager() -> None:
    """
    Test that the distributed_lock async context manager auto-releases the lock.
    """
    resource = "test:resource:context_manager"

    async with distributed_lock(resource, ttl_seconds=5, timeout_seconds=1.0) as token:
        assert isinstance(token, str)
        # Attempting to re-acquire the same resource while context manager is open should fail
        manager = DistributedLockManager()
        with pytest.raises(LockAcquisitionError):
            await manager.acquire_lock(
                resource, ttl_seconds=2, timeout_seconds=0.05, retry_delay=0.01
            )

    # Once exited, acquiring should succeed
    async with distributed_lock(resource, ttl_seconds=5, timeout_seconds=1.0) as token2:
        assert isinstance(token2, str)
        assert token2 != token
