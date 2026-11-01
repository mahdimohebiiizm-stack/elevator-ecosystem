# modules/finance/models.py
import uuid
import enum
from sqlalchemy import Column, String, Float, ForeignKey, Enum, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, date
from core.database import Base

class PaymentMethodEnum(enum.Enum):
    CASH = "CASH"           # نقدی
    CHECK = "CHECK"         # چک
    TRANSFER = "TRANSFER"   # کارت به کارت / واریز به حساب

class Payment(Base):
    __tablename__ = "payments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, default=date.today)
    payment_method = Column(Enum(PaymentMethodEnum), nullable=False)
    tracking_code = Column(String, nullable=True) # شماره چک یا فیش رسید
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # ارتباط با قرارداد
    contract = relationship("Contract", backref="payments")