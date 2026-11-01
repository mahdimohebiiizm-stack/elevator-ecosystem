"""
Database models aggregator exposing all entities and enums for Alembic discovery and ORM operations.
"""
from db.models.mixins import TimestampMixin
from db.models.order import (
    Order,
    OrderItem,
    OrderStatus,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from db.models.outbox import OutboxEvent
from db.models.product import Category, Product
from db.models.service import (
    Contract,
    Elevator,
    ServiceRequest,
    ServiceRequestStatus,
    ServiceRequestType,
)
from db.models.ticket import (
    Ticket,
    TicketMessage,
    TicketPriority,
    TicketStatus,
)
from db.models.cms import SiteSetting
from db.models.notification import Notification
from db.models.contract import ServiceContract, ContractStatus
from db.models.user import User, UserAddress, UserRole

__all__ = [
    "TimestampMixin",
    "User",
    "UserAddress",
    "UserRole",
    "Category",
    "Product",
    "Order",
    "OrderItem",
    "Transaction",
    "OrderStatus",
    "TransactionStatus",
    "TransactionType",
    "OutboxEvent",
    "Elevator",
    "Contract",
    "ServiceRequest",
    "ServiceRequestType",
    "ServiceRequestStatus",
    "Ticket",
    "TicketMessage",
    "TicketPriority",
    "TicketStatus",
    "SiteSetting",
    "Notification",
    "ServiceContract",
    "ContractStatus",
]
