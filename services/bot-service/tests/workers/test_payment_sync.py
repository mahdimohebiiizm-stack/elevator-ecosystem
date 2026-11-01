from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import uuid

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.order import Order, OrderStatus, Transaction, TransactionStatus
from db.models.outbox import OutboxEvent
from db.models.product import Category, Product
from db.models.user import User, UserRole
from services.commands.order_command import create_order_command
from services.payment.interfaces import (
    PaymentGateway,
    PaymentRequestResult,
    PaymentVerificationResult,
)
from workers.payment_sync import PaymentSyncWorker


class MockSyncGateway(PaymentGateway):
    def __init__(self, should_confirm: bool = True) -> None:
        self.should_confirm = should_confirm

    async def request_payment(
        self,
        amount: int,
        callback_url: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PaymentRequestResult:
        return PaymentRequestResult(
            authority="A_SYNC_MOCK_123",
            payment_url="https://mock.startpay",
            fee=0,
        )

    async def verify_payment(
        self,
        amount: int,
        authority: str,
    ) -> PaymentVerificationResult:
        if self.should_confirm:
            return PaymentVerificationResult(
                is_success=True,
                ref_id="SYNC_REF_112233",
                code=100,
                fee=0,
            )
        return PaymentVerificationResult(
            is_success=False,
            ref_id=None,
            code=-51,  # Expired / unpaid
            fee=0,
        )


async def _seed_stale_order(
    session: AsyncSession,
    age_minutes: int = 20,
) -> tuple[Order, Product]:
    user = User(
        messenger_id=f"sync_user_{uuid.uuid4().hex[:8]}",
        role=UserRole.CUSTOMER,
        wallet_balance=0,
    )
    session.add(user)

    category = Category(
        name="Laptops",
        slug=f"laptops-{uuid.uuid4().hex[:8]}",
        is_active=True,
    )
    session.add(category)
    await session.flush()

    product = Product(
        category_id=category.id,
        sku=f"SYNC-{uuid.uuid4().hex[:6]}",
        title="Sync Test Laptop",
        price=30_000_000,
        stock_count=10,
        is_active=True,
    )
    session.add(product)
    await session.commit()

    order = await create_order_command(
        session=session,
        user_id=user.id,
        items_data=[{"product_id": product.id, "quantity": 2}],
        address_snapshot={"city": "Tehran", "postal_code": "1999988888"},
    )

    # Artificially set created_at into the past
    stale_time = datetime.now(timezone.utc) - timedelta(minutes=age_minutes)
    order.created_at = stale_time
    session.add(order)
    await session.commit()
    await session.refresh(order)
    await session.refresh(product)
    return order, product


@pytest.mark.asyncio
async def test_payment_sync_settles_confirmed_order(
    db_session: AsyncSession,
) -> None:
    """
    Test that PaymentSyncWorker detects stale order, verifies with gateway,
    settles transaction to SUCCESS, order to PAID, and emits OrderPaid outbox event.
    """
    # Clean previous pending orders to isolate test batch
    await db_session.execute(
        update(Order)
        .where(Order.status == OrderStatus.PENDING)
        .values(status=OrderStatus.CANCELED)
    )
    await db_session.commit()

    order, product = await _seed_stale_order(db_session, age_minutes=25)

    # Attach pending transaction
    tx = Transaction(
        id=uuid.uuid4(),
        order_id=order.id,
        gateway_name="ZarinPal",
        amount=order.total_price,
        authority=f"A_SYNC_{uuid.uuid4().hex[:8]}",
        status=TransactionStatus.PENDING,
    )
    db_session.add(tx)
    await db_session.commit()

    gateway = MockSyncGateway(should_confirm=True)
    worker = PaymentSyncWorker(
        gateway=gateway,
        stale_threshold_minutes=15,
        batch_size=10,
    )

    processed_count = await worker.process_sync_batch(db_session)
    assert processed_count >= 1

    await db_session.refresh(order)
    assert order.status == OrderStatus.PAID

    await db_session.refresh(tx)
    assert tx.status == TransactionStatus.SUCCESS
    assert tx.ref_id == "SYNC_REF_112233"

    # Outbox verification
    outbox_stmt = select(OutboxEvent).where(
        OutboxEvent.aggregate_id == str(order.id),
        OutboxEvent.event_type == "OrderPaid",
    )
    res = await db_session.execute(outbox_stmt)
    assert res.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_payment_sync_cancels_unpaid_order_and_restores_stock(
    db_session: AsyncSession,
) -> None:
    """
    Test that PaymentSyncWorker cancels unpaid/expired order and safely restores stock.
    """
    # Clean previous pending orders to isolate test batch
    await db_session.execute(
        update(Order)
        .where(Order.status == OrderStatus.PENDING)
        .values(status=OrderStatus.CANCELED)
    )
    await db_session.commit()

    order, product = await _seed_stale_order(db_session, age_minutes=30)
    assert product.stock_count == 8  # 10 - 2

    tx = Transaction(
        id=uuid.uuid4(),
        order_id=order.id,
        gateway_name="ZarinPal",
        amount=order.total_price,
        authority=f"A_UNPAID_{uuid.uuid4().hex[:8]}",
        status=TransactionStatus.PENDING,
    )
    db_session.add(tx)
    await db_session.commit()

    gateway = MockSyncGateway(should_confirm=False)
    worker = PaymentSyncWorker(
        gateway=gateway,
        stale_threshold_minutes=15,
        batch_size=10,
    )

    processed_count = await worker.process_sync_batch(db_session)
    assert processed_count >= 1

    await db_session.refresh(order)
    assert order.status == OrderStatus.CANCELED

    await db_session.refresh(tx)
    assert tx.status == TransactionStatus.FAILED

    # Stock must be restored to 10
    await db_session.refresh(product)
    assert product.stock_count == 10

    # OrderCanceled outbox event
    outbox_stmt = select(OutboxEvent).where(
        OutboxEvent.aggregate_id == str(order.id),
        OutboxEvent.event_type == "OrderCanceled",
    )
    res = await db_session.execute(outbox_stmt)
    assert res.scalar_one_or_none() is not None
