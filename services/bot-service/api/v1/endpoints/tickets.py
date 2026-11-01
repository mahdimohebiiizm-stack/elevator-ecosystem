import logging
from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from api.deps.security import get_current_admin_user, get_current_user
from api.deps.uow import get_uow
from api.v1.services.bot_notifier import BotNotificationService
from db.models.ticket import Ticket, TicketMessage, TicketPriority, TicketStatus
from db.models.notification import Notification
from db.models.user import User, UserRole
from infrastructure.db.uow import IUnitOfWork
from schemas.ticket import (
    TicketCreate,
    TicketMessageCreate,
    TicketMessageResponse,
    TicketResponse,
    TicketStatusUpdateRequest,
)

logger = logging.getLogger("shopbot_backend.routers.tickets")

router = APIRouter(prefix="/tickets", tags=["CRM & Support Tickets"])


# ==============================================================================
# STATIC ROUTES (MUST BE DECLARED BEFORE DYNAMIC /{ticket_id} TO PREVENT CONFLICTS)
# ==============================================================================


@router.post(
    "",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new support ticket",
    description="Registers a new customer ticket with an initial message in a single atomic transaction.",
)
async def create_ticket(
    payload: TicketCreate,
    current_user: User = Depends(get_current_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> TicketResponse:
    clean_subject = payload.subject.strip()
    clean_content = payload.content.strip()

    if not clean_subject:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="عنوان تیکت نمی‌تواند خالی باشد.",
        )
    if not clean_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="متن پیام تیکت نمی‌تواند خالی باشد.",
        )

    ticket = Ticket(
        user_id=current_user.id,
        subject=clean_subject,
        status=TicketStatus.OPEN,
        priority=payload.priority or TicketPriority.MEDIUM,
    )
    uow.session.add(ticket)
    await uow.session.flush()

    message = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        content=clean_content,
        is_from_admin=False,
    )
    uow.session.add(message)
    await uow.commit()

    # Proactive Push Notification Hook to Admins
    await BotNotificationService.notify_admins(
        f"🎫 **آلارم جدید:** یک تیکت جدید با موضوع «{clean_subject[:35]}» از سوی {current_user.name or current_user.phone} ثبت شد.",
        uow.session,
    )

    # Eagerly load relationships to prevent N+1 queries
    stmt = (
        select(Ticket)
        .where(Ticket.id == ticket.id)
        .options(
            joinedload(Ticket.user),
            selectinload(Ticket.messages).joinedload(TicketMessage.sender),
        )
    )
    res = await uow.session.execute(stmt)
    return res.scalar_one()


