import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update

from api.deps.security import get_current_user
from api.deps.uow import get_uow
from db.models.notification import Notification
from db.models.user import User
from infrastructure.db.uow import IUnitOfWork
from schemas.notification import NotificationListResponse, NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "/my",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get notifications for current authenticated user",
    description="Returns all notifications belonging to the logged-in user, sorted chronologically with unread count.",
)
async def get_my_notifications(
    current_user: User = Depends(get_current_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> NotificationListResponse:
    """
    Fetch notifications for the current authenticated user.
    """
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    result = await uow.session.execute(stmt)
    notifications = result.scalars().all()

    unread_stmt = (
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )
    unread_count_res = await uow.session.execute(unread_stmt)
    unread_count = unread_count_res.scalar() or 0

    return NotificationListResponse(
        items=[NotificationResponse.model_validate(n) for n in notifications],
        unread_count=unread_count,
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark single notification as read",
)
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> NotificationResponse:
    """
    Mark a notification as read.
    """
    try:
        notif_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"شناسه اعلان نامعتبر است: {notification_id}",
        )

    stmt = select(Notification).where(
        Notification.id == notif_uuid,
        Notification.user_id == current_user.id,
    )
    result = await uow.session.execute(stmt)
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="اعلان مورد نظر یافت نشد.",
        )

    notif.is_read = True
    await uow.commit()
    await uow.session.refresh(notif)
    return NotificationResponse.model_validate(notif)


@router.patch(
    "/read-all",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark all user notifications as read",
)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> NotificationListResponse:
    """
    Mark all unread notifications of the current user as read.
    """
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    await uow.session.execute(stmt)
    await uow.commit()

    return await get_my_notifications(current_user=current_user, uow=uow)
