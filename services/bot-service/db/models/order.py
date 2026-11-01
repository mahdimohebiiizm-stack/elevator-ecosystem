from enum import Enum
from typing import TYPE_CHECKING, Any, Dict, List, Optional
import uuid

from sqlalchemy import (
    BigInteger,
    ForeignKey,
    Integer,
    String,
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base
from db.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from db.models.user import User
    from db.models.product import Product


class OrderStatus(str, Enum):
    """
    Lifecycle status progression for orders.
    """

    PENDING = "PENDING"
    PAID = "PAID"
    CANCELED = "CANCELED"
    SHIPPED = "SHIPPED"
    PENDING_QUOTATION = "PENDING_QUOTATION"
    PAYMENT_VERIFICATION = "PAYMENT_VERIFICATION"
    READY_FOR_PICKUP = "READY_FOR_PICKUP"


class TransactionStatus(str, Enum):
    """
    Payment gateway transaction execution status.
    """

    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class TransactionType(str, Enum):
    """
    Transaction category identifying order checkout or wallet deposit.
    """

    ORDER_PAYMENT = "ORDER_PAYMENT"
    WALLET_DEPOSIT = "WALLET_DEPOSIT"


class Order(Base, TimestampMixin):
    """
    Customer order domain entity.
    Stores financial total in Rials and immutable address snapshot.
    """

    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    total_price: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="Total order price in Iranian Rials",
    )
    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus, name="order_status"),
        default=OrderStatus.PENDING,
        nullable=False,
    )
    address_snapshot: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        comment="Immutable delivery address snapshot captured at order placement",
    )
    shipping_method: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tracking_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="orders",
    )
    items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction",
        back_populates="order",
        cascade="all, delete-orphan",
    )


class OrderItem(Base, TimestampMixin):
    """
    Ordered product line item.
    Captures snapshot of unit price in Rials at the exact moment of purchase.
    """

    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    unit_price_at_purchase: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="Immutable unit price snapshot in Iranian Rials at checkout",
    )

    # Relationships
    order: Mapped["Order"] = relationship(
        "Order",
        back_populates="items",
    )
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="order_items",
    )


class Transaction(Base, TimestampMixin):
    """
    Payment gateway transaction entity.
    Tracks banking verification codes, amounts in Rials, and gateway statuses.
    """

    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    gateway_name: Mapped[str] = mapped_column(String(50), nullable=False)
    amount: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="Transaction monetary amount in Iranian Rials",
    )
    authority: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    ref_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[TransactionStatus] = mapped_column(
        SQLEnum(TransactionStatus, name="transaction_status"),
        default=TransactionStatus.PENDING,
        nullable=False,
    )
    receipt_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    transaction_type: Mapped[TransactionType] = mapped_column(
        SQLEnum(TransactionType, name="transaction_type"),
        default=TransactionType.ORDER_PAYMENT,
        nullable=False,
    )

    # Relationships
    order: Mapped[Optional["Order"]] = relationship(
        "Order",
        back_populates="transactions",
    )
