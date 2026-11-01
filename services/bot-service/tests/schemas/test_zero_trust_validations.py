import uuid
import pytest
from pydantic import ValidationError

from schemas.order import OrderCreateRequest, OrderItemCreateRequest
from schemas.product import ProductCreate, ProductUpdate
from schemas.user import (
    BotAuthRequest,
    UserAddressBase,
    UserAddressCreate,
    UserCreate,
    UserUpdate,
)


def test_user_schema_zero_trust_messenger_id() -> None:
    """
    Test that messenger_id strictly enforces the regex pattern ^[a-zA-Z0-9_\\-\\:]{3,64}$.
    """
    # Valid messenger IDs
    user_valid = UserCreate(
        messenger_id="tg_123456789",
        phone="+989123456789",
    )
    assert user_valid.messenger_id == "tg_123456789"

    # Too short (< 3 chars)
    with pytest.raises(ValidationError):
        UserCreate(messenger_id="ab")

    # Invalid special characters
    with pytest.raises(ValidationError):
        UserCreate(messenger_id="tg<script>alert(1)</script>")

    with pytest.raises(ValidationError):
        UserCreate(messenger_id="user@domain.com")


def test_user_schema_zero_trust_phone() -> None:
    """
    Test that phone strictly enforces E.164 pattern ^\\+?[0-9]{10,15}$.
    """
    # Valid phone
    user = UserCreate(
        messenger_id="tg_123456789",
        phone="+989123456789",
    )
    assert user.phone == "+989123456789"

    # Invalid phone (letters)
    with pytest.raises(ValidationError):
        UserCreate(messenger_id="tg_123456789", phone="invalid_phone")

    # Invalid phone (too short)
    with pytest.raises(ValidationError):
        UserCreate(messenger_id="tg_123456789", phone="123")


def test_user_schema_zero_trust_wallet_balance() -> None:
    """
    Test that wallet_balance enforces ge=0.
    """
    # Valid wallet balance
    user = UserCreate(
        messenger_id="tg_123456789",
        wallet_balance=0,
    )
    assert user.wallet_balance == 0

    # Negative balance should fail
    with pytest.raises(ValidationError):
        UserCreate(
            messenger_id="tg_123456789",
            wallet_balance=-1000,
        )


def test_address_schema_zero_trust_postal_code() -> None:
    """
    Test that postal_code enforces exactly 10 digits ^[0-9]{10}$.
    """
    # Valid 10-digit postal code
    addr = UserAddressBase(
        title="Home",
        province="Tehran",
        city="Tehran",
        postal_code="1234567890",
        full_address="Sample street address",
    )
    assert addr.postal_code == "1234567890"

    # Invalid postal code (less than 10 digits)
    with pytest.raises(ValidationError):
        UserAddressBase(
            title="Home",
            province="Tehran",
            city="Tehran",
            postal_code="12345",
            full_address="Sample street address",
        )

    # Invalid postal code (contains letters)
    with pytest.raises(ValidationError):
        UserAddressBase(
            title="Home",
            province="Tehran",
            city="Tehran",
            postal_code="123456789a",
            full_address="Sample street address",
        )


def test_product_schema_zero_trust_price_and_stock() -> None:
    """
    Test that product price enforces gt=0 and stock_count enforces ge=0.
    """
    cat_id = uuid.uuid4()

    # Valid product
    prod = ProductCreate(
        category_id=cat_id,
        sku="TEST-SKU-1",
        title="Laptop",
        price=100_000_000,
        stock_count=5,
    )
    assert prod.price == 100_000_000

    # Price = 0 or negative must fail (gt=0)
    with pytest.raises(ValidationError):
        ProductCreate(
            category_id=cat_id,
            sku="TEST-SKU-2",
            title="Laptop",
            price=0,
            stock_count=5,
        )

    with pytest.raises(ValidationError):
        ProductCreate(
            category_id=cat_id,
            sku="TEST-SKU-3",
            title="Laptop",
            price=-500,
            stock_count=5,
        )

    # Negative stock count must fail (ge=0)
    with pytest.raises(ValidationError):
        ProductCreate(
            category_id=cat_id,
            sku="TEST-SKU-4",
            title="Laptop",
            price=1000,
            stock_count=-1,
        )


def test_order_item_schema_zero_trust_quantity() -> None:
    """
    Test that order item quantity enforces gt=0.
    """
    # Valid quantity
    item = OrderItemCreateRequest(
        product_id=uuid.uuid4(),
        quantity=1,
    )
    assert item.quantity == 1

    # Quantity 0 or negative must fail
    with pytest.raises(ValidationError):
        OrderItemCreateRequest(
            product_id=uuid.uuid4(),
            quantity=0,
        )

    with pytest.raises(ValidationError):
        OrderItemCreateRequest(
            product_id=uuid.uuid4(),
            quantity=-5,
        )
