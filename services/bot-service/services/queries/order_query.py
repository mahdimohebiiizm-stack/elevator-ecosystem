from typing import List, Optional
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from core.exceptions import NotFoundError
from db.models.order import Order, OrderItem, OrderStatus


async def get_order_by_id(
    session: AsyncSession,
    order_id: uuid.UUID,
) -> Optional[Order]:
    """
    CQRS Query: Fetches a single order by UUID with its line items eagerly loaded.
    Optimized for read replicas.
    """
    stmt = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_order_by_id_or_fail(
    session: AsyncSession,
    order_id: uuid.UUID,
) -> Order:
    """
    CQRS Query: Fetches a single order or raises NotFoundError if it does not exist.
    """
    order = await get_order_by_id(session=session, order_id=order_id)
    if order is None:
        raise NotFoundError(f"Order with ID '{order_id}' was not found.")
    return order


async def get_user_orders(
    session: AsyncSession,
    user_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> List[Order]:
    """
    CQRS Query: Fetches paginated orders belonging to a specific customer.
    """
    stmt = (
        select(Order)
        .where(Order.user_id == user_id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def list_orders(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    status: Optional[OrderStatus] = None,
) -> List[Order]:
    """
    CQRS Query: Fetches paginated orders across all users with optional status filtering.
    """
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    if status is not None:
        stmt = stmt.where(Order.status == status)

    stmt = stmt.offset(skip).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def count_orders(
    session: AsyncSession,
    status: Optional[OrderStatus] = None,
) -> int:
    """
    CQRS Query: Returns total count of orders matching optional status filter.
    """
    stmt = select(func.count(Order.id))
    if status is not None:
        stmt = stmt.where(Order.status == status)

    result = await session.execute(stmt)
    count_val = result.scalar()
    return count_val if count_val is not None else 0


async def list_admin_orders(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 200,
) -> List[Order]:
    """
    CQRS Query: Fetches all orders with eager-loaded user, transactions, items, and products.
    Optimized for the ERP Admin portal with zero N+1 queries.
    """
    stmt = (
        select(Order)
        .options(
            joinedload(Order.user),
            selectinload(Order.transactions),
            selectinload(Order.items).joinedload(OrderItem.product),
        )
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
