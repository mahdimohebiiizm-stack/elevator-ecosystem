# modules/analytics/notifications_router.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
# ایمپورت کردن نوع داده UUID برای هماهنگی با جدول users
from sqlalchemy.dialects.postgresql import UUID as PGUUID 
from core.database import get_db, Base
from core.security import get_current_user
from modules.auth.models import User
import uuid
import datetime
import enum

router = APIRouter()

# 1. تعریف مدل جدول اعلانات
class NotificationType(str, enum.Enum):
    ASSIGN = "assign"    
    CANCEL = "cancel"    
    SYSTEM = "system"    
    FINANCE = "finance"  

class Notification(Base):
    __tablename__ = "notifications"

    # هر دو فیلد id و user_id باید از نوع UUID باشند
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False) 
    title = Column(String, nullable=False)
    body = Column(String, nullable=False)
    type = Column(SQLEnum(NotificationType), default=NotificationType.SYSTEM)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# 2. دریافت لیست پیام‌های کاربر لاگین شده
@router.get("/", summary="دریافت پیام‌ها و اعلانات من")
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(30).all()
    
    result = []
    for n in notifs:
        diff = datetime.datetime.utcnow() - n.created_at
        hours = diff.total_seconds() // 3600
        time_str = f"{int(hours)} ساعت پیش" if hours > 0 else "لحظاتی پیش"

        result.append({
            "id": str(n.id),
            "title": n.title,
            "body": n.body,
            "type": n.type.value,
            "is_read": n.is_read,
            "time": time_str
        })
    return result

# 3. مارک کردن یک پیام به عنوان خوانده شده
@router.put("/{notif_id}/read", summary="تغییر وضعیت پیام به خوانده شده")
def mark_notification_read(
    notif_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "success"}

# 4. تابع کمکی برای تولید اتوماتیک پیام
def create_notification(db: Session, user_id: str, title: str, body: str, n_type: NotificationType):
    new_notif = Notification(
        user_id=user_id,
        title=title,
        body=body,
        type=n_type
    )
    db.add(new_notif)