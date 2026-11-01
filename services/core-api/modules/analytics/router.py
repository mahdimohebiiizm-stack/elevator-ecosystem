# modules/analytics/router.py
import jdatetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from datetime import datetime, timedelta, date
from pydantic import BaseModel
from uuid import UUID

from core.database import get_db
from core.security import get_manager_user, get_current_user
from modules.auth.models import User

from modules.building.models import Building
from modules.contract.models import Contract, ContractStatusEnum, PaymentFrequencyEnum
from modules.finance.models import Payment
from modules.service_report.models import ServiceReport, TaskAssignment, TaskStatusEnum

from .notifications_router import create_notification, NotificationType
from shared.sms_provider import send_sms_background

router = APIRouter()

class TaskAssignCreate(BaseModel):
    building_id: UUID
    technician_id: UUID
    task_date_shamsi: str 

class TaskExplanationCreate(BaseModel):
    explanation: str

@router.get("/summary", summary="دریافت آمار کلی داشبورد شرکت و معوقات مالی")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user) 
):
    total_buildings = db.query(Building).filter(Building.is_deleted == False).count()
    active_contracts = db.query(Contract).filter(Contract.status == ContractStatusEnum.ACTIVE).count()

    total_market_debt = db.query(func.sum(Contract.total_debt)).scalar() or 0.0
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_income = db.query(func.sum(Payment.amount)).filter(Payment.created_at >= thirty_days_ago).scalar() or 0.0

    emergency_cases = db.query(ServiceReport).filter(ServiceReport.is_emergency == True).count()
    recent_services = db.query(ServiceReport).filter(ServiceReport.visit_time >= thirty_days_ago).count()

    overdue_contracts = []
    all_active = db.query(Contract).filter(Contract.status == ContractStatusEnum.ACTIVE).all()
    
    for contract in all_active:
        if contract.total_debt <= 0:
            continue

        last_payment = db.query(Payment).filter(Payment.contract_id == contract.id).order_by(Payment.payment_date.desc()).first()
        base_date = last_payment.payment_date if last_payment else contract.start_date
        
        days_passed = (date.today() - base_date).days
        is_overdue = False

        if contract.payment_frequency == PaymentFrequencyEnum.MONTHLY and days_passed > 30:
            is_overdue = True
        elif contract.payment_frequency == PaymentFrequencyEnum.QUARTERLY and days_passed > 90:
            is_overdue = True
            
        if is_overdue:
            overdue_contracts.append({
                "contract_id": str(contract.id),
                "employer_name": contract.employer_name,
                "building_name": contract.building.name if contract.building else "نامشخص",
                "debt_amount": contract.total_debt,
                "days_passed": days_passed,
                "frequency": "ماهانه" if contract.payment_frequency == PaymentFrequencyEnum.MONTHLY else "سه‌ماهه"
            })

    return {
        "business": {
            "total_buildings": total_buildings,
            "active_contracts": active_contracts
        },
        "finance": {
            "total_market_debt": total_market_debt,
            "income_last_30_days": recent_income,
            "overdue_contracts": overdue_contracts
        },
        "technical": {
            "emergency_rescues": emergency_cases,
            "services_last_30_days": recent_services
        }
    }

@router.post("/assign-task", summary="تخصیص ساختمان به تکنسین (مخصوص مدیر)")
def assign_task_to_technician(
    data: TaskAssignCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user)
):
    contract = db.query(Contract).filter(
        Contract.building_id == data.building_id,
        Contract.status == ContractStatusEnum.ACTIVE
    ).first()
    
    if not contract:
        raise HTTPException(status_code=400, detail="اخطار: این ساختمان فاقد قرارداد فعال است. ارجاع کار مجاز نیست.")

    active_assignments = db.query(TaskAssignment).filter(
        TaskAssignment.building_id == data.building_id,
        TaskAssignment.status == TaskStatusEnum.PENDING
    ).all()

    if len(active_assignments) >= 2:
        raise HTTPException(status_code=400, detail="ظرفیت این ساختمان تکمیل است (حداکثر ۲ تکنسین).")

    for assignment in active_assignments:
        if str(assignment.technician_id) == str(data.technician_id):
            raise HTTPException(status_code=400, detail="این تکنسین قبلاً به این ساختمان ارجاع داده شده است.")

    new_task = TaskAssignment(
        building_id=data.building_id,
        technician_id=data.technician_id,
        assigned_by=manager.id,
        task_date_shamsi=data.task_date_shamsi,
        status=TaskStatusEnum.PENDING
    )
    db.add(new_task)

    building = db.query(Building).filter(Building.id == data.building_id).first()
    b_name = building.name if building else "نامشخص"
    
    technician = db.query(User).filter(User.id == data.technician_id).first()

    create_notification(
        db=db,
        user_id=str(data.technician_id),
        title="ارجاع ماموریت جدید",
        body=f"یک سرویس دوره‌ای برای «{b_name}» در تاریخ {data.task_date_shamsi} به شما ارجاع داده شد.",
        n_type=NotificationType.ASSIGN
    )

    db.commit()

    if technician and technician.phone_number:
        sms_text = f"همکار گرامی، ماموریت جدید برای ساختمان «{b_name}» در تاریخ {data.task_date_shamsi} به شما ارجاع شد.\nشرکت آسانسور"
        background_tasks.add_task(send_sms_background, technician.phone_number, sms_text)

    return {"message": "ماموریت ارجاع داده شد و پیامک به تکنسین ارسال گردید.", "status": "success"}

