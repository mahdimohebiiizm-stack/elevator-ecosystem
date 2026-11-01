import asyncio
from datetime import datetime, timezone
import logging
from typing import Awaitable, Callable, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from db.models.outbox import OutboxEvent
from db.session import AsyncSessionLocal

logger = logging.getLogger("shopbot_backend.workers.outbox")


class OutboxProcessorWorker:
    """
    Background transactional outbox event relay daemon.
    Polls unhandled outbox events concurrently using PostgreSQL SKIP LOCKED semantics,
    simulates delivery to message brokers / bot webhooks, and marks events as processed.
    """

    def __init__(
        self,
        session_factory: Optional[async_sessionmaker[AsyncSession]] = None,
        batch_size: int = 50,
        dispatch_handler: Optional[Callable[[OutboxEvent], Awaitable[None]]] = None,
    ) -> None:
        self.session_factory: async_sessionmaker[AsyncSession] = (
            session_factory or AsyncSessionLocal
        )
        self.batch_size: int = batch_size
        self._custom_dispatch_handler: Optional[
            Callable[[OutboxEvent], Awaitable[None]]
        ] = dispatch_handler
        self._is_running: bool = False
        self._stop_event: asyncio.Event = asyncio.Event()

    async def dispatch_event(self, event: OutboxEvent) -> None:
        """
        Dispatches an outbox event to downstream message brokers or bot push channels.
        Can be overridden or customized via injection.
        """
        if self._custom_dispatch_handler is not None:
            await self._custom_dispatch_handler(event)
        else:
            logger.info(
                f"Relaying OutboxEvent [id={event.id}] aggregate={event.aggregate_type}:"
                f"{event.aggregate_id} type={event.event_type} payload_keys={list(event.payload.keys())}"
            )

    async def process_batch(self, session: AsyncSession) -> int:
        """
        Fetches and processes a single batch of pending outbox events using SKIP LOCKED.
        Returns the number of events processed successfully.
        """
        # CRITICAL ENTERPRISE RULE: with_for_update(skip_locked=True)
        stmt = (
            select(OutboxEvent)
            .where(OutboxEvent.processed_at.is_(None))
            .order_by(OutboxEvent.created_at.asc())
            .with_for_update(skip_locked=True)
            .limit(self.batch_size)
        )
        result = await session.execute(stmt)
        events: List[OutboxEvent] = list(result.scalars().all())

        if not events:
            return 0

        processed_count: int = 0
        for event in events:
            try:
                await self.dispatch_event(event)
                event.processed_at = func.now()
                processed_count += 1
            except Exception as exc:
                # Wrap iteration in broad except to prevent a single event failure from halting the daemon
                logger.error(
                    f"Failed to dispatch outbox event {event.id}: {exc}",
                    exc_info=True,
                )

        await session.commit()
        return processed_count

    async def run(
        self,
        poll_interval: float = 1.0,
        max_iterations: Optional[int] = None,
    ) -> int:
        """
        Main worker loop. Runs continuously until stop() is invoked or max_iterations is reached.
        Returns total number of processed events across iterations.
        """
        self._is_running = True
        self._stop_event.clear()
        total_processed: int = 0
        iteration: int = 0

        logger.info(
            f"OutboxProcessorWorker daemon started (batch_size={self.batch_size}, "
            f"interval={poll_interval}s)."
        )

        try:
            while self._is_running:
                iteration += 1
                try:
                    async with self.session_factory() as session:
                        processed_in_batch = await self.process_batch(session)
                        total_processed += processed_in_batch

                        # If batch was processed, poll again immediately if more events might exist
                        if processed_in_batch == self.batch_size:
                            continue

                except Exception as worker_exc:
                    logger.error(
                        f"Error in outbox processing cycle: {worker_exc}", exc_info=True
                    )

                if max_iterations is not None and iteration >= max_iterations:
                    break

                try:
                    await asyncio.wait_for(
                        self._stop_event.wait(), timeout=poll_interval
                    )
                    break
                except asyncio.TimeoutError:
                    pass

        finally:
            self._is_running = False
            logger.info("OutboxProcessorWorker daemon stopped.")

        return total_processed

    def stop(self) -> None:
        """
        Signals the worker loop to terminate gracefully.
        """
        self._is_running = False
        self._stop_event.set()


async def run_outbox_worker() -> None:
    """
    Entrypoint function for launching the outbox processor as a standalone daemon process.
    """
    logging.basicConfig(level=logging.INFO)
    worker = OutboxProcessorWorker()
    await worker.run()


if __name__ == "__main__":
    asyncio.run(run_outbox_worker())
