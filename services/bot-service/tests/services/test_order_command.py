from typing import Any, Dict
import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.order import Order, OrderStatus
from db.models.outbox import OutboxEvent
from db.models.product import Category, Product
from db.models.user import User, UserRole
from services.commands.order_command import cancel_order_command, create_order_command


@pytest.fixture
async def sample_category(db_session: AsyncSession) -> Category:
    category = Category(
        id=uuid.uuid4(),
        name="Electronics",
        slug=f"electronics-{uuid.uuid4().hex[:6]}",
        icon_url="https://example.com/icons/electronics.png",
        is_active=True,
    )
    db_session.add(category)
    await db_session.commit()
    await db_session.refresh(category)
    return category


@pytest.fixture
async def sample_user(db_session: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        messenger_id=f"tg_{uuid.uuid4().hex[:10]}",
        phone="+989123456789",
        role=UserRole.CUSTOMER,
        wallet_balance=100_000_000,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_create_order_command_and_outbox_event(
    db_session: AsyncSession,
    sample_user: User,
    sample_category: Category,
) -> None:
    """
    Verify that create_order_command atomically persists the Order, deducts stock,
    and appends a corresponding OutboxEvent to the transactional outbox table.
    """
    initial_stock = 25
    product = Product(
        id=uuid.uuid4(),
        category_id=sample_category.id,
        sku=f"SKU-{uuid.uuid4().hex[:8]}",
        title="Gaming Keyboard",
        description="Mechanical keyboard",
        price=15_000_000,
        stock_count=initial_stock,
        is_active=True,
    )
    db_session.add(product)
    await db_session.commit()

    order_qty = 3
    items_data = [{"product_id": product.id, "quantity": order_qty}]
    address_snapshot = {
        "title": "Home",
        "province": "Tehran",
        "city": "Tehran",
        "postal_code": "1999988888",
        "full_address": "Valiasr St., No. 12",
    }

    order = await create_order_command(
        session=db_session,
        user_id=sample_user.id,
        items_data=items_data,
        address_snapshot=address_snapshot,
    )

    assert order.id is not None
    assert order.total_price == 15_000_000 * order_qty
    assert order.status == OrderStatus.PENDING

    # Verify inventory was deducted
    await db_session.refresh(product)
    assert product.stock_count == initial_stock - order_qty

    # Query OutboxEvent table for this order
    outbox_stmt = select(OutboxEvent).where(
        OutboxEvent.aggregate_id == str(order.id),
        OutboxEvent.event_type == "OrderCreated",
    )
    outbox_res = await db_session.execute(outbox_stmt)
    outbox_event = outbox_res.scalar_one_or_none()

    assert outbox_event is not None
    assert outbox_event.aggregate_type == "Order"
    assert outbox_event.aggregate_id == str(order.id)
    assert outbox_event.event_type == "OrderCreated"
    assert outbox_event.processed_at is None
    assert outbox_event.payload["order_id"] == str(order.id)
    assert outbox_event.payload["user_id"] == str(sample_user.id)
    assert outbox_event.payload["total_price"] == order.total_price
    assert len(outbox_event.payload["items"]) == 1
    assert outbox_event.payload["items"][0]["quantity"] == order_qty
    assert outbox_event.payload["items"][0]["unit_price"] == 15_000_000


@pytest.mark.asyncio
async def test_cancel_order_command_restores_stock_and_records_outbox(
    db_session: AsyncSession,
    sample_user: User,
    sample_category: Category,
) -> None:
    """
    Verify cancel_order_command restores product inventory stock, marks status CANCELED,
    and publishes an OrderCanceled outbox event.
    """
    product = Product(
        id=uuid.uuid4(),
        category_id=sample_category.id,
        sku=f"SKU-{uuid.uuid4().hex[:8]}",
        title="Gaming Mouse",
        price=5_000_000,
        stock_count=10,
        is_active=True,
    )
    db_session.add(product)
    await db_session.commit()

    order = await create_order_command(
        session=db_session,
        user_id=sample_user.id,
        items_data=[{"product_id": product.id, "quantity": 2}],
        address_snapshot={"city": "Tehran", "postal_code": "1999988888"},
    )

    await db_session.refresh(product)
    assert product.stock_count == 8

    # Cancel order
    canceled_order = await cancel_order_command(session=db_session, order_id=order.id)
    assert canceled_order.status == OrderStatus.CANCELED

    # Stock must be restored to 10
    await db_session.refresh(product)
    assert product.stock_count == 10

    # Check OrderCanceled OutboxEvent
    outbox_stmt = select(OutboxEvent).where(
        OutboxEvent.aggregate_id == str(order.id),
        OutboxEvent.event_type == "OrderCanceled",
    )
    outbox_res = await db_session.execute(outbox_stmt)
    canceled_outbox = outbox_res.scalar_one_or_none()

    assert canceled_outbox is not None
    assert canceled_outbox.aggregate_type == "Order"
    assert canceled_outbox.payload["status"] == "CANCELED"
