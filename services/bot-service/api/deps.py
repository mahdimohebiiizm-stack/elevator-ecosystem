"""
Aggregated dependencies module for presentation layer endpoints.
"""
from api.deps.idempotency import IdempotencyContext, check_webhook_idempotency
from api.deps.security import (
    get_current_admin_user,
    get_current_user,
    verify_webhook_security,
)
from api.deps.uow import get_uow
from api.deps.use_cases import (
    get_authenticate_bot_user_use_case,
    get_create_order_use_case,
    get_process_webhook_use_case,
)

__all__ = [
    "get_uow",
    "verify_webhook_security",
    "get_current_user",
    "get_current_admin_user",
    "check_webhook_idempotency",
    "IdempotencyContext",
    "get_create_order_use_case",
    "get_authenticate_bot_user_use_case",
    "get_process_webhook_use_case",
]
