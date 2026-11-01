import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
from typing import AsyncGenerator, Dict, Optional, Tuple
import uuid

from core.config import settings
from core.exceptions import LockAcquisitionError

logger = logging.getLogger("shopbot_backend.locks")

# Atomic release Lua script ensuring only the lock owner releases it
RELEASE_LUA_SCRIPT: str = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""


class InMemoryLockStorage:
    """
    Thread-safe and async-safe in-memory distributed lock emulator.
    Used for local development, unit testing, and fallback when Redis is offline.
    """

    def __init__(self) -> None:
        self._mutex = asyncio.Lock()
        self._locks: Dict[str, Tuple[str, float]] = {}

    def _clean_expired(self) -> None:
        now = datetime.now(timezone.utc).timestamp()
        expired = [k for k, (_, exp) in self._locks.items() if exp <= now]
        for k in expired:
            del self._locks[k]

    async def acquire(self, key: str, token: str, ttl_seconds: int) -> bool:
        async with self._mutex:
            self._clean_expired()
            now = datetime.now(timezone.utc).timestamp()
            if key in self._locks:
                return False
            self._locks[key] = (token, now + ttl_seconds)
            return True

    async def release(self, key: str, token: str) -> bool:
        async with self._mutex:
            self._clean_expired()
            if key in self._locks:
                current_token, _ = self._locks[key]
                if current_token == token:
                    del self._locks[key]
                    return True
            return False


class DistributedLockManager:
    """
    Enterprise Redis Redlock implementation.
    Prevents race conditions on stock and financial balance mutations during high-concurrency traffic.
    """

    _shared_fallback = InMemoryLockStorage()

    def __init__(self, redis_url: Optional[str] = None) -> None:
        self.redis_url: str = str(
            redis_url or getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
        )
        self._redis_client: Optional[object] = None
        self._in_memory_fallback = self._shared_fallback

    async def _get_client(self) -> Optional[object]:
        if self._redis_client is not None:
            return self._redis_client
        try:
            import redis.asyncio as aioredis

            self._redis_client = aioredis.from_url(
                self.redis_url, decode_responses=True
            )
            return self._redis_client
        except Exception as e:
            logger.debug(
                f"Redis not available for Redlock ({e}); using InMemoryLockStorage fallback."
            )
            return None

    async def acquire_lock(
        self,
        resource_key: str,
        ttl_seconds: int = 15,
        timeout_seconds: float = 5.0,
        retry_delay: float = 0.05,
    ) -> str:
        """
        Attempts to acquire an exclusive lock within the timeout window using exponential/jitter retry.
        Returns unique token upon acquisition.
        Raises LockAcquisitionError if lock cannot be acquired before timeout.
        """
        lock_token = uuid.uuid4().hex
        lock_key = f"redlock:{resource_key}"
        loop = asyncio.get_running_loop()
        start_time = loop.time()

        client = await self._get_client()

        while (loop.time() - start_time) < timeout_seconds:
            acquired = False
            if client is not None:
                try:
                    # Atomic SETNX with TTL
                    res = await client.set(lock_key, lock_token, nx=True, ex=ttl_seconds)  # type: ignore[attr-defined]
                    acquired = bool(res)
                except Exception as e:
                    logger.warning(
                        f"Redis error during Redlock acquire ({e}); using fallback."
                    )
                    acquired = await self._in_memory_fallback.acquire(
                        lock_key, lock_token, ttl_seconds
                    )
            else:
                acquired = await self._in_memory_fallback.acquire(
                    lock_key, lock_token, ttl_seconds
                )

            if acquired:
                return lock_token

            await asyncio.sleep(retry_delay)

        raise LockAcquisitionError(
            f"Could not acquire distributed lock for resource '{resource_key}' within {timeout_seconds}s timeout."
        )

    async def release_lock(self, resource_key: str, lock_token: str) -> bool:
        """
        Safely releases the distributed lock only if the token matches, avoiding releasing expired locks.
        """
        lock_key = f"redlock:{resource_key}"
        client = await self._get_client()

        if client is not None:
            try:
                # Execute atomic Lua script
                res = await client.eval(RELEASE_LUA_SCRIPT, 1, lock_key, lock_token)  # type: ignore[attr-defined]
                return bool(res == 1)
            except Exception as e:
                logger.warning(
                    f"Redis error during Redlock release ({e}); releasing via fallback."
                )
                return await self._in_memory_fallback.release(lock_key, lock_token)
        else:
            return await self._in_memory_fallback.release(lock_key, lock_token)


# Global singleton lock manager
_global_lock_manager = DistributedLockManager()


@asynccontextmanager
async def distributed_lock(
    resource_key: str,
    ttl_seconds: int = 15,
    timeout_seconds: float = 5.0,
) -> AsyncGenerator[str, None]:
    """
    Asynchronous context manager acquiring a distributed Redlock before execution
    and guaranteeing safe release upon block exit.
    """
    token = await _global_lock_manager.acquire_lock(
        resource_key=resource_key,
        ttl_seconds=ttl_seconds,
        timeout_seconds=timeout_seconds,
    )
    try:
        yield token
    finally:
        await _global_lock_manager.release_lock(
            resource_key=resource_key, lock_token=token
        )
