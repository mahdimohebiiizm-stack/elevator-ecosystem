# modules/service_report/router.py
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import date
from typing import List
from uuid import UUID
from core.database import get_db
from core.security import get_current_user, get_admin_user
from modules.auth.models import User
from shared.storage import save_file
from shared.sms_provider import send_sms_background
from . import schemas, models

from modules.building.models import Elevator
from modules.contract.models import Contract, ContractStatusEnum

router = APIRouter()

@router.post("/", response_model=schemas.ServiceReportResponse, status_code=status.HTTP_201_CREATED)
def create_service_report(
    report_data: schemas.ServiceReportCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ثبت گزارش سرویس جدید (با پشتیبانی از چک‌لیست ۲۵ گانه و منطق شرایط اضطراری)"""
    elevator = db.query(Elevator).filter(Elevator.id == report_data.elevator_id).first()
    if not elevator:
        raise HTTPException(status_code=404, detail="آسانسور مورد نظر یافت نشد")

    contract = db.query(Contract).filter(
        Contract.building_id == elevator.building_id,
        Contract.status == ContractStatusEnum.ACTIVE
    ).order_by(Contract.end_date.desc()).first()

    # اعمال قوانین قرارداد فقط در صورتی که شرایط اضطراری نباشد
    if not report_data.is_emergency:
        if not contract:
            raise HTTPException(status_code=403, detail="هیچ قرارداد فعالی برای این ساختمان ثبت نشده است. اجازه ثبت گزارش ندارید.")

        if contract.end_date < date.today():
            raise HTTPException(status_code=403, detail=f"قرارداد این ساختمان در تاریخ {contract.end_date} منقضی شده است. لطفا جهت تمدید به مدیریت ارجاع دهید.")

    parts_data = report_data.parts_used
    report_dict = report_data.model_dump(exclude={"parts_used"}) 
    
    new_report = models.ServiceReport(technician_id=str(current_user.id), **report_dict)
    db.add(new_report)
    db.flush() 
    
    for part in parts_data:
        new_part = models.ServicePart(
            report_id=new_report.id,
            part_name=part.part_name,
            action_type=part.action_type,
            quantity=part.quantity,
            description=part.description
        )
        db.add(new_part)
    
    db.commit()
    db.refresh(new_report)

    # 👈 پیدا کردن شماره موبایل کارفرما و ارسال پیامک تشکر
    building = db.query(Elevator).filter(Elevator.id == report_data.elevator_id).first().building
    
    employer_phone = None
    if contract and contract.employer_phone:
        employer_phone = contract.employer_phone
    elif building and building.manager_phone:
        employer_phone = building.manager_phone

    if employer_phone:
        b_name = building.name if building else "نامشخص"
        status_text = "اضطراری (خرابی)" if report_data.is_emergency else "سرویس دوره‌ای"
        tech_name = current_user.full_name
        
        sms_text = f"مدیریت محترم ساختمان {b_name}\nگزارش {status_text} آسانسور شما توسط تکنسین ({tech_name}) با موفقیت ثبت گردید.\nشرکت آسانسور"
        
        background_tasks.add_task(send_sms_background, employer_phone, sms_text)

    return new_report

@router.get("/", response_model=List[schemas.ServiceReportResponse])
def get_all_reports(
    skip: int = 0, limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """دریافت لیست کلی تمام گزارش‌ها"""
    reports = db.query(models.ServiceReport).order_by(models.ServiceReport.visit_time.desc()).offset(skip).limit(limit).all()
    return reports

@router.get("/elevator/{elevator_id}/history", response_model=List[schemas.ServiceReportResponse])
def get_elevator_history(
    elevator_id: UUID,
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """دریافت سوابق و پرونده پزشکی یک آسانسور خاص برای تکنسین‌ها"""
    reports = db.query(models.ServiceReport).filter(
        models.ServiceReport.elevator_id == elevator_id
    ).order_by(models.ServiceReport.visit_time.desc()).offset(skip).limit(limit).all()
    
    return reports

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service_report(
    report_id: UUID, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """حذف گزارش (فقط ادمین)"""
    report = db.query(models.ServiceReport).filter(models.ServiceReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="گزارش مورد نظر یافت نشد")
    
    db.delete(report)
    db.commit()
    return None

@router.post("/{report_id}/media", status_code=status.HTTP_201_CREATED)
async def upload_report_media(
    report_id: UUID,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """آپلود همزمان چندین عکس یا فایل صوتی برای یک گزارش خاص"""
    report = db.query(models.ServiceReport).filter(models.ServiceReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="گزارش مورد نظر یافت نشد")
        
    uploaded_records = []
    
    for file in files:
        if file.content_type.startswith("image/"):
            media_type = models.MediaTypeEnum.IMAGE
            folder = "images"
        elif file.content_type.startswith("audio/") or file.content_type in ["video/mp4", "video/webm"]:
            media_type = models.MediaTypeEnum.AUDIO
            folder = "audio"
        else:
            raise HTTPException(status_code=400, detail=f"فرمت فایل {file.filename} پشتیبانی نمی‌شود")
            
        file_path = await save_file(file, folder)
        
        new_media = models.ServiceMedia(
            report_id=report.id,
            file_path=file_path,
            media_type=media_type
        )
        db.add(new_media)
        uploaded_records.append(new_media)
        
    db.commit()
    return {"message": f"{len(uploaded_records)} فایل با موفقیت برای گزارش ضمیمه شد"}