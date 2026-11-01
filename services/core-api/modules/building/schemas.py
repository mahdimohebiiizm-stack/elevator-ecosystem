# modules/building/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

# --- اسکمای پایه برای آسانسور ---
class ElevatorBase(BaseModel):
    type: Optional[str] = Field(None, title="نوع آسانسور")
    stops: Optional[int] = Field(None, title="تعداد توقف")
    capacity_kg: Optional[int] = Field(default=600, title="ظرفیت (کیلوگرم)")
    speed_ms: Optional[float] = Field(default=1.0, title="سرعت نامی (متر بر ثانیه)")
    usage_type: Optional[str] = Field(default="مسافری", title="نوع کاربری آسانسور")
    qr_code_hash: Optional[str] = Field(None, title="کد یکتای کابین")

class ElevatorCreate(ElevatorBase):
    pass

class ElevatorUpdate(BaseModel):
    type: Optional[str] = None
    stops: Optional[int] = None
    capacity_kg: Optional[int] = None
    speed_ms: Optional[float] = None
    usage_type: Optional[str] = None
    qr_code_hash: Optional[str] = None

class ElevatorResponse(ElevatorBase):
    id: UUID
    building_id: UUID

    class Config:
        from_attributes = True

# --- اسکمای پایه برای ساختمان ---
class BuildingBase(BaseModel):
    name: str = Field(..., title="نام ساختمان")
    address: Optional[str] = Field(None, title="آدرس")
    postal_code: Optional[str] = Field(None, title="کد پستی ۱۰ رقمی")
    registration_plate: Optional[str] = Field(None, title="پلاک ثبتی یا شهرداری")
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    manager_name: Optional[str] = Field(None, title="نام مدیر")
    manager_national_id: Optional[str] = Field(None, title="کد ملی مدیر / شناسه ملی کارفرما")
    manager_phone: Optional[str] = Field(None, title="تلفن مدیر")

class BuildingCreate(BuildingBase):
    pass

# اسکمای مخصوص آپدیت (تمام فیلدها اختیاری شده‌اند)
class BuildingUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    registration_plate: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    manager_name: Optional[str] = None
    manager_national_id: Optional[str] = None
    manager_phone: Optional[str] = None

class BuildingResponse(BuildingBase):
    id: UUID
    is_deleted: bool

    class Config:
        from_attributes = True
