import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, status

from api.deps.use_cases import (
    get_initiate_payment_use_case,
    get_verify_payment_use_case,
)
from application.use_cases.payment_use_cases import (
    InitiatePaymentUseCase,
    VerifyPaymentUseCase,
)
from schemas.payment import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentVerifyResponse,
)

logger = logging.getLogger("shopbot_backend.routers.payment")

router = APIRouter(prefix="/payment", tags=["Payment"])


@router.post(
    "/initiate",
    response_model=PaymentInitiateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate payment gateway session",
    description="Requests an authority token and payment redirect URL from the banking gateway for an order.",
)
async def initiate_payment(
    request_dto: PaymentInitiateRequest,
    use_case: InitiatePaymentUseCase = Depends(get_initiate_payment_use_case),
) -> PaymentInitiateResponse:
    """
    Traffic controller endpoint initiating order payment.
    Strictly delegates execution to InitiatePaymentUseCase with zero try-catch blocks.
    """
    return await use_case.execute(request_dto=request_dto)


@router.get(
    "/verify",
    response_model=PaymentVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Payment verification callback",
    description="Bank redirect webhook callback verifying settled transaction idempotently and with Redlock protection.",
)
async def verify_payment_callback(
    Authority: str = Query(
        ..., description="Unique payment authority token issued by banking gateway"
    ),
    Status: Optional[str] = Query(
        None, description="Payment result status reported by banking gateway (OK/NOK)"
    ),
    use_case: VerifyPaymentUseCase = Depends(get_verify_payment_use_case),
) -> PaymentVerifyResponse:
    """
    Traffic controller endpoint receiving bank callback redirection.
    Strictly delegates execution to VerifyPaymentUseCase with zero try-catch blocks.
    """
    return await use_case.execute(authority=Authority, bank_status=Status)


@router.post(
    "/verify",
    response_model=PaymentVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Programmatic payment verification",
    description="Allows direct API callers (e.g., bot clients or checkout apps) to verify transactions.",
)
async def verify_payment_direct(
    authority: str = Query(..., description="Unique payment authority token to verify"),
    status: Optional[str] = Query(None, description="Optional bank status string"),
    use_case: VerifyPaymentUseCase = Depends(get_verify_payment_use_case),
) -> PaymentVerifyResponse:
    """
    Traffic controller endpoint for programmatic payment verification.
    Strictly delegates execution to VerifyPaymentUseCase with zero try-catch blocks.
    """
    return await use_case.execute(authority=authority, bank_status=status)
