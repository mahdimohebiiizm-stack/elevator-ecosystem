"""
Service layer encapsulating domain business logic, CQRS commands/queries, and ACID transaction orchestration.
"""
from services.commands.order_command import (
    cancel_order_command,
    create_order_command,
)
from services.order_service import cancel_order, create_order
from services.queries.order_query import (
    count_orders,
    get_order_by_id,
    get_order_by_id_or_fail,
    get_user_orders,
    list_orders,
)
from services.user_service import authenticate_bot_user

__all__ = [
    "authenticate_bot_user",
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
