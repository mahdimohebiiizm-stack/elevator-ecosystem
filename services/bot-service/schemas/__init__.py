"""
Pydantic v2 schemas module exporting DTOs for User, Product, Order, and Webhook domains.
"""
from schemas.order import (
    OrderCreateRequest,
    OrderItemCreateRequest,
    OrderItemResponse,
    OrderResponse,
)
from schemas.payment import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentVerifyResponse,
)
from schemas.product import (
    CategoryBase,
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    ProductBase,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)
from schemas.ticket import (
    TicketCreate,
    TicketMessageCreate,
    TicketMessageResponse,
    TicketResponse,
    TicketStatusUpdateRequest,
)
from schemas.user import (
    BotAuthRequest,
    UserAddressBase,
    UserAddressCreate,
    UserAddressResponse,
    UserAddressUpdate,
    UserBase,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from schemas.webhook import WebhookPayload, WebhookResponse

__all__ = [
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "BotAuthRequest",
    "UserAddressBase",
    "UserAddressCreate",
    "UserAddressUpdate",
    "UserAddressResponse",
    "CategoryBase",
    "CategoryCreate",
    "CategoryUpdate",
    "CategoryResponse",
    "ProductBase",
    "ProductCreate",
    "ProductUpdate",
    "ProductResponse",
    "OrderCreateRequest",
    "OrderItemCreateRequest",
    "OrderItemResponse",
    "OrderResponse",
    "PaymentInitiateRequest",
    "PaymentInitiateResponse",
    "PaymentVerifyResponse",
    "WebhookPayload",
    "WebhookResponse",
]
