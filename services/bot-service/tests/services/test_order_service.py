from typing import Any, Dict, List
import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import (
    InsufficientStockError,
    InvalidOrderError,
    NotFoundError,
)
from db.models.order import Order, OrderStatus
from db.models.product import Category, Product
from db.models.user import User, UserRole
from services.order_service import create_order


async def _create_test_environment(
    session: AsyncSession,
) -> tuple[User, Category, Product, Product]:
    """
    Helper to seed a user, category, and two products for order testing.
    """
    user = User(
        messenger_id=f"user_{uuid.uuid4().hex[:10]}",
        role=UserRole.CUSTOMER,
        wallet_balance=0,
    )
    session.add(user)

    category = Category(
        name="Gadgets",
        slug=f"gadgets-{uuid.uuid4().hex[:8]}",
        is_active=True,
    )
    session.add(category)
    await session.flush()

    prod_1 = Product(
        category_id=category.id,
        sku=f"SKU1-{uuid.uuid4().hex[:6]}",
        title="Wireless Headphones",
        price=20_000_000,  # 20M Rials
        stock_count=10,
        is_active=True,
    )
    prod_2 = Product(
        category_id=category.id,
        sku=f"SKU2-{uuid.uuid4().hex[:6]}",
        title="Mechanical Keyboard",
        price=35_000_000,  # 35M Rials
        stock_count=5,
        is_active=True,
    )
    session.add_all([prod_1, prod_2])
    await session.commit()
    await session.refresh(user)
    await session.refresh(category)
    await session.refresh(prod_1)
    await session.refresh(prod_2)

    return user, category, prod_1, prod_2


@pytest.mark.asyncio
async def test_create_order_successful_stock_deduction_and_snapshot(
    db_session: AsyncSession,
) -> None:
    """
    Verify successful order creation, stock count reduction, price aggregation,
    and immutable snapshot capture.
    """
    user, _, prod_1, _ = await _create_test_environment(db_session)
    prod_1_id: uuid.UUID = prod_1.id
    user_id: uuid.UUID = user.id

    address_data: Dict[str, Any] = {
        "title": "Home",
        "city": "Tehran",
        "full_address": "Jordan St, Block 4",
        "postal_code": "1999988888",
    }
    items_data: List[Dict[str, Any]] = [
        {"product_id": prod_1_id, "quantity": 3},
    ]

    order: Order = await create_order(
        session=db_session,
        user_id=user_id,
        items_data=items_data,
        address_snapshot=address_data,
    )

    assert order.id is not None
    assert order.user_id == user_id
    assert order.total_price == 60_000_000  # 3 * 20M Rials
    assert order.status == OrderStatus.PENDING
    assert order.address_snapshot == address_data
    assert len(order.items) == 1
    assert order.items[0].product_id == prod_1_id
    assert order.items[0].quantity == 3
    assert order.items[0].unit_price_at_purchase == 20_000_000

    # Verify inventory stock was deducted in database
    res = await db_session.execute(select(Product).where(Product.id == prod_1_id))
    persisted_prod = res.scalar_one()
    assert persisted_prod.stock_count == 7  # 10 - 3


@pytest.mark.asyncio
async def test_create_order_multiple_products(
    db_session: AsyncSession,
) -> None:
    """
    Verify creating an order with multiple distinct products correctly deducts
    each inventory count and aggregates the total financial sum.
    """
    user, _, prod_1, prod_2 = await _create_test_environment(db_session)
    prod_1_id: uuid.UUID = prod_1.id
    prod_2_id: uuid.UUID = prod_2.id
    user_id: uuid.UUID = user.id

    items_data: List[Dict[str, Any]] = [
        {"product_id": prod_1_id, "quantity": 2},  # 2 * 20M = 40M
        {"product_id": str(prod_2_id), "quantity": 1},  # 1 * 35M = 35M
    ]

    order: Order = await create_order(
        session=db_session,
        user_id=user_id,
        items_data=items_data,
        address_snapshot={"city": "Shiraz"},
    )

    assert order.total_price == 75_000_000
    assert len(order.items) == 2

    # Check both products' stocks
    res_1 = await db_session.execute(select(Product).where(Product.id == prod_1_id))
    assert res_1.scalar_one().stock_count == 8  # 10 - 2

    res_2 = await db_session.execute(select(Product).where(Product.id == prod_2_id))
    assert res_2.scalar_one().stock_count == 4  # 5 - 1


@pytest.mark.asyncio
async def test_create_order_insufficient_stock_rollback(
    db_session: AsyncSession,
) -> None:
    """
    Verify strict ACID rollback: if one item has insufficient stock,
    no products have their inventory altered, and no order is persisted.
    """
    user, _, prod_1, prod_2 = await _create_test_environment(db_session)
    prod_1_id: uuid.UUID = prod_1.id
    prod_2_id: uuid.UUID = prod_2.id
    user_id: uuid.UUID = user.id
    initial_stock_1: int = prod_1.stock_count
    initial_stock_2: int = prod_2.stock_count

    # prod_1 requested 2 (valid), but prod_2 requested 100 (available: 5)
    items_data: List[Dict[str, Any]] = [
        {"product_id": prod_1_id, "quantity": 2},
        {"product_id": prod_2_id, "quantity": 100},
    ]

    with pytest.raises(InsufficientStockError) as exc_info:
        await create_order(
            session=db_session,
            user_id=user_id,
            items_data=items_data,
            address_snapshot={"city": "Isfahan"},
        )

    assert "Insufficient stock" in str(exc_info.value)

    # Verify prod_1 stock was NOT deducted (rolled back)
    res_1 = await db_session.execute(select(Product).where(Product.id == prod_1_id))
    assert res_1.scalar_one().stock_count == initial_stock_1

    # Verify prod_2 stock was NOT changed
    res_2 = await db_session.execute(select(Product).where(Product.id == prod_2_id))
    assert res_2.scalar_one().stock_count == initial_stock_2

    # Verify no order was saved
    orders_res = await db_session.execute(select(Order).where(Order.user_id == user_id))
    assert len(orders_res.scalars().all()) == 0


@pytest.mark.asyncio
async def test_create_order_not_found_product_rollback(
    db_session: AsyncSession,
) -> None:
    """
    Verify NotFoundError is raised and changes rolled back when a product does not exist.
    """
    user, _, prod_1, _ = await _create_test_environment(db_session)
    prod_1_id: uuid.UUID = prod_1.id
    user_id: uuid.UUID = user.id
    non_existent_id: uuid.UUID = uuid.uuid4()

    items_data: List[Dict[str, Any]] = [
        {"product_id": prod_1_id, "quantity": 1},
        {"product_id": non_existent_id, "quantity": 1},
    ]

    with pytest.raises(NotFoundError) as exc_info:
        await create_order(
            session=db_session,
            user_id=user_id,
            items_data=items_data,
            address_snapshot={"city": "Tabriz"},
        )

    assert str(non_existent_id) in str(exc_info.value)

    # Verify prod_1 was not decremented
    res_1 = await db_session.execute(select(Product).where(Product.id == prod_1_id))
    assert res_1.scalar_one().stock_count == 10


@pytest.mark.asyncio
async def test_create_order_validation_errors(
    db_session: AsyncSession,
) -> None:
    """
    Verify InvalidOrderError is raised on empty items list or non-positive quantities.
    """
    user = User(
        messenger_id=f"val_user_{uuid.uuid4().hex[:6]}",
        role=UserRole.CUSTOMER,
        wallet_balance=0,
    )
    db_session.add(user)
    await db_session.commit()
    user_id: uuid.UUID = user.id

    # Empty items
    with pytest.raises(InvalidOrderError, match="without line items"):
        await create_order(
            session=db_session,
            user_id=user_id,
            items_data=[],
            address_snapshot={"city": "Mashhad"},
        )

    # Non-positive quantity
    with pytest.raises(InvalidOrderError, match="positive integer"):
        await create_order(
            session=db_session,
            user_id=user_id,
            items_data=[{"product_id": uuid.uuid4(), "quantity": 0}],
            address_snapshot={"city": "Mashhad"},
        )
