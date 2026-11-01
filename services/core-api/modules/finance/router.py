# modules/finance/router.py
import io
import csv
from datetime import date, timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from core.database import get_db
from core.security import get_manager_user, get_admin_user
from modules.auth.models import User
from modules.contract.models import Contract
from . import schemas, models

router = APIRouter()

@router.post("/", response_model=schemas.PaymentResponse, status_code=status.HTTP_201_CREATED)
def register_payment(
    payment_data: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user)
):
    """ثبت پرداختی جدید و کسر خودکار از بدهی قرارداد (Atomic Transaction)"""
    contract = db.query(Contract).filter(Contract.id == payment_data.contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="قرارداد مورد نظر یافت نشد")

    new_payment = models.Payment(**payment_data.model_dump())
    db.add(new_payment)
    contract.total_debt -= payment_data.amount

    db.commit()
    db.refresh(new_payment)
    return new_payment

@router.get("/contract/{contract_id}", response_model=List[schemas.PaymentResponse])
def get_contract_payments(
    contract_id: UUID,
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user)
):
    """مشاهده لیست تمام پرداختی‌های یک قرارداد خاص"""
    payments = db.query(models.Payment).filter(models.Payment.contract_id == contract_id).order_by(models.Payment.created_at.desc()).all()
    return payments

@router.get("/transactions", summary="دریافت لیست تمام تراکنش‌ها و پرداختی‌های شرکت")
def get_all_transactions(
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user)
):
    """لیست ۲۰ تراکنش اخیر برای مانیتورینگ مالی مدیر"""
    payments = db.query(models.Payment).order_by(models.Payment.created_at.desc()).limit(20).all()
    result = []
    for p in payments:
        contract = p.contract
        result.append({
            "id": str(p.id),
            "amount": p.amount,
            "payment_date": str(p.payment_date),
            "payment_method": p.payment_method.value,
            "tracking_code": p.tracking_code,
            "description": p.description,
            "employer_name": contract.employer_name if contract and contract.employer_name else "ناشناس",
            "building_name": contract.building.name if contract and contract.building else "ساختمان نامشخص"
        })
    return result

# ==========================================
# دیتای نمودار گرافیکی درآمد (۷ روز اخیر)
# ==========================================
@router.get("/chart-data", summary="دیتای نمودار درآمد ۷ روز اخیر")
def get_chart_data(
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user)
):
    today = date.today()
    chart_data = []
    max_amount = 0.0

    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        
        daily_payments = db.query(models.Payment).filter(
            models.Payment.payment_date >= datetime.combine(target_date, datetime.min.time()),
            models.Payment.payment_date <= datetime.combine(target_date, datetime.max.time())
        ).all()
        
        daily_sum = sum(p.amount for p in daily_payments)
        
        if daily_sum > max_amount:
            max_amount = daily_sum

        chart_data.append({
            "day": target_date.strftime("%m/%d"), 
            "amount": daily_sum
        })

    return {"chart_data": chart_data, "max_amount": max_amount}

# ==========================================
# خروجی فایل اکسل (CSV) از کل تراکنش‌ها
# ==========================================
@router.get("/export-csv", summary="دانلود خروجی اکسل تراکنش‌ها")
def export_transactions_csv(
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user)
):
    payments = db.query(models.Payment).order_by(models.Payment.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=",")
    
    output.write('\ufeff') # پشتیبانی از زبان فارسی در اکسل
    writer.writerow(["شناسه تراکنش", "نام کارفرما", "مبلغ (تومان)", "تاریخ", "روش پرداخت", "کد پیگیری"])

    for p in payments:
        contract = p.contract
        employer = contract.employer_name if contract else "نامشخص"
        method = "نقدی" if p.payment_method.value == "CASH" else ("چک" if p.payment_method.value == "CHECK" else "واریز")
        writer.writerow([str(p.id), employer, int(p.amount), p.payment_date, method, p.tracking_code or "-"])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=financial_report.csv"}
    )