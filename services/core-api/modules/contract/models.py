# modules/contract/models.py
import uuid
import enum
from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

class ContractStatusEnum(str, enum.Enum):
    PENDING = "PENDING"       # در انتظار کارشناسی / پیش‌فاکتور
    QUOTED = "QUOTED"         # پیش‌فاکتور صادر شده
    ACTIVE = "ACTIVE"         # قرارداد فعال و تایید شده
    EXPIRED = "EXPIRED"       # پایان مدت قرارداد
    CANCELED = "CANCELED"     # فسخ / لغو شده

# === ساختار دوره و نحوه پرداخت ===
class PaymentFrequencyEnum(str, enum.Enum):
    MONTHLY = "MONTHLY"       # یک ماهه
    QUARTERLY = "QUARTERLY"   # سه ماهه
    FLEXIBLE = "FLEXIBLE"     # زمان نامشخص / منعطف

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id"), nullable=False)
    contract_number = Column(String, unique=True, index=True, nullable=True)
    
    employer_name = Column(String, nullable=False)
    employer_national_id = Column(String, nullable=True) # کد ملی / شناسه ملی کارفرما
    employer_phone = Column(String, nullable=True) # تلفن تماس رسمی کارفرما
    
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    
    total_amount = Column(Float, default=0.0) # مبلغ کل قرارداد (ریال)
    monthly_fee = Column(Float, default=0.0) # شهریه ماهانه سرویس
    total_debt = Column(Float, default=0.0) # مانده بدهی معوقه
    
    status = Column(Enum(ContractStatusEnum), default=ContractStatusEnum.PENDING)
    payment_frequency = Column(Enum(PaymentFrequencyEnum), default=PaymentFrequencyEnum.FLEXIBLE)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    building = relationship("Building", back_populates="contracts")
