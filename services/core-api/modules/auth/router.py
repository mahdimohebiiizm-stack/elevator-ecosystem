# modules/auth/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from core.database import get_db
from core.security import verify_password, create_access_token, get_password_hash, get_admin_user
from . import schemas, models

router = APIRouter()

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """ورود به سیستم و دریافت توکن (کارت تردد)"""
    user = db.query(models.User).filter(models.User.phone_number == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="شماره موبایل یا رمز عبور اشتباه است")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="حساب کاربری شما توسط مدیریت غیرفعال شده است")
        
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # <--- اضافه شدن نقش و نام به خروجی لاگین --->
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role.value,
        "full_name": user.full_name
    }

# ==========================================
# بخش مدیریت پرسنل (مخصوص مدیر کل - ADMIN)
# ==========================================

@router.post("/users", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: schemas.UserCreate, 
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user) # قفل امنیتی ادمین
):
    """ثبت پرسنل جدید (تکنسین یا مدیر) توسط ادمین"""
    existing_user = db.query(models.User).filter(models.User.phone_number == user_data.phone_number).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="این شماره موبایل قبلاً در سیستم ثبت شده است")
        
    hashed_pw = get_password_hash(user_data.password)
    new_user = models.User(
        phone_number=user_data.phone_number,
        full_name=user_data.full_name,
        hashed_password=hashed_pw,
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/users", response_model=List[schemas.UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    """مشاهده لیست تمام پرسنل شرکت"""
    return db.query(models.User).all()

@router.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: UUID,
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user)
):
    """ویرایش اطلاعات پرسنل، تغییر نقش یا غیرفعال کردن (اخراج/مسدودسازی)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
        
    update_data = user_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
        
    db.commit()
    db.refresh(user)
    return user

# ==========================================
# ابزار توسعه‌دهنده (مسیر موقت)
# ==========================================
@router.put("/make-admin/{phone_number}", tags=["⚙️ Dev Tools"])
def make_user_admin(phone_number: str, db: Session = Depends(get_db)):
    """[مسیر موقت برای توسعه] ارتقای یک کاربر به سطح ادمین بدون نیاز به توکن"""
    user = db.query(models.User).filter(models.User.phone_number == phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="کاربری با این شماره یافت نشد")
    
    user.role = models.UserRoleEnum.ADMIN
    db.commit()
    db.refresh(user)
    return {"message": f"کاربر {phone_number} با موفقیت ادمین شد", "new_role": user.role}