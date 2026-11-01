import uuid
from typing import Any, Dict

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.mixins import TimestampMixin
from db.models.order import (
    Order,
    OrderItem,
    OrderStatus,
    Transaction,
    TransactionStatus,
)
from db.models.product import Category, Product
from db.models.user import User, UserAddress, UserRole
from db.session import AsyncSessionLocal


def test_user_and_address_model_instantiation() -> None:
    """
    Verify User and UserAddress models instantiate with UUID, enums, BigInteger balance,
    and inherit from TimestampMixin.
    """
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        messenger_id="telegram_987654321",
        phone="+989120000000",
        role=UserRole.CUSTOMER,
        wallet_balance=50_000_000,  # 50 million Rials
    )

    assert isinstance(user, TimestampMixin)
    assert user.id == user_id
    assert user.role == UserRole.CUSTOMER
    assert user.wallet_balance == 50_000_000

    address_id = uuid.uuid4()
    address = UserAddress(
        id=address_id,
        user_id=user.id,
        title="Home",
        province="Tehran",
        city="Tehran",
        postal_code="1234567890",
        full_address="Valiasr St, No. 10",
        latitude=35.6892,
        longitude=51.3890,
        is_default=True,
    )
    assert address.is_default is True
    assert address.title == "Home"
    assert address.id == address_id


def test_category_adjacency_list_and_product_models() -> None:
    """
    Verify Category adjacency list hierarchy and Product models with BigInteger price.
    """
    parent_cat_id = uuid.uuid4()
    parent_category = Category(
        id=parent_cat_id,
        name="Electronics",
        slug="electronics",
        icon_url="https://example.com/icons/electronics.png",
        is_active=True,
    )

    sub_category = Category(
        id=uuid.uuid4(),
        parent_id=parent_category.id,
        name="Smartphones",
        slug="smartphones",
        is_active=True,
    )
    parent_category.subcategories.append(sub_category)

    assert len(parent_category.subcategories) == 1
    assert parent_category.subcategories[0].name == "Smartphones"

    product = Product(
        id=uuid.uuid4(),
        category_id=sub_category.id,
        sku="PHN-X100-BLK",
        title="Smartphone X100 Black",
        description="Flagship smartphone",
        price=120_000_000,  # 120 million Rials
        stock_count=25,
        is_active=True,
    )
    assert product.price == 120_000_000
    assert isinstance(product.price, int)
    assert product.sku == "PHN-X100-BLK"


def test_order_items_and_transactions_models() -> None:
    """
    Verify Order, OrderItem, and Transaction domain models with JSONB snapshot and BigInteger financials.
    """
    user_id = uuid.uuid4()
    address_snapshot: Dict[str, Any] = {
        "title": "Home",
        "province": "Tehran",
        "city": "Tehran",
        "postal_code": "1234567890",
        "full_address": "Valiasr St, No. 10",
    }

    order = Order(
        id=uuid.uuid4(),
        user_id=user_id,
        total_price=120_000_000,
        status=OrderStatus.PENDING,
        address_snapshot=address_snapshot,
    )

    product_id = uuid.uuid4()
    item = OrderItem(
        id=uuid.uuid4(),
        order_id=order.id,
        product_id=product_id,
        quantity=1,
        unit_price_at_purchase=120_000_000,
    )
    order.items.append(item)

    transaction = Transaction(
        id=uuid.uuid4(),
        order_id=order.id,
        gateway_name="ZarinPal",
        amount=120_000_000,
        authority="A00000000000000000000000000000012345",
        status=TransactionStatus.PENDING,
    )
    order.transactions.append(transaction)

    assert order.status == OrderStatus.PENDING
    assert order.total_price == 120_000_000
    assert order.address_snapshot["city"] == "Tehran"
    assert len(order.items) == 1
    assert order.items[0].unit_price_at_purchase == 120_000_000
    assert len(order.transactions) == 1
    assert order.transactions[0].authority == "A00000000000000000000000000000012345"
    assert order.transactions[0].status == TransactionStatus.PENDING


@pytest.mark.asyncio
async def test_database_persistence_and_relationships(
    db_session: AsyncSession,
) -> None:
    """
    Integration test verifying complete database lifecycle with PostgreSQL.
    Tests model persistence, default UUID generation, timestamp tracking, and foreign keys.
    """
    session = db_session
    if True:
        # Create category hierarchy
        cat = Category(
            name="Test Category",
            slug=f"test-cat-{uuid.uuid4().hex[:8]}",
            is_active=True,
        )
        session.add(cat)
        await session.flush()

        assert cat.id is not None
        assert isinstance(cat.id, uuid.UUID)

        # Create product
        prod = Product(
            category_id=cat.id,
            sku=f"SKU-{uuid.uuid4().hex[:8]}",
            title="Test Product",
            price=250_000_000,  # 250M Rials
            stock_count=10,
            is_active=True,
        )
        session.add(prod)

        # Create user
        user = User(
            messenger_id=f"msg_{uuid.uuid4().hex[:12]}",
            phone="+989121111111",
            role=UserRole.CUSTOMER,
            wallet_balance=10_000_000,
        )
        session.add(user)
        await session.flush()

        assert user.id is not None
        assert isinstance(user.id, uuid.UUID)

        # Create address
        address = UserAddress(
            user_id=user.id,
            title="Office",
            province="Tehran",
            city="Tehran",
            postal_code="9876543210",
            full_address="Azadi Ave, Tech Park",
            is_default=True,
        )
        session.add(address)

        # Create order
        order = Order(
            user_id=user.id,
            total_price=250_000_000,
            status=OrderStatus.PENDING,
            address_snapshot={
                "title": address.title,
                "city": address.city,
                "full_address": address.full_address,
            },
        )
        session.add(order)
        await session.flush()

        # Create order item
        order_item = OrderItem(
            order_id=order.id,
            product_id=prod.id,
            quantity=1,
            unit_price_at_purchase=250_000_000,
        )
        session.add(order_item)

        # Create transaction
        tx = Transaction(
            order_id=order.id,
            gateway_name="ZarinPal",
            amount=250_000_000,
            authority=f"AUTH_{uuid.uuid4().hex}",
            status=TransactionStatus.PENDING,
        )
        session.add(tx)

        await session.commit()

        # Verify query and loaded data
        result = await session.execute(select(Order).where(Order.id == order.id))
        queried_order = result.scalar_one()
        assert queried_order.total_price == 250_000_000
        assert queried_order.status == OrderStatus.PENDING
        assert queried_order.created_at is not None
        assert queried_order.updated_at is not None
