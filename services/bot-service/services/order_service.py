"""
Order service module delegating to CQRS commands and queries.
Preserves backward compatibility across Application Use Cases and Domain Services.
"""
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from db.models.order import Order, OrderStatus
from services.commands.order_command import (
    cancel_order_command,
    create_order_command,
)
from services.queries.order_query import (
    count_orders,
    get_order_by_id,
    get_order_by_id_or_fail,
    get_user_orders,
    list_orders,
)

# Backward-compatible aliases
create_order = create_order_command
cancel_order = cancel_order_command

__all__ = [
    "create_order",
    "create_order_command",
    "cancel_order",
    "cancel_order_command",
    "get_order_by_id",
    "get_order_by_id_or_fail",
    "get_user_orders",
    "list_orders",
    "count_orders",
]
