import logging
from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from api.deps.security import get_current_admin_user, get_current_user
from api.deps.uow import get_uow
from api.v1.services.bot_notifier import BotNotificationService
from db.models.contract import ServiceContract, ContractStatus
from db.models.notification import Notification
from db.models.user import User, UserRole
from infrastructure.db.uow import IUnitOfWork
from schemas.contract import (
    ContractAdminUpdate,
    ContractCreate,
    ContractResponse,
)

logger = logging.getLogger("shopbot_backend.routers.contracts")

router = APIRouter(prefix="/contracts", tags=["Service & Maintenance Contracts"])


# ==============================================================================
# STATIC ROUTES
# ==============================================================================


@router.post(
    "",
    response_model=ContractResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit elevator service contract wizard",
    description="Registers a new customer contract request and triggers real-time notification to the admin.",
)
async def create_service_contract(
    payload: ContractCreate,
    current_user: User = Depends(get_current_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> ContractResponse:
    address = payload.building_address.strip()
    elevator_type = payload.elevator_type.strip()
    speed = payload.speed_ms.strip()

    if not address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="آدرس ساختمان الزامی است.",
        )
    if not elevator_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="نوع آسانسور الزامی است.",
        )

    contract = ServiceContract(
        user_id=current_user.id,
        building_address=address,
        building_name=payload.building_name.strip() if payload.building_name else None,
        postal_code=payload.postal_code.strip() if payload.postal_code else None,
        registration_plate=payload.registration_plate.strip() if payload.registration_plate else None,
        employer_national_id=payload.employer_national_id.strip() if payload.employer_national_id else None,
        elevator_type=elevator_type,
        stops_count=payload.stops_count,
        capacity_kg=payload.capacity_kg,
        speed_ms=speed,
        usage_type=payload.usage_type or "مسافری",
        payment_frequency=payload.payment_frequency or "FLEXIBLE",
        status=ContractStatus.PENDING,
    )
    uow.session.add(contract)
    await uow.session.flush()

    # Trigger notification to all Admin users
    admin_stmt = select(User).where(User.role == UserRole.ADMIN)
    admin_res = await uow.session.execute(admin_stmt)
    admins = admin_res.scalars().all()

    sender_label = current_user.name or current_user.phone or "مشتری سامانه"
    for admin in admins:
        notif = Notification(
            user_id=admin.id,
            title="درخواست قرارداد سرویس جدید",
            message=f"درخواست سرویس و نگهداری آسانسور توسط {sender_label} برای ساختمانی در «{address[:40]}» ثبت شد.",
        )
        uow.session.add(notif)

    await uow.commit()

    # Proactive Push Notification Hook to Admins
    await BotNotificationService.notify_admins(
        f"🏢 **آلارم جدید:** یک درخواست قرارداد سرویس از سوی {sender_label} برای ساختمانی در «{address[:35]}» ثبت شد.",
        uow.session,
    )

    # Eagerly reload with user relationship
    stmt = (
        select(ServiceContract)
        .where(ServiceContract.id == contract.id)
        .options(joinedload(ServiceContract.user))
    )
    res = await uow.session.execute(stmt)
    return res.scalar_one()


@router.get(
    "/my",
    response_model=List[ContractResponse],
    status_code=status.HTTP_200_OK,
    summary="Get customer service contracts",
    description="Returns all elevator service and maintenance contracts submitted by current customer.",
)
async def get_my_contracts(
    current_user: User = Depends(get_current_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> List[ContractResponse]:
    stmt = (
        select(ServiceContract)
        .where(ServiceContract.user_id == current_user.id)
        .options(joinedload(ServiceContract.user))
        .order_by(ServiceContract.created_at.desc())
    )
    res = await uow.session.execute(stmt)
    return res.scalars().all()


@router.get(
    "/admin",
    response_model=List[ContractResponse],
    status_code=status.HTTP_200_OK,
    summary="Admin list all service contracts",
    description="Secured by RBAC (Admin only). Returns all elevator service contracts across all customers.",
)
async def admin_get_all_contracts(
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> List[ContractResponse]:
    stmt = (
        select(ServiceContract)
        .options(joinedload(ServiceContract.user))
        .order_by(ServiceContract.created_at.desc())
    )
    res = await uow.session.execute(stmt)
    return res.scalars().all()


# ==============================================================================
# PARAMETERIZED ROUTES
# ==============================================================================


@router.patch(
    "/admin/{contract_id}",
    response_model=ContractResponse,
    status_code=status.HTTP_200_OK,
    summary="Admin review, quote or update service contract",
    description="Secured by RBAC (Admin only). Updates annual_price, start_date, and status, and triggers real-time customer notification.",
)
async def admin_update_contract(
    contract_id: uuid.UUID,
    payload: ContractAdminUpdate,
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> ContractResponse:
    stmt = (
        select(ServiceContract)
        .where(ServiceContract.id == contract_id)
        .options(joinedload(ServiceContract.user))
    )
    res = await uow.session.execute(stmt)
    contract = res.scalar_one_or_none()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"قرارداد با شناسه '{contract_id}' یافت نشد.",
        )

    if payload.building_name is not None:
        contract.building_name = payload.building_name
    if payload.postal_code is not None:
        contract.postal_code = payload.postal_code
    if payload.registration_plate is not None:
        contract.registration_plate = payload.registration_plate
    if payload.employer_national_id is not None:
        contract.employer_national_id = payload.employer_national_id
    if payload.elevator_type is not None:
        contract.elevator_type = payload.elevator_type
    if payload.stops_count is not None:
        contract.stops_count = payload.stops_count
    if payload.capacity_kg is not None:
        contract.capacity_kg = payload.capacity_kg
    if payload.speed_ms is not None:
        contract.speed_ms = payload.speed_ms
    if payload.usage_type is not None:
        contract.usage_type = payload.usage_type
    if payload.monthly_fee is not None:
        contract.monthly_fee = payload.monthly_fee
    if payload.total_debt is not None:
        contract.total_debt = payload.total_debt
    if payload.payment_frequency is not None:
        contract.payment_frequency = payload.payment_frequency

    if payload.annual_price is not None:
        contract.annual_price = payload.annual_price
    if payload.tax_amount is not None:
        contract.tax_amount = payload.tax_amount
    if payload.start_date is not None:
        contract.start_date = payload.start_date
    if payload.end_date is not None:
        contract.end_date = payload.end_date

    # State Machine: Automated Quotation Transition with Manual Override Precedence
    has_valid_quote = payload.annual_price is not None and payload.annual_price > 0
    if contract.status == ContractStatus.PENDING and has_valid_quote:
        if payload.status is None or payload.status == ContractStatus.PENDING:
            contract.status = ContractStatus.QUOTED
        else:
            contract.status = payload.status
    elif payload.status is not None:
        contract.status = payload.status

    # Trigger customer notification
    status_persian_map = {
        ContractStatus.PENDING: "در انتظار بررسی",
        ContractStatus.QUOTED: "برآورد هزینه و قیمت‌گذاری شده",
        ContractStatus.ACTIVE: "فعال و تایید شده",
        ContractStatus.REJECTED: "عدم تایید / رد شده",
        ContractStatus.EXPIRED: "پایان مدت قرارداد",
    }
    status_title = status_persian_map.get(contract.status, contract.status.value)
    price_info = (
        f" مبلغ برآورد سالیانه: {int(contract.annual_price):,} تومان."
        if contract.annual_price
        else ""
    )
    notif = Notification(
        user_id=contract.user_id,
        title="بروزرسانی وضعیت قرارداد آسانسور",
        message=f"وضعیت قرارداد سرویس ساختمان شما به «{status_title}» تغییر یافت.{price_info}",
    )
    uow.session.add(notif)
    await uow.commit()

    # Proactive Push Notification Hook to User
    if contract.user:
        await BotNotificationService.send_to_user(
            contract.user,
            f"🏢 **بروزرسانی وضعیت قرارداد آسانسور**\n\nوضعیت قرارداد سرویس ساختمان شما به «{status_title}» تغییر یافت.{price_info}",
        )

    # Re-fetch full contract
    res = await uow.session.execute(stmt)
    return res.scalar_one()
