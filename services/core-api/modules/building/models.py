# modules/building/models.py
import uuid
from sqlalchemy import Column, String, Float, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base

class Building(Base):
    __tablename__ = "buildings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    postal_code = Column(String, nullable=True) # کد پستی ۱۰ رقمی ساختمان
    registration_plate = Column(String, nullable=True) # پلاک ثبتی یا شهرداری ملک
    location_lat = Column(Float, nullable=True) # مختصات عرض جغرافیایی نقشه
    location_lng = Column(Float, nullable=True) # مختصات طول جغرافیایی نقشه
    manager_name = Column(String, nullable=True) # نام مدیر ساختمان / کارفرما
    manager_national_id = Column(String, nullable=True) # کد ملی مدیر / شناسه ملی کارفرما
    manager_phone = Column(String, nullable=True) # تلفن تماس مدیر
    is_deleted = Column(Boolean, default=False)

    # ارتباط با قراردادها و آسانسورها
    contracts = relationship("Contract", back_populates="building")
    elevators = relationship("Elevator", back_populates="building", cascade="all, delete-orphan")

class Elevator(Base):
    __tablename__ = "elevators"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id"))
    type = Column(String, nullable=True) # نوع: کششی، هیدرولیک، روملس و ...
    stops = Column(Integer, nullable=True) # تعداد توقف
    capacity_kg = Column(Integer, nullable=True, default=600) # ظرفیت بار (کیلوگرم)
    speed_ms = Column(Float, nullable=True, default=1.0) # سرعت نامی بر حسب متر بر ثانیه
    usage_type = Column(String, nullable=True, default="مسافری") # کاربری: مسافری، باربری، بیمارستانی، خودروبر
    qr_code_hash = Column(
        String,
        unique=True,
        index=True,
        default=lambda: f"ELV-{uuid.uuid4().hex[:8].upper()}"
    ) # کد یکتای روی برچسب کابین

    building = relationship("Building", back_populates="elevators")
