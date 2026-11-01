"""
CQRS Read operations (Queries) for read replicas and high-throughput query segregation.
"""
from services.queries.order_query import (
    count_orders,
    get_order_by_id,
    get_order_by_id_or_fail,
    get_user_orders,
    list_orders,
)

__all__ = [
    "get_order_by_id",
    "get_order_by_id_or_fail",
    "get_user_orders",
    "list_orders",
    "count_orders",
]
