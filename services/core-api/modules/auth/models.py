# modules/auth/models.py
import uuid
import enum
from sqlalchemy import Column, String, Boolean, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from core.database import Base

class UserRoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"             # مدیر کل شرکت (دسترسی به همه چیز)
    MANAGER = "MANAGER"         # مدیر عملیات (دسترسی به گزارش‌ها)
    TECHNICIAN = "TECHNICIAN"   # تکنسین (دسترسی به چک‌لیست‌ها و آسانسورهای خودش)
    CUSTOMER = "CUSTOMER"       # کارفرما / مشتری سامانه آنلاین

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    phone_number = Column(String, unique=True, index=True, nullable=False) # شماره موبایل برای لاگین
    hashed_password = Column(String, nullable=False) # رمز عبور هش شده (امنیت)
    role = Column(Enum(UserRoleEnum), default=UserRoleEnum.TECHNICIAN)
    is_active = Column(Boolean, default=True) # اگر تکنسینی اخراج شد، False می‌شود
    created_at = Column(DateTime, default=datetime.utcnow)
