from typing import List, Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from db.models.product import Product


async def list_admin_products(
    session: AsyncSession,
    skip: int = 0,
    limit: int = 200,
) -> List[Product]:
    """
    CQRS Query: Fetches all catalog products and packages for Admin PIM dashboard.
    Strictly eager-loads the related Category via joinedload to eliminate N+1 query overhead.
    """
    stmt = (
        select(Product)
        .options(joinedload(Product.category))
        .order_by(Product.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_admin_product_by_id(
    session: AsyncSession,
    product_id: uuid.UUID,
) -> Optional[Product]:
    """
    CQRS Query: Fetches a single product by UUID with eager-loaded Category.
    """
    stmt = (
        select(Product)
        .where(Product.id == product_id)
        .options(joinedload(Product.category))
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()
