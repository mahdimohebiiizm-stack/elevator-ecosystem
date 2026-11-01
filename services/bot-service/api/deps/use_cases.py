from fastapi import Depends

from api.deps.uow import get_uow
from application.use_cases.order_use_cases import CreateOrderUseCase
from application.use_cases.payment_use_cases import (
    InitiatePaymentUseCase,
    VerifyPaymentUseCase,
)
from application.use_cases.user_use_cases import AuthenticateBotUserUseCase
from application.use_cases.webhook_use_cases import ProcessWebhookUseCase
from infrastructure.db.uow import IUnitOfWork


def get_create_order_use_case(
    uow: IUnitOfWork = Depends(get_uow),
) -> CreateOrderUseCase:
    """Dependency provider injecting CreateOrderUseCase with UnitOfWork."""
    return CreateOrderUseCase(uow=uow)


def get_authenticate_bot_user_use_case(
    uow: IUnitOfWork = Depends(get_uow),
) -> AuthenticateBotUserUseCase:
    """Dependency provider injecting AuthenticateBotUserUseCase with UnitOfWork."""
    return AuthenticateBotUserUseCase(uow=uow)


def get_process_webhook_use_case(
    uow: IUnitOfWork = Depends(get_uow),
) -> ProcessWebhookUseCase:
    """Dependency provider injecting ProcessWebhookUseCase with UnitOfWork."""
    return ProcessWebhookUseCase(uow=uow)


def get_initiate_payment_use_case(
    uow: IUnitOfWork = Depends(get_uow),
) -> InitiatePaymentUseCase:
    """Dependency provider injecting InitiatePaymentUseCase with UnitOfWork."""
    return InitiatePaymentUseCase(uow=uow)


def get_verify_payment_use_case(
    uow: IUnitOfWork = Depends(get_uow),
) -> VerifyPaymentUseCase:
    """Dependency provider injecting VerifyPaymentUseCase with UnitOfWork."""
    return VerifyPaymentUseCase(uow=uow)
