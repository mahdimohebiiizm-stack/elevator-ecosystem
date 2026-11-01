from datetime import datetime, timezone
from typing import List
import uuid

import pytest
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.outbox import OutboxEvent
from workers.outbox_processor import OutboxProcessorWorker


@pytest.mark.asyncio
async def test_outbox_processor_processes_pending_events(
    db_session: AsyncSession,
) -> None:
    """
    Test that OutboxProcessorWorker fetches unhandled events,
    dispatches them, and sets processed_at timestamp.
    """
    # Clean previous events to isolate test batch
    await db_session.execute(delete(OutboxEvent))
    await db_session.commit()

    dispatched_ids: List[uuid.UUID] = []

    async def mock_dispatcher(event: OutboxEvent) -> None:
        dispatched_ids.append(event.id)

    # Insert 3 test outbox events
    event1 = OutboxEvent(
        id=uuid.uuid4(),
        aggregate_type="Order",
        aggregate_id=str(uuid.uuid4()),
        event_type="OrderCreated",
        payload={"order_id": str(uuid.uuid4()), "test": True},
        processed_at=None,
    )
    event2 = OutboxEvent(
        id=uuid.uuid4(),
        aggregate_type="Order",
        aggregate_id=str(uuid.uuid4()),
        event_type="OrderCreated",
        payload={"order_id": str(uuid.uuid4()), "test": True},
        processed_at=None,
    )
    event_already_processed = OutboxEvent(
        id=uuid.uuid4(),
        aggregate_type="Order",
        aggregate_id=str(uuid.uuid4()),
        event_type="OrderCreated",
        payload={"order_id": str(uuid.uuid4()), "test": True},
        processed_at=datetime.now(timezone.utc),
    )

    db_session.add_all([event1, event2, event_already_processed])
    await db_session.commit()

    worker = OutboxProcessorWorker(
        batch_size=10,
        dispatch_handler=mock_dispatcher,
    )

    processed_count = await worker.process_batch(db_session)
    assert processed_count == 2
    assert event1.id in dispatched_ids
    assert event2.id in dispatched_ids
    assert event_already_processed.id not in dispatched_ids

    # Verify database state
    await db_session.refresh(event1)
    await db_session.refresh(event2)
    assert event1.processed_at is not None
    assert event2.processed_at is not None


@pytest.mark.asyncio
async def test_outbox_processor_resilient_to_single_event_failure(
    db_session: AsyncSession,
) -> None:
    """
    Test that a failure in one event does not crash processing of subsequent events.
    """
    # Clean previous events to isolate test batch
    await db_session.execute(delete(OutboxEvent))
    await db_session.commit()

    failing_id = uuid.uuid4()
    success_id = uuid.uuid4()

    async def faulty_dispatcher(event: OutboxEvent) -> None:
        if event.id == failing_id:
            raise RuntimeError("Simulated broker network failure")

    event_bad = OutboxEvent(
        id=failing_id,
        aggregate_type="Order",
        aggregate_id=str(uuid.uuid4()),
        event_type="OrderCreated",
        payload={"order_id": str(failing_id)},
        processed_at=None,
    )
    event_good = OutboxEvent(
        id=success_id,
        aggregate_type="Order",
        aggregate_id=str(uuid.uuid4()),
        event_type="OrderCreated",
        payload={"order_id": str(success_id)},
        processed_at=None,
    )

    db_session.add_all([event_bad, event_good])
    await db_session.commit()

    worker = OutboxProcessorWorker(
        batch_size=10,
        dispatch_handler=faulty_dispatcher,
    )

    processed_count = await worker.process_batch(db_session)
    # event_good was processed despite event_bad failing
    assert processed_count == 1

    await db_session.refresh(event_good)
    assert event_good.processed_at is not None

    await db_session.refresh(event_bad)
    assert event_bad.processed_at is None
