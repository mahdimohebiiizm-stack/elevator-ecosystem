# modules/auth/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from .models import UserRoleEnum

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str           # <--- اضافه شد
    full_name: str      # <--- اضافه شد

class UserCreate(BaseModel):
    phone_number: str = Field(..., title="شماره موبایل")
    full_name: str = Field(..., title="نام و نام خانوادگی")
    password: str = Field(..., title="رمز عبور")
    role: UserRoleEnum = Field(default=UserRoleEnum.TECHNICIAN, title="نقش کاربر")

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRoleEnum] = None
    is_active: Optional[bool] = Field(None, title="وضعیت فعالیت (روشن/خاموش)")

class UserResponse(BaseModel):
    id: UUID
    full_name: str
    phone_number: str
    role: UserRoleEnum
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True