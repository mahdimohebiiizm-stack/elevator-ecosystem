import uuid
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from api.deps.security import get_current_admin_user
from api.deps.uow import get_uow
from api.v1.services.bot_notifier import BotNotificationService
from db.models.notification import Notification
from db.models.user import User
from infrastructure.db.uow import IUnitOfWork

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


class AdminNotifyUserRequest(BaseModel):
    user_id: uuid.UUID
    message: str = Field(..., min_length=1, max_length=4000)
    channel: Optional[str] = "ALL"


@router.post(
    "/notify-user",
    status_code=status.HTTP_200_OK,
    summary="Admin dispatches direct message to user via Bot and In-App",
    description="Secured by RBAC (Admin only). Sends outbound message to user's Telegram/Bale and creates an in-app Notification.",
)
async def admin_notify_user(
    payload: AdminNotifyUserRequest,
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> Dict[str, Any]:
    """
    Direct Omnichannel Notification Gateway from Admin to a Customer.
    Persists notification to database and attempts delivery over Telegram and Bale.
    """
    # 1. Lookup target user
    stmt = select(User).where(User.id == payload.user_id)
    result = await uow.session.execute(stmt)
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"کاربر با شناسه '{payload.user_id}' یافت نشد.",
        )

    clean_msg = payload.message.strip()
    if not clean_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="متن پیام نمی‌تواند خالی باشد.",
        )

    # 2. Persist in-app notification record
    notif = Notification(
        user_id=target_user.id,
        title="پیام مستقیم مدیریت آسانرو",
        message=clean_msg,
    )
    uow.session.add(notif)
    await uow.commit()

    # 3. Dispatches to Telegram and/or Bale via proactive bot notification service
    dispatched = await BotNotificationService.send_to_user(target_user, clean_msg)

    return {
        "status": "success",
        "message": "پیام با موفقیت به کاربر ارسال شد.",
        "user_id": str(target_user.id),
        "user_name": target_user.name,
        "phone": target_user.phone,
        "has_telegram": bool(target_user.telegram_id),
        "has_bale": bool(target_user.bale_id),
        "bot_dispatched": dispatched,
    }
