# modules/finance/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from .models import PaymentMethodEnum

class PaymentCreate(BaseModel):
    contract_id: UUID
    amount: float = Field(..., gt=0, title="مبلغ پرداختی")
    payment_date: date = Field(default_factory=date.today)
    payment_method: PaymentMethodEnum
    tracking_code: Optional[str] = Field(None, title="شماره پیگیری/شماره چک")
    description: Optional[str] = None

class PaymentResponse(BaseModel):
    id: UUID
    contract_id: UUID
    amount: float
    payment_date: date
    payment_method: PaymentMethodEnum
    tracking_code: Optional[str]
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True