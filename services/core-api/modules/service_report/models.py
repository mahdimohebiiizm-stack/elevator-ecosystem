# modules/service_report/models.py
import uuid
import enum
from sqlalchemy import Column, String, Float, Boolean, Integer, ForeignKey, Enum, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
from core.database import Base
from sqlalchemy.orm import relationship

# ==========================================
# Enums مربوط به فرم سرویس دوره‌ای (PM) و قطعات
# ==========================================
class PartActionEnum(enum.Enum):
    CONSUMED = "CONSUMED"   # مصرف شده (روغن و...)
    REPLACED = "REPLACED"   # تعویض شده
    REQUESTED = "REQUESTED" # درخواست خرید قطعه برای آینده

class MediaTypeEnum(enum.Enum):
    IMAGE = "IMAGE"
    AUDIO = "AUDIO"

class TaskStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELED = "CANCELED"
    # --- وضعیت‌های جدید اضافه شده برای مدیریت ماهانه ---
    CANCELED_BY_TECH = "CANCELED_BY_TECH" # لغو توسط تکنسین (مثلا در بسته بود)
    EXPIRED_MISSED = "EXPIRED_MISSED"     # منقضی و انجام‌نشده در پایان ماه

# ==========================================
# Enums مربوط به فرم تعمیرات اضطراری (BM)
# ==========================================
class BMDispatchReasonEnum(str, enum.Enum):
    MANAGER_DISPATCH = "MANAGER_DISPATCH" 
    EMPLOYER_CALL = "EMPLOYER_CALL"       
    COMPLEMENTARY = "COMPLEMENTARY"       
    QC_REPORT = "QC_REPORT"               

class BMArrivalStatusEnum(str, enum.Enum):
    RUNNING_NORMAL = "RUNNING_NORMAL"                 
    RUNNING_ABNORMAL = "RUNNING_ABNORMAL"             
    STOPPED_BY_KEY = "STOPPED_BY_KEY"                 
    NOISE_IN_MOTION = "NOISE_IN_MOTION"               
    STOPPED_DOOR_OPEN = "STOPPED_DOOR_OPEN"           
    STOPPED_DOOR_CLOSED = "STOPPED_DOOR_CLOSED"       
    STOPPED_BETWEEN_FLOORS = "STOPPED_BETWEEN_FLOORS" 

class BMCauseEnum(str, enum.Enum):
    END_OF_LIFE = "END_OF_LIFE"         
    ELECTRICAL_FAULT = "ELECTRICAL_FAULT" 
    MECHANICAL_FAULT = "MECHANICAL_FAULT" 
    IMPROPER_USE = "IMPROPER_USE"       
    VANDALISM = "VANDALISM"             
    EXTERNAL_FAULT = "EXTERNAL_FAULT"   
    UNKNOWN = "UNKNOWN"                 
    NO_FAULT = "NO_FAULT"               

class BMActionEnum(str, enum.Enum):
    CLEANING = "CLEANING"               
    TESTING = "TESTING"                 
    REPLACEMENT = "REPLACEMENT"         
    REPAIR = "REPAIR"                   
    TROUBLESHOOTING = "TROUBLESHOOTING" 
    ADJUSTMENT = "ADJUSTMENT"           
    RESTART = "RESTART"                 
    CUSTOMER_SUPPORT = "CUSTOMER_SUPPORT" 
    OTHER = "OTHER"                     

class ProjectStatusEnum(str, enum.Enum):
    RUNNING_OK = "RUNNING_OK"                 
    RUNNING_NEEDS_ACTION = "RUNNING_NEEDS_ACTION" 
    STOPPED_NEEDS_ACTION = "STOPPED_NEEDS_ACTION" 

# ==========================================
# جداول دیتابیس
# ==========================================
class ServiceReport(Base):
    __tablename__ = "service_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    elevator_id = Column(UUID(as_uuid=True), ForeignKey("elevators.id"))
    technician_id = Column(UUID(as_uuid=True)) 
    visit_time = Column(DateTime, default=datetime.utcnow)
    tech_lat = Column(Float, nullable=True) 
    tech_lng = Column(Float, nullable=True)
    
    is_emergency = Column(Boolean, default=False)
    description = Column(String, nullable=True)
    
    checklist = Column(JSONB, nullable=True) 
    
    bm_dispatch_reason = Column(Enum(BMDispatchReasonEnum), nullable=True)
    bm_arrival_status = Column(Enum(BMArrivalStatusEnum), nullable=True)
    bm_cause = Column(Enum(BMCauseEnum), nullable=True)
    bm_action = Column(Enum(BMActionEnum), nullable=True)
    project_status = Column(Enum(ProjectStatusEnum), nullable=True)
    employer_comments = Column(String, nullable=True) 

class ServicePart(Base):
    __tablename__ = "service_parts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("service_reports.id"))
    part_name = Column(String, nullable=False)
    action_type = Column(Enum(PartActionEnum), nullable=False)
    quantity = Column(Integer, default=1)
    description = Column(String, nullable=True)

class ServiceMedia(Base):
    __tablename__ = "service_media"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("service_reports.id"), nullable=False)
    file_path = Column(String, nullable=False) 
    media_type = Column(Enum(MediaTypeEnum), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

class TaskAssignment(Base):
    __tablename__ = "task_assignments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id"), nullable=False)
    technician_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False) 
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False) 
    task_date_shamsi = Column(String, nullable=False) 
    status = Column(Enum(TaskStatusEnum), default=TaskStatusEnum.PENDING)
    
    # --- فیلد جدید برای ثبت دلیل انجام نشدن کار توسط تکنسین ---
    cancel_reason = Column(String, nullable=True) 
    
    created_at = Column(DateTime, default=datetime.utcnow)
    building = relationship("Building")