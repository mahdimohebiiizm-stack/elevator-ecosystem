import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from db.models.order import OrderStatus
from db.models.product import Category, Product
from db.models.user import User, UserRole
from services.commands.order_command import create_order_command
from services.queries.order_query import (
    count_orders,
    get_order_by_id,
    get_order_by_id_or_fail,
    get_user_orders,
    list_orders,
)


@pytest.fixture
async def sample_category(db_session: AsyncSession) -> Category:
    category = Category(
        id=uuid.uuid4(),
        name="Audio",
        slug=f"audio-{uuid.uuid4().hex[:6]}",
        is_active=True,
    )
    db_session.add(category)
    await db_session.commit()
    return category


@pytest.fixture
async def sample_user(db_session: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        messenger_id=f"tg_{uuid.uuid4().hex[:10]}",
        phone="+989123456789",
        role=UserRole.CUSTOMER,
        wallet_balance=50_000_000,
    )
    db_session.add(user)
    await db_session.commit()
    return user


@pytest.mark.asyncio
async def test_order_queries(
    db_session: AsyncSession,
    sample_user: User,
    sample_category: Category,
) -> None:
    """
    Test CQRS read queries for order retrieval, user filtering, and pagination.
    """
    product = Product(
        id=uuid.uuid4(),
        category_id=sample_category.id,
        sku=f"SKU-{uuid.uuid4().hex[:8]}",
        title="Headphones",
        price=10_000_000,
        stock_count=50,
        is_active=True,
    )
    db_session.add(product)
    await db_session.commit()

    # Create 2 orders for sample_user
    order1 = await create_order_command(
        session=db_session,
        user_id=sample_user.id,
        items_data=[{"product_id": product.id, "quantity": 1}],
        address_snapshot={"city": "Tehran", "postal_code": "1999988888"},
    )
    order2 = await create_order_command(
        session=db_session,
        user_id=sample_user.id,
        items_data=[{"product_id": product.id, "quantity": 2}],
        address_snapshot={"city": "Tehran", "postal_code": "1999988888"},
    )

    # 1. get_order_by_id
    found_order = await get_order_by_id(session=db_session, order_id=order1.id)
    assert found_order is not None
    assert found_order.id == order1.id
    assert len(found_order.items) == 1

    # 2. get_order_by_id_or_fail
    fetched_order = await get_order_by_id_or_fail(
        session=db_session, order_id=order2.id
    )
    assert fetched_order.id == order2.id

    with pytest.raises(NotFoundError):
        await get_order_by_id_or_fail(session=db_session, order_id=uuid.uuid4())

    # 3. get_user_orders
    user_orders = await get_user_orders(session=db_session, user_id=sample_user.id)
    assert len(user_orders) >= 2
    order_ids = [o.id for o in user_orders]
    assert order1.id in order_ids
    assert order2.id in order_ids

    # 4. list_orders with pagination
    all_orders = await list_orders(session=db_session, skip=0, limit=10)
    assert len(all_orders) >= 2

    # 5. count_orders
    total_count = await count_orders(session=db_session)
    assert total_count >= 2

    pending_count = await count_orders(session=db_session, status=OrderStatus.PENDING)
    assert pending_count >= 2

    shipped_count = await count_orders(session=db_session, status=OrderStatus.SHIPPED)
    assert isinstance(shipped_count, int)
    assert total_count >= pending_count + shipped_count