@router.get(
    "/my",
    response_model=List[TicketResponse],
    status_code=status.HTTP_200_OK,
    summary="List customer's support tickets",
    description="Fetches all tickets opened by the authenticated customer ordered by last activity.",
)
async def get_my_tickets(
    current_user: User = Depends(get_current_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> List[TicketResponse]:
    stmt = (
        select(Ticket)
        .where(Ticket.user_id == current_user.id)
        .order_by(Ticket.updated_at.desc())
        .options(
            joinedload(Ticket.user),
            selectinload(Ticket.messages).joinedload(TicketMessage.sender),
        )
    )
    res = await uow.session.execute(stmt)
    return list(res.scalars().all())


@router.get(
    "/admin",
    response_model=List[TicketResponse],
    status_code=status.HTTP_200_OK,
    summary="List all tickets for Admin CRM",
    description="Secured by RBAC (Admin only). Fetches all support tickets with eager user and message relations.",
)
async def get_admin_tickets(
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> List[TicketResponse]:
    stmt = (
        select(Ticket)
        .order_by(Ticket.updated_at.desc())
        .options(
            joinedload(Ticket.user),
            selectinload(Ticket.messages).joinedload(TicketMessage.sender),
        )
    )
    res = await uow.session.execute(stmt)
    return list(res.scalars().all())


@router.post(
    "/admin/{ticket_id}/reply",
    response_model=TicketMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin replies to a ticket",
    description="Secured by RBAC (Admin only). Appends an admin reply message and updates ticket status to REPLIED.",
)
async def admin_reply_to_ticket(
    ticket_id: uuid.UUID,
    payload: TicketMessageCreate,
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> TicketMessageResponse:
    clean_content = payload.content.strip()
    if not clean_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="متن پاسخ ادمین نمی‌تواند خالی باشد.",
        )

    stmt = select(Ticket).where(Ticket.id == ticket_id)
    res = await uow.session.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"تیکت با شناسه '{ticket_id}' یافت نشد.",
        )

    msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_admin.id,
        content=clean_content,
        is_from_admin=True,
    )
    ticket.status = TicketStatus.REPLIED
    uow.session.add(msg)

    # Event Trigger: auto-create user notification for customer
    notif = Notification(
        user_id=ticket.user_id,
        title=f"پاسخ پشتیبانی به تیکت: {ticket.subject[:35]}",
        message=f"پاسخ جدیدی برای تیکت «{ticket.subject[:30]}» ثبت شد.",
    )
    uow.session.add(notif)
    await uow.commit()

    # Proactive Push Notification Hook to User
    ticket_user_stmt = select(User).where(User.id == ticket.user_id)
    ticket_user = (await uow.session.execute(ticket_user_stmt)).scalar_one_or_none()
    if ticket_user:
        await BotNotificationService.send_to_user(
            ticket_user,
            f"💬 **پاسخ پشتیبانی به تیکت شما:**\n\nموضوع: {ticket.subject}\nپاسخ کارشناس:\n{clean_content}",
        )

    msg_stmt = (
        select(TicketMessage)
        .where(TicketMessage.id == msg.id)
        .options(joinedload(TicketMessage.sender))
    )
    msg_res = await uow.session.execute(msg_stmt)
    return msg_res.scalar_one()


@router.patch(
    "/admin/{ticket_id}/status",
    response_model=TicketResponse,
    status_code=status.HTTP_200_OK,
    summary="Admin updates ticket status",
    description="Secured by RBAC (Admin only). Modifies ticket progression status (OPEN, IN_PROGRESS, REPLIED, CLOSED).",
)
async def admin_update_ticket_status(
    ticket_id: uuid.UUID,
    payload: TicketStatusUpdateRequest,
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> TicketResponse:
    stmt = select(Ticket).where(Ticket.id == ticket_id)
    res = await uow.session.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"تیکت با شناسه '{ticket_id}' یافت نشد.",
        )

    ticket.status = payload.status
    await uow.commit()

    # Proactive Push Notification Hook to User
    status_map = {
        TicketStatus.OPEN: "باز / در انتظار بررسی",
        TicketStatus.IN_PROGRESS: "در حال بررسی فنی",
        TicketStatus.REPLIED: "پاسخ داده شده",
        TicketStatus.CLOSED: "بسته شده",
    }
    friendly_tkt_status = status_map.get(ticket.status, str(ticket.status.value))
    ticket_user_stmt = select(User).where(User.id == ticket.user_id)
    ticket_user = (await uow.session.execute(ticket_user_stmt)).scalar_one_or_none()
    if ticket_user:
        await BotNotificationService.send_to_user(
            ticket_user,
            f"🎫 **تغییر وضعیت تیکت پشتیبانی:**\n\nموضوع: {ticket.subject}\nوضعیت جدید: «{friendly_tkt_status}»",
        )

    full_stmt = (
        select(Ticket)
        .where(Ticket.id == ticket_id)
        .options(
            joinedload(Ticket.user),
            selectinload(Ticket.messages).joinedload(TicketMessage.sender),
        )
    )
    full_res = await uow.session.execute(full_stmt)
    return full_res.scalar_one()


# ==============================================================================
# PARAMETRIC CUSTOMER / THREAD ROUTES
# ==============================================================================


@router.get(
    "/{ticket_id}",
    response_model=TicketResponse,
    status_code=status.HTTP_200_OK,
    summary="Get ticket details by ID",
    description="Fetches full ticket thread. Customers can only view their own tickets; admins can view any ticket.",
)
async def get_ticket_by_id(
    ticket_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> TicketResponse:
    stmt = (
        select(Ticket)
        .where(Ticket.id == ticket_id)
        .options(
            joinedload(Ticket.user),
            selectinload(Ticket.messages).joinedload(TicketMessage.sender),
        )
    )
    res = await uow.session.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"تیکت با شناسه '{ticket_id}' یافت نشد.",
        )

    is_admin = current_user.role == UserRole.ADMIN or current_user.role == "ADMIN"
    if ticket.user_id != current_user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="دسترسی غیرمجاز. شما مجاز به مشاهده این تیکت نمی‌باشید.",
        )

    return ticket


@router.post(
    "/{ticket_id}/reply",
    response_model=TicketMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Customer replies to a ticket",
    description="Adds a new message to the ticket thread and updates ticket status to OPEN.",
)
async def customer_reply_to_ticket(
    ticket_id: uuid.UUID,
    payload: TicketMessageCreate,
    current_user: User = Depends(get_current_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> TicketMessageResponse:
    clean_content = payload.content.strip()
    if not clean_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="متن پیام نمی‌تواند خالی باشد.",
        )

    stmt = select(Ticket).where(Ticket.id == ticket_id)
    res = await uow.session.execute(stmt)
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"تیکت با شناسه '{ticket_id}' یافت نشد.",
        )

    is_admin = current_user.role == UserRole.ADMIN or current_user.role == "ADMIN"
    if ticket.user_id != current_user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="دسترسی غیرمجاز. شما مجاز به ارسال پاسخ در این تیکت نمی‌باشید.",
        )

    msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        content=clean_content,
        is_from_admin=is_admin,
    )
    ticket.status = TicketStatus.OPEN
    uow.session.add(msg)
    await uow.commit()

    msg_stmt = (
        select(TicketMessage)
        .where(TicketMessage.id == msg.id)
        .options(joinedload(TicketMessage.sender))
    )
    msg_res = await uow.session.execute(msg_stmt)
    return msg_res.scalar_one()
