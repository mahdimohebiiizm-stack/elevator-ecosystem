from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from db.models.order import TransactionStatus


class PaymentInitiateRequest(BaseModel):
    """
    Contract for requesting a payment gateway session for an order.
    """

    order_id: uuid.UUID = Field(..., description="Target order identifier")
    callback_url: Optional[str] = Field(
        None, description="Optional override for payment return callback URL"
    )


class PaymentInitiateResponse(BaseModel):
    """
    Response returned to client containing banking redirect URL and authority code.
    """

    order_id: uuid.UUID
    authority: str
    payment_url: str
    amount: int = Field(..., gt=0, description="Monetary amount in Iranian Rials")

    model_config = ConfigDict(from_attributes=True)


class PaymentVerifyResponse(BaseModel):
    """
    Contract returned upon payment verification (callback or API inquiry).
    """

    order_id: uuid.UUID
    transaction_id: uuid.UUID
    ref_id: Optional[str] = None
    status: TransactionStatus
    message: str

    model_config = ConfigDict(from_attributes=True)
