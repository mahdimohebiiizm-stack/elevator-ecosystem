from abc import ABC, abstractmethod
import asyncio
from datetime import datetime, timezone
import logging
from typing import Dict, Optional, Tuple

logger = logging.getLogger("shopbot_backend.idempotency")


class IdempotencyStorage(ABC):
    """
    Abstract interface for distributed idempotency tracking and locking.
    """

    @abstractmethod
    async def acquire_lock(self, key: str, ttl_seconds: int = 300) -> bool:
        """
        Attempts to acquire an exclusive lock for an idempotency key.
        Returns True if acquired (first time seeing this key), False otherwise.
        """
        pass

    @abstractmethod
    async def mark_processed(self, key: str, ttl_seconds: int = 86400) -> None:
        """
        Marks the key as successfully processed to prevent future replays.
        Default retention is 24 hours (86,400 seconds).
        """
        pass

    @abstractmethod
    async def release_lock(self, key: str) -> None:
        """
        Releases the lock on processing failure to allow safe retry delivery.
        """
        pass

    @abstractmethod
    async def is_processed(self, key: str) -> bool:
        """
        Checks whether the specified key has already completed processing.
        """
        pass


class InMemoryIdempotencyStorage(IdempotencyStorage):
    """
    In-memory thread-safe implementation of IdempotencyStorage.
    Provides immediate local testing, zero external dependencies, and fallback reliability.
    """

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        # storage mapping: key -> (status: "LOCKED" | "PROCESSED", expires_at: timestamp)
        self._store: Dict[str, Tuple[str, float]] = {}

    def _clean_expired(self) -> None:
        now = datetime.now(timezone.utc).timestamp()
        expired_keys = [k for k, (_, exp) in self._store.items() if exp <= now]
        for k in expired_keys:
            del self._store[k]

    async def acquire_lock(self, key: str, ttl_seconds: int = 300) -> bool:
        async with self._lock:
            self._clean_expired()
            now = datetime.now(timezone.utc).timestamp()
            if key in self._store:
                return False

            self._store[key] = ("LOCKED", now + ttl_seconds)
            return True

    async def mark_processed(self, key: str, ttl_seconds: int = 86400) -> None:
        async with self._lock:
            now = datetime.now(timezone.utc).timestamp()
            self._store[key] = ("PROCESSED", now + ttl_seconds)

    async def release_lock(self, key: str) -> None:
        async with self._lock:
            if key in self._store and self._store[key][0] == "LOCKED":
                del self._store[key]

    async def is_processed(self, key: str) -> bool:
        async with self._lock:
            self._clean_expired()
            if key in self._store:
                status, _ = self._store[key]
                return status == "PROCESSED"
            return False


class RedisIdempotencyStorage(IdempotencyStorage):
    """
    Production-ready Redis distributed lock and idempotency store.
    Uses atomic SET NX EX operations.
    """

    def __init__(self, redis_url: str) -> None:
        self.redis_url = redis_url
        self._client: Optional[object] = None
        self._fallback = InMemoryIdempotencyStorage()

    async def _get_client(self) -> Optional[object]:
        if self._client is not None:
            return self._client
        try:
            import redis.asyncio as aioredis

            self._client = aioredis.from_url(self.redis_url, decode_responses=True)
            return self._client
        except Exception as e:
            logger.warning(
                f"Could not connect to Redis ({e}); falling back to InMemoryIdempotencyStorage."
            )
            return None

    async def acquire_lock(self, key: str, ttl_seconds: int = 300) -> bool:
        client = await self._get_client()
        if client is None:
            return await self._fallback.acquire_lock(key, ttl_seconds)

        try:
            # SET key "LOCKED" NX EX ttl
            acquired = await client.set(f"idempotency:{key}", "LOCKED", nx=True, ex=ttl_seconds)  # type: ignore[attr-defined]
            return bool(acquired)
        except Exception as e:
            logger.error(
                f"Redis error during acquire_lock ({e}); falling back to in-memory."
            )
            return await self._fallback.acquire_lock(key, ttl_seconds)

    async def mark_processed(self, key: str, ttl_seconds: int = 86400) -> None:
        client = await self._get_client()
        if client is None:
            await self._fallback.mark_processed(key, ttl_seconds)
            return

        try:
            await client.set(f"idempotency:{key}", "PROCESSED", ex=ttl_seconds)  # type: ignore[attr-defined]
        except Exception as e:
            logger.error(f"Redis error during mark_processed ({e}); using fallback.")
            await self._fallback.mark_processed(key, ttl_seconds)

    async def release_lock(self, key: str) -> None:
        client = await self._get_client()
        if client is None:
            await self._fallback.release_lock(key)
            return

        try:
            # Only delete if still in LOCKED state
            val = await client.get(f"idempotency:{key}")  # type: ignore[attr-defined]
            if val == "LOCKED":
                await client.delete(f"idempotency:{key}")  # type: ignore[attr-defined]
        except Exception as e:
            logger.error(f"Redis error during release_lock ({e}); using fallback.")
            await self._fallback.release_lock(key)

    async def is_processed(self, key: str) -> bool:
        client = await self._get_client()
        if client is None:
            return await self._fallback.is_processed(key)

        try:
            val = await client.get(f"idempotency:{key}")  # type: ignore[attr-defined]
            return val == "PROCESSED"
        except Exception as e:
            logger.error(f"Redis error during is_processed ({e}); using fallback.")
            return await self._fallback.is_processed(key)


# Global storage instance
_global_idempotency_storage: Optional[IdempotencyStorage] = None


def get_idempotency_storage() -> IdempotencyStorage:
    """
    Returns the configured IdempotencyStorage singleton.
    """
    global _global_idempotency_storage
    if _global_idempotency_storage is None:
        # Default to in-memory store; will wrap in Redis if URL configured
        _global_idempotency_storage = InMemoryIdempotencyStorage()
    return _global_idempotency_storage


def set_idempotency_storage(storage: IdempotencyStorage) -> None:
    """
    Overrides the global idempotency storage (e.g. for testing).
    """
    global _global_idempotency_storage
    _global_idempotency_storage = storage
