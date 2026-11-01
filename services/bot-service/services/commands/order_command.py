from contextlib import AsyncExitStack
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.exceptions import (
    InsufficientStockError,
    InvalidOrderError,
    NotFoundError,
)
from core.locks import distributed_lock
from db.models.order import Order, OrderItem, OrderStatus
from db.models.outbox import OutboxEvent
from db.models.product import Product


async def create_order_command(
    session: AsyncSession,
    user_id: uuid.UUID,
    items_data: List[Dict[str, Any]],
    address_snapshot: Dict[str, Any],
) -> Order:
    """
    CQRS Command: Creates and persists a customer order within an ACID database transaction,
    protected by distributed Redlocks per product inventory item and recording an atomic
    Transactional Outbox event for asynchronous notification / dispatch.

    Raises:
        InvalidOrderError: If items_data is empty or contains invalid product_ids/quantities.
        NotFoundError: If a specified product ID is missing from catalog.
        InsufficientStockError: If available inventory is less than requested quantity.
        LockAcquisitionError: If distributed lock cannot be acquired within timeout.
    """
    if not items_data:
        raise InvalidOrderError("Cannot create an order without line items.")

    # 1. Parse and validate item structures upfront
    parsed_items: List[Dict[str, Any]] = []
    for item_data in items_data:
        raw_product_id: Any = item_data.get("product_id")
        if raw_product_id is None:
            raise InvalidOrderError("Missing 'product_id' in order item.")

        if isinstance(raw_product_id, str):
            try:
                product_id = uuid.UUID(raw_product_id)
            except ValueError:
                raise InvalidOrderError(
                    f"Invalid UUID string format for product_id: {raw_product_id}"
                )
        elif isinstance(raw_product_id, uuid.UUID):
            product_id = raw_product_id
        else:
            raise InvalidOrderError(f"Invalid product_id type: {type(raw_product_id)}")

        raw_quantity: Any = item_data.get("quantity")
        if (
            raw_quantity is None
            or not isinstance(raw_quantity, int)
            or raw_quantity <= 0
        ):
            raise InvalidOrderError(
                "Item quantity must be a positive integer greater than zero."
            )

        parsed_items.append({"product_id": product_id, "quantity": raw_quantity})

    # 2. Sort unique product IDs to guarantee deterministic lock acquisition order and prevent deadlocks
    distinct_product_ids = sorted(
        {item["product_id"] for item in parsed_items}, key=lambda x: str(x)
    )

    # 3. Acquire distributed locks on all target product inventories concurrently
    async with AsyncExitStack() as lock_stack:
        for pid in distinct_product_ids:
            await lock_stack.enter_async_context(
                distributed_lock(f"lock:product:inventory:{pid}")
            )

        # 4. Execute atomic database transaction
        try:
            total_price: int = 0
            order_items_to_create: List[OrderItem] = []
            order_id: uuid.UUID = uuid.uuid4()

            for item_info in parsed_items:
                product_id = item_info["product_id"]
                quantity = item_info["quantity"]

                # Fetch Product with row-level locking for PostgreSQL concurrency protection
                stmt = select(Product).where(Product.id == product_id).with_for_update()
                result = await session.execute(stmt)
                product: Optional[Product] = result.scalar_one_or_none()

                if product is None:
                    raise NotFoundError(
                        f"Product with ID '{product_id}' was not found."
                    )

                if product.stock_count < quantity:
                    raise InsufficientStockError(
                        f"Insufficient stock for product '{product.title}'. "
                        f"Requested: {quantity}, Available: {product.stock_count}."
                    )

                # Deduct inventory stock
                product.stock_count -= quantity
                session.add(product)

                # Aggregate price in Rials
                line_price: int = product.price * quantity
                total_price += line_price

                # Create OrderItem entity
                order_item = OrderItem(
                    id=uuid.uuid4(),
                    order_id=order_id,
                    product_id=product.id,
                    quantity=quantity,
                    unit_price_at_purchase=product.price,
                )
                order_items_to_create.append(order_item)

            # Create Order entity
            order = Order(
                id=order_id,
                user_id=user_id,
                total_price=total_price,
                status=OrderStatus.PENDING,
                address_snapshot=address_snapshot,
            )
            session.add(order)

            for line_item in order_items_to_create:
                session.add(line_item)

            # Append Transactional Outbox Event to guarantees at-least-once message delivery
            outbox_payload: Dict[str, Any] = {
                "order_id": str(order_id),
                "user_id": str(user_id),
                "total_price": total_price,
                "status": OrderStatus.PENDING.value,
                "items": [
                    {
                        "product_id": str(item.product_id),
                        "quantity": item.quantity,
                        "unit_price": item.unit_price_at_purchase,
                    }
                    for item in order_items_to_create
                ],
                "address_snapshot": address_snapshot,
            }
            outbox_event = OutboxEvent(
                id=uuid.uuid4(),
                aggregate_type="Order",
                aggregate_id=str(order_id),
                event_type="OrderCreated",
                payload=outbox_payload,
            )
            session.add(outbox_event)

            # Commit entire transaction atomically
            await session.commit()

            # Re-fetch order with items eagerly loaded
            refetch_stmt = (
                select(Order)
                .where(Order.id == order.id)
                .options(selectinload(Order.items))
            )
            refetch_result = await session.execute(refetch_stmt)
            persisted_order: Order = refetch_result.scalar_one()

            return persisted_order

        except Exception:
            await session.rollback()
            raise


async def cancel_order_command(
    session: AsyncSession,
    order_id: uuid.UUID,
) -> Order:
    """
    CQRS Command: Cancels an existing order, safely restores inventory stock
    for all line items under distributed locks, marks order CANCELED,
    and publishes an OutboxEvent.
    """
    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items))
        .with_for_update()
    )
    result = await session.execute(stmt)
    order: Optional[Order] = result.scalar_one_or_none()

    if order is None:
        raise NotFoundError(f"Order with ID '{order_id}' was not found.")

    if order.status == OrderStatus.CANCELED:
        return order

    if order.status == OrderStatus.SHIPPED:
        raise InvalidOrderError(
            f"Order '{order_id}' has already been shipped and cannot be canceled."
        )

    distinct_product_ids = sorted(
        {item.product_id for item in order.items}, key=lambda x: str(x)
    )

    async with AsyncExitStack() as lock_stack:
        for pid in distinct_product_ids:
            await lock_stack.enter_async_context(
                distributed_lock(f"lock:product:inventory:{pid}")
            )

        try:
            # Restore product stocks
            for item in order.items:
                prod_stmt = (
                    select(Product)
                    .where(Product.id == item.product_id)
                    .with_for_update()
                )
                prod_res = await session.execute(prod_stmt)
                product = prod_res.scalar_one_or_none()
                if product is not None:
                    product.stock_count += item.quantity
                    session.add(product)

            order.status = OrderStatus.CANCELED
            session.add(order)

            outbox_event = OutboxEvent(
                id=uuid.uuid4(),
                aggregate_type="Order",
                aggregate_id=str(order.id),
                event_type="OrderCanceled",
                payload={
                    "order_id": str(order.id),
                    "user_id": str(order.user_id),
                    "status": OrderStatus.CANCELED.value,
                },
            )
            session.add(outbox_event)

            await session.commit()

            refetch_stmt = (
                select(Order)
                .where(Order.id == order.id)
                .options(selectinload(Order.items))
            )
            refetch_result = await session.execute(refetch_stmt)
            return refetch_result.scalar_one()

        except Exception:
            await session.rollback()
            raise
