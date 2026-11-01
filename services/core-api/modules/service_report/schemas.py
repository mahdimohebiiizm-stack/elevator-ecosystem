# modules/service_report/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID
import enum

# ایمپورت Enum های جدید از مدل
from .models import (
    PartActionEnum,
    BMDispatchReasonEnum,
    BMArrivalStatusEnum,
    BMCauseEnum,
    BMActionEnum,
    ProjectStatusEnum
)

# --- وضعیت‌های استاندارد برای چک‌لیست ---
class CheckStatusEnum(str, enum.Enum):
    OK = "OK"                     # سالم / انجام شد
    NEEDS_REPAIR = "NEEDS_REPAIR" # نیاز به تعمیر/سرویس
    DEFECTIVE = "DEFECTIVE"       # معیوب
    NOT_CHECKED = "NOT_CHECKED"   # بررسی نشد

# --- طرح‌‌واره (Schema) دقیق چک‌لیست ۲۵ گانه سرویس ---
class PMChecklist(BaseModel):
    item_01_cabin_light: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۱. روشنایی کابین")
    item_02_sill_cleanliness: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۲. تمیزی پاخور کابین و طبقات")
    item_03_indicators_fan: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۳. نمراتور، اعلام طبقات، فن و آژیر")
    item_04_cabin_vibration: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۴. لرزش و صدای حرکت کابین")
    item_05_door_shoes: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۵. عملکرد لته‌های درب و کفشک درب")
    item_06_floor_call: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۶. عملکرد احضار طبقات")
    item_07_leveling: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۷. توقف لول طبقات")
    item_08_safety_circuit: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۸. تست مدار سری ایمنی کنتاکت‌ها و قفل‌ها")
    item_09_door_dictator: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۹. تست عملکرد دیکتاتور و خودبسته شدن")
    item_10_inspection_movement: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۱۰. عملکرد قارچی، رویزیون و حرکت بالا/پایین")
    item_11_roof_cleanliness: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۱۱. تمیزی سقف کابین")
    item_12_wiring_tidiness: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۱۲. مرتب بودن سیم‌های رویزیون و قفل‌ها")
    item_13_oilers: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۱۳. پر بودن روغندان کابین و وزنه")
    item_14_ropes_attachments: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۱۴. درمهره، اشپیل و کرپی سربکسل")
    item_15_shoes_tightening: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۱۵. آچارکشی لرزه‌‌گیرها و کفشک‌ها")
    item_16_brackets_tightening: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۱۶. آچارکشی پشت‌بندها و براکت‌ها")
    item_17_sensors_magnets: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۱۷. تمیزی سنسور و آهنرباهای دورانداز")
    item_18_microswitches_parachute: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۱۸. تست میکروسوئیچ‌های پاراشوت و حد")
    item_19_contactors_relays: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۱۹. عملکرد کنتاکتورها و رله‌های تابلو")
    item_20_emergency_rescue: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۲۰. تست نجات اضطراری")
    item_21_motor_brake: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۲۱. عملکرد دسته و فک ترمز موتور")
    item_22_motor_grooves: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۲۲. بازدید شیار موتور و قطر سیم‌بکسل")
    item_23_governor: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۲۳. تست گاورنر و میکروسوئیچ گاورنر")
    item_24_motor_oil: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۲۴. چک کردن روغن موتور")
    item_25_engine_room_ventilation: CheckStatusEnum = Field(default=CheckStatusEnum.NOT_CHECKED, title="۲۵. روشنایی و تهویه موتورخانه")

# --- طرح‌واره برای قطعات (ورودی) ---
class ServicePartCreate(BaseModel):
    part_name: str = Field(..., title="نام قطعه", min_length=2)
    action_type: PartActionEnum
    quantity: int = Field(default=1, gt=0)
    description: Optional[str] = None

# --- طرح‌‌واره برای ثبت کل فرم (ترکیب PM و BM) ---
class ServiceReportCreate(BaseModel):
    elevator_id: UUID
    tech_lat: Optional[float] = Field(None, title="مختصات عرض جغرافیایی تکنسین")
    tech_lng: Optional[float] = Field(None, title="مختصات طول جغرافیایی تکنسین")
    
    is_emergency: bool = Field(default=False, title="آیا این فرم تعمیرات اضطراری (BM) است؟")
    description: Optional[str] = Field(None, title="توضیحات تکمیلی تکنسین")
    
    # فیلدهای مربوط به فرم سرویس دوره‌ای (PM)
    checklist: Optional[PMChecklist] = Field(None, title="چک‌لیست سرویس ماهانه")
    
    # فیلدهای مربوط به فرم تعمیرات اضطراری (BM)
    bm_dispatch_reason: Optional[BMDispatchReasonEnum] = Field(None, title="علت مراجعه")
    bm_arrival_status: Optional[BMArrivalStatusEnum] = Field(None, title="وضعیت هنگام مراجعه")
    bm_cause: Optional[BMCauseEnum] = Field(None, title="علت خرابی")
    bm_action: Optional[BMActionEnum] = Field(None, title="اقدام انجام شده")
    project_status: Optional[ProjectStatusEnum] = Field(None, title="وضعیت هنگام ترک پروژه")
    employer_comments: Optional[str] = Field(None, title="نظرات کارفرما")
    
    parts_used: List[ServicePartCreate] = Field(default=[], title="قطعات مصرفی/تعویضی")

# --- طرح‌واره برای نمایش خروجی ---
class ServiceReportResponse(ServiceReportCreate):
    id: UUID
    technician_id: UUID
    visit_time: datetime

    class Config:
        from_attributes = True