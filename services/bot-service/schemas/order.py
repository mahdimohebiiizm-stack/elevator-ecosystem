from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from db.models.order import OrderStatus, TransactionStatus, TransactionType


class OrderItemCreateRequest(BaseModel):
    """
    Contract for specifying an item in an order placement request.
    """

    product_id: uuid.UUID = Field(..., description="Target product UUID identifier")
    quantity: int = Field(
        ..., gt=0, description="Quantity of product to purchase (must be > 0)"
    )


class OrderCreateRequest(BaseModel):
    """
    Contract for placing a new customer order.
    """

    user_id: uuid.UUID = Field(..., description="Customer user UUID identifier")
    items: List[OrderItemCreateRequest] = Field(
        ..., min_length=1, description="List of items to order"
    )
    address_snapshot: Dict[str, Any] = Field(
        ..., description="Delivery address snapshot data"
    )


class OrderItemResponse(BaseModel):
    """
    Presentation DTO for an order line item.
    """

    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int = Field(..., gt=0, description="Purchased item quantity")
    unit_price_at_purchase: int = Field(
        ..., gt=0, description="Immutable snapshot price in Iranian Rials"
    )
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    """
    Presentation DTO for a customer order with items.
    """

    id: uuid.UUID
    user_id: uuid.UUID
    total_price: int = Field(
        ..., gt=0, description="Aggregate order total in Iranian Rials (BigInteger)"
    )
    status: OrderStatus
    address_snapshot: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = Field(
        default_factory=list, description="Order line items"
    )

    model_config = ConfigDict(from_attributes=True)


class AdminOrderUserResponse(BaseModel):
    """
    Nested customer summary for Admin ERP order views.
    """

    id: uuid.UUID
    phone: Optional[str] = None
    messenger_id: Optional[str] = None
    name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminOrderTransactionResponse(BaseModel):
    """
    Nested payment transaction details for Admin auditing.
    """

    id: uuid.UUID
    status: TransactionStatus
    gateway_name: str
    amount: int
    authority: str
    ref_id: Optional[str] = None
    receipt_url: Optional[str] = None
    transaction_type: TransactionType
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminOrderItemProductResponse(BaseModel):
    """
    Nested product summary within an order item.
    """

    id: uuid.UUID
    sku: str
    title: str

    model_config = ConfigDict(from_attributes=True)


class AdminOrderItemResponse(BaseModel):
    """
    Order line item for Admin ERP views.
    """

    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int = Field(..., gt=0)
    unit_price_at_purchase: int
    created_at: datetime
    product: Optional[AdminOrderItemProductResponse] = None

    model_config = ConfigDict(from_attributes=True)


class AdminOrderResponse(BaseModel):
    """
    Comprehensive Order DTO for Admin ERP monitoring and fulfillment operations.
    Directly aligns with frontend OrderDto contract.
    """

    id: uuid.UUID
    user_id: uuid.UUID
    total_price: int
    status: OrderStatus
    shipping_method: Optional[str] = None
    tracking_code: Optional[str] = None
    address_snapshot: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    user: Optional[AdminOrderUserResponse] = None
    transactions: List[AdminOrderTransactionResponse] = Field(default_factory=list)
    items: List[AdminOrderItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class AdminOrderStatusUpdateRequest(BaseModel):
    """
    Contract for Admin changing order status and optionally matching transaction status.
    """

    status: Optional[OrderStatus] = None
    tracking_code: Optional[str] = None
    transaction_id: Optional[uuid.UUID] = None
    transaction_status: Optional[TransactionStatus] = None


class AdminBulkOrderStatusRequest(BaseModel):
    """
    Contract for Admin changing status of multiple orders simultaneously.
    """

    order_ids: List[uuid.UUID] = Field(
        ..., min_length=1, description="List of order UUIDs to update"
    )
    new_status: OrderStatus = Field(..., description="Target status to apply")


class AdminBulkOrderResponse(BaseModel):
    """
    Response summarizing the number of orders updated.
    """

    affected_count: int
    message: str