@router.get("/technician-tasks", summary="دریافت لیست تمام ماموریت‌های معلق تکنسین")
def get_technician_pending_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignments = db.query(TaskAssignment).filter(
        TaskAssignment.technician_id == current_user.id,
        or_(
            TaskAssignment.status == TaskStatusEnum.PENDING,
            and_(
                TaskAssignment.status == TaskStatusEnum.EXPIRED_MISSED,
                TaskAssignment.cancel_reason == None
            )
        )
    ).all()
    
    tasks = []
    for task in assignments:
        building = task.building
        if building and not building.is_deleted:
            tasks.append({
                "assignment_id": str(task.id),
                "building_id": str(building.id),
                "name": building.name,
                "address": building.address,
                "location_lat": building.location_lat,
                "location_lng": building.location_lng,
                "task_date": task.task_date_shamsi,
                "status": task.status.value
            })
            
    tasks.sort(key=lambda x: 0 if x["status"] == "EXPIRED_MISSED" else 1)
    return tasks

@router.post("/tasks/{assignment_id}/explanation", summary="ثبت توضیح برای تسک انجام‌‌نشده و بستن آن")
def submit_task_explanation(
    assignment_id: UUID,
    data: TaskExplanationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(TaskAssignment).filter(
        TaskAssignment.id == assignment_id,
        TaskAssignment.technician_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="ماموریت یافت نشد.")
        
    task.cancel_reason = data.explanation
    task.status = TaskStatusEnum.CANCELED

    b_name = task.building.name if task.building else "نامشخص"
    create_notification(
        db=db,
        user_id=str(task.assigned_by), 
        title="لغو ماموریت توسط تکنسین",
        body=f"تکنسین ({current_user.full_name}) ماموریت «{b_name}» را با این دلیل لغو کرد: {data.explanation}",
        n_type=NotificationType.CANCEL
    )

    db.commit()
    return {"message": "توضیحات ثبت شد و مدیر در جریان قرار گرفت.", "status": "success"}

@router.get("/assignments", summary="دریافت لیست تمام ارجاعات (مخصوص مدیر)")
def get_all_assignments(
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user)
):
    assignments = db.query(TaskAssignment).all()
    result = []
    for task in assignments:
        result.append({
            "id": str(task.id),
            "building_id": str(task.building_id),
            "technician_id": str(task.technician_id),
            "assigned_by": str(task.assigned_by),
            "task_date_shamsi": task.task_date_shamsi,
            "status": task.status.value,
            "cancel_reason": task.cancel_reason
        })
    return result

@router.delete("/assignments/{assignment_id}", summary="حذف یک ارجاع (مخصوص مدیر)")
def delete_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user)
):
    task = db.query(TaskAssignment).filter(TaskAssignment.id == assignment_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="ارجاع مورد نظر یافت نشد")
    
    b_name = task.building.name if task.building else "نامشخص"
    create_notification(
        db=db,
        user_id=str(task.technician_id),
        title="حذف ماموریت",
        body=f"ماموریت شما برای ساختمان «{b_name}» توسط مدیریت شرکت لغو و حذف گردید.",
        n_type=NotificationType.CANCEL
    )

    db.delete(task)
    db.commit()
    return {"message": "ارجاع لغو و پیام به تکنسین ارسال شد"}