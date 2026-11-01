# modules/contract/schemas.py
from pydantic import BaseModel, Field, UUID4
from typing import Optional
from datetime import date, datetime
from .models import ContractStatusEnum, PaymentFrequencyEnum

class ContractCreate(BaseModel):
    building_id: UUID4
    contract_number: Optional[str] = None
    employer_name: str = Field(..., title="نام کارفرما")
    employer_national_id: Optional[str] = Field(None, title="کد ملی / شناسه ملی کارفرما")
    employer_phone: Optional[str] = Field(None, title="شماره تماس کارفرما")
    start_date: Optional[date] = Field(None, title="تاریخ شروع قرارداد")
    end_date: Optional[date] = Field(None, title="تاریخ پایان قرارداد")
    total_amount: float = Field(default=0.0, ge=0, title="مبلغ کل")
    monthly_fee: float = Field(default=0.0, ge=0, title="مبلغ ماهیانه")
    status: Optional[ContractStatusEnum] = Field(default=ContractStatusEnum.PENDING, title="وضعیت قرارداد")
    payment_frequency: PaymentFrequencyEnum = Field(default=PaymentFrequencyEnum.FLEXIBLE, title="دوره پرداخت")

class ContractUpdate(BaseModel):
    contract_number: Optional[str] = None
    employer_name: Optional[str] = None
    employer_national_id: Optional[str] = None
    employer_phone: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_amount: Optional[float] = None
    monthly_fee: Optional[float] = None
    total_debt: Optional[float] = None
    status: Optional[ContractStatusEnum] = None
    payment_frequency: Optional[PaymentFrequencyEnum] = None

class ContractResponse(BaseModel):
    id: UUID4
    building_id: UUID4
    contract_number: Optional[str] = None
    employer_name: str
    employer_national_id: Optional[str] = None
    employer_phone: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_amount: float
    monthly_fee: float
    total_debt: float
    status: ContractStatusEnum
    payment_frequency: PaymentFrequencyEnum
    created_at: datetime

    class Config:
        from_attributes = True
