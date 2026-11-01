import logging
from pathlib import Path
import shutil
from typing import Any, Dict, List
import uuid
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from api.deps.security import get_current_admin_user, get_current_user
from api.deps.uow import get_uow
from api.deps.use_cases import get_create_order_use_case
from api.v1.services.bot_notifier import BotNotificationService
from application.use_cases.order_use_cases import CreateOrderUseCase
from db.models.order import (
    Order,
    OrderItem,
    OrderStatus,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from db.models.notification import Notification
from db.models.user import User, UserRole
from infrastructure.db.uow import IUnitOfWork
from schemas.order import (
    AdminBulkOrderResponse,
    AdminBulkOrderStatusRequest,
    AdminOrderResponse,
    AdminOrderStatusUpdateRequest,
    OrderCreateRequest,
    OrderResponse,
)
from services.queries.order_query import list_admin_orders

logger = logging.getLogger("shopbot_backend.routers.orders")

router = APIRouter(prefix="/orders", tags=["Orders"])


async def dispatch_order_notification_background(
    order_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    """Non-blocking background task simulating asynchronous order notification dispatch."""
    logger.info(
        f"Background notification queued for order {order_id} (Customer: {user_id})"
    )


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create and place a new customer order",
    description="Processes order items, validates inventory stock with row-level locks, and creates an order record.",
)
async def create_new_order(
    request_dto: OrderCreateRequest,
    background_tasks: BackgroundTasks,
    use_case: CreateOrderUseCase = Depends(get_create_order_use_case),
) -> OrderResponse:
    """
    Traffic controller endpoint for customer order placement.
    Strictly delegates execution to CreateOrderUseCase with zero try-catch blocks.
    """
    order_response: OrderResponse = await use_case.execute(request_dto=request_dto)

    # Offload non-critical asynchronous notification task
    background_tasks.add_task(
        dispatch_order_notification_background,
        order_response.id,
        order_response.user_id,
    )

    return order_response


@router.get(
    "/admin/all",
    response_model=List[AdminOrderResponse],
    status_code=status.HTTP_200_OK,
    summary="List all customer orders for ERP Admin portal",
    description="Secured by RBAC (Admin only). Returns all orders with eager-loaded user, transactions, and items.",
)
async def get_all_admin_orders(
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> List[AdminOrderResponse]:
    """
    Retrieves all customer orders and contracts for the Admin ERP dashboard.
    Enforces Role-Based Access Control and zero N+1 query overhead.
    """
    orders = await list_admin_orders(session=uow.session)
    return orders


@router.post(
    "/{order_id}/receipt",
    status_code=status.HTTP_201_CREATED,
    summary="Upload bank deposit receipt for order payment",
    description="Secured endpoint accepting multipart/form-data with JPEG/PNG receipt image, tracking code, date, and amount.",
)
async def upload_bank_receipt(
    order_id: str,
    file: UploadFile = File(...),
    tracking_code: str = Form(...),
    date: str = Form(...),
    amount: str = Form(...),
    current_user: User = Depends(get_current_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> Dict[str, Any]:
    """
    Handles secure receipt upload for offline / card-to-card payments.
    Saves image with UUID filename to prevent directory traversal and records Transaction.
    """
    # 1. Content-Type validation
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="فرمت فایل نامعتبر است. تنها تصاویر JPEG و PNG مجاز می‌باشند.",
        )

    # 2. Parse and validate order UUID
    try:
        order_uuid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"شناسه سفارش نامعتبر است: {order_id}",
        )

    # 3. Lookup order in database
    stmt = select(Order).where(Order.id == order_uuid)
    result = await uow.session.execute(stmt)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"سفارش با شناسه '{order_id}' یافت نشد.",
        )

    # 4. Ownership verification: Customer can only upload for their own order (or Admin)
    if (
        order.user_id != current_user.id
        and current_user.role != UserRole.ADMIN
        and current_user.role != "ADMIN"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="دسترسی غیرمجاز. شما مجاز به ارسال فیش برای این سفارش نیستید.",
        )

    # 5. Secure File Saving with UUID to prevent directory traversal
    ext = ".jpg" if file.content_type == "image/jpeg" else ".png"
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    receipts_dir = Path("uploads/receipts")
    receipts_dir.mkdir(parents=True, exist_ok=True)
    destination = receipts_dir / safe_filename

    try:
        with open(destination, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    public_url = f"/uploads/receipts/{safe_filename}"

    # 6. Parse amount (digits extraction)
    clean_digits = "".join(ch for ch in amount if ch.isdigit())
    parsed_amount = int(clean_digits) if clean_digits else order.total_price

    # 7. Ensure unique authority code for transactions table
    clean_authority = tracking_code.strip()
    if not clean_authority:
        clean_authority = f"REC-{uuid.uuid4().hex[:12]}"
    else:
        auth_check = await uow.session.execute(
            select(Transaction).where(Transaction.authority == clean_authority)
        )
        if auth_check.scalar_one_or_none() is not None:
            clean_authority = f"{clean_authority}-{uuid.uuid4().hex[:6]}"

    # 8. Create Transaction record
    transaction = Transaction(
        order_id=order.id,
        gateway_name="bank_receipt",
        amount=parsed_amount,
        authority=clean_authority,
        ref_id=tracking_code.strip() if tracking_code.strip() else None,
        status=TransactionStatus.PENDING,
        receipt_url=public_url,
        transaction_type=TransactionType.ORDER_PAYMENT,
    )
    uow.session.add(transaction)

    # 9. State Machine: Automated Transition on Receipt Upload
    # If the order is PENDING (or PENDING_QUOTATION), automatically transition to PAYMENT_VERIFICATION
    if order.status in [OrderStatus.PENDING, OrderStatus.PENDING_QUOTATION]:
        order.status = OrderStatus.PAYMENT_VERIFICATION

    # 10. Alert Administrators (Dual-Channel: In-App DB Notification + Bot Push)
    admin_stmt = select(User).where(User.role == UserRole.ADMIN)
    admin_res = await uow.session.execute(admin_stmt)
    admins = admin_res.scalars().all()

    payer_name = current_user.name or current_user.phone or "مشتری"
    for admin in admins:
        admin_notif = Notification(
            user_id=admin.id,
            title="فیش بانکی جدید ثبت شد",
            message=f"فیش واریزی برای سفارش #{str(order.id)[:8]} توسط {payer_name} ارسال گردید و وضعیت سفارش به بررسی فیش تغییر یافت.",
        )
        uow.session.add(admin_notif)

    await uow.commit()

    # Outbound Bot alert to admins
    admin_alert_text = (
        f"💳 **فیش بانکی جدید دریافت شد!**\n\n"
        f"• سفارش: #{str(order.id)[:8]}\n"
        f"• خریدار: {payer_name}\n"
        f"• مبلغ: {parsed_amount:,} ریال\n"
        f"• کد رهگیری فیش: {clean_authority}\n\n"
        f"وضعیت سفارش به «بررسی فیش واریزی» تغییر یافت. جهت تایید به پنل مدیریت مراجعه فرمایید."
    )
    await BotNotificationService.notify_admins(admin_alert_text, uow)

    return {
        "status": "success",
        "message": "فیش واریزی با موفقیت دریافت و در سیستم ثبت گردید.",
        "receipt_url": public_url,
        "transaction_id": str(transaction.id),
        "order_id": str(order.id),
    }


@router.patch(
    "/admin/{order_id}/status",
    response_model=AdminOrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Update order and transaction status by Admin",
    description="Secured by RBAC (Admin only). Updates order status and optionally corresponding transaction status.",
)
async def update_admin_order_status(
    order_id: str,
    payload: AdminOrderStatusUpdateRequest,
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> AdminOrderResponse:
    """
    Enterprise Admin endpoint to approve/reject bank receipts and update order fulfillment status.
    """
    try:
        order_uuid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"شناسه سفارش نامعتبر است: {order_id}",
        )

    stmt = (
        select(Order)
        .where(Order.id == order_uuid)
        .options(
            joinedload(Order.user),
            selectinload(Order.transactions),
            selectinload(Order.items).joinedload(OrderItem.product),
        )
    )
    result = await uow.session.execute(stmt)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"سفارش با شناسه '{order_id}' یافت نشد.",
        )

    # 1. Update optional tracking code and detect new tracking code
    has_new_tracking = False
    if payload.tracking_code is not None:
        clean_tracking = payload.tracking_code.strip()
        if clean_tracking and clean_tracking != (order.tracking_code or ""):
            has_new_tracking = True
        order.tracking_code = clean_tracking if clean_tracking else None

    # 2. State Machine: Automated Shipping Transition vs Manual Override Precedence
    # If explicit manual status is provided, it takes precedence over automated inference.
    if payload.status is not None:
        order.status = payload.status
    elif has_new_tracking and order.status in [OrderStatus.PAID, OrderStatus.READY_FOR_PICKUP]:
        order.status = OrderStatus.SHIPPED

    # Event Trigger: auto-create user notification
    status_persian_labels = {
        OrderStatus.PENDING: "در انتظار پرداخت",
        OrderStatus.PENDING_QUOTATION: "در انتظار صدور پیش‌فاکتور",
        OrderStatus.PAYMENT_VERIFICATION: "بررسی فیش واریزی توسط حسابداری",
        OrderStatus.PAID: "پرداخت تایید شده",
        OrderStatus.SHIPPED: f"ارسال شده (کد رهگیری: {order.tracking_code or 'تحویل پست'})",
        OrderStatus.READY_FOR_PICKUP: "آماده تحویل حضوری در دفتر کرمان",
        OrderStatus.CANCELED: "لغو شده",
    }
    friendly_status = status_persian_labels.get(order.status, order.status.value)
    notif = Notification(
        user_id=order.user_id,
        title=f"به‌روزرسانی وضعیت سفارش #{str(order.id)[:8]}",
        message=f"وضعیت سفارش شما به «{friendly_status}» تغییر یافت.",
    )
    uow.session.add(notif)

    # 2. Optionally update specific transaction status
    if payload.transaction_id:
        tx_stmt = select(Transaction).where(
            Transaction.id == payload.transaction_id,
            Transaction.order_id == order.id,
        )
        tx_result = await uow.session.execute(tx_stmt)
        tx = tx_result.scalar_one_or_none()
        if tx and payload.transaction_status:
            tx.status = payload.transaction_status

    await uow.commit()

    # Proactive Push Notification Hook to User
    if order.user:
        await BotNotificationService.send_to_user(
            order.user,
            f"📦 **به‌روزرسانی وضعیت سفارش #{str(order.id)[:8]}**\n\nوضعیت سفارش شما به «{friendly_status}» تغییر یافت.",
        )

    # Re-fetch order with eager-loaded relations to guarantee complete response
    refreshed_result = await uow.session.execute(stmt)
    return refreshed_result.scalar_one()


@router.patch(
    "/admin/bulk-status",
    response_model=AdminBulkOrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Bulk update order statuses by Admin",
    description="Secured by RBAC (Admin only). Updates status for multiple orders and auto-creates notifications.",
)
async def bulk_update_order_status(
    payload: AdminBulkOrderStatusRequest,
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> AdminBulkOrderResponse:
    """
    Bulk order status update with automated customer notification triggers.
    """
    if not payload.order_ids:
        return AdminBulkOrderResponse(
            affected_count=0,
            message="هیچ سفارشی انتخاب نشده است.",
        )

    stmt = select(Order).where(Order.id.in_(payload.order_ids))
    result = await uow.session.execute(stmt)
    orders = result.scalars().all()

    status_persian_labels = {
        OrderStatus.PENDING: "در انتظار پرداخت",
        OrderStatus.PENDING_QUOTATION: "در انتظار صدور پیش‌فاکتور",
        OrderStatus.PAYMENT_VERIFICATION: "بررسی فیش واریزی توسط حسابداری",
        OrderStatus.PAID: "پرداخت تایید شده",
        OrderStatus.SHIPPED: "تحویل به پست/تیپاکس",
        OrderStatus.READY_FOR_PICKUP: "آماده تحویل حضوری در دفتر کرمان",
        OrderStatus.CANCELED: "لغو شده",
    }
    friendly_status = status_persian_labels.get(
        payload.new_status, payload.new_status.value
    )

    for o in orders:
        o.status = payload.new_status
        # Event Trigger: auto-create notification for each customer
        notif = Notification(
            user_id=o.user_id,
            title=f"به‌روزرسانی سفارش #{str(o.id)[:8]}",
            message=f"وضعیت سفارش شما به «{friendly_status}» تغییر یافت.",
        )
        uow.session.add(notif)

    await uow.commit()

    # Proactive Push Notification Hook to all affected users
    for o in orders:
        if o.user_id:
            user_stmt = select(User).where(User.id == o.user_id)
            user_res = await uow.session.execute(user_stmt)
            target_u = user_res.scalar_one_or_none()
            if target_u:
                await BotNotificationService.send_to_user(
                    target_u,
                    f"📦 **به‌روزرسانی وضعیت سفارش #{str(o.id)[:8]}**\n\nوضعیت سفارش شما به «{friendly_status}» تغییر یافت.",
                )

    return AdminBulkOrderResponse(
        affected_count=len(orders),
        message=f"وضعیت {len(orders)} سفارش با موفقیت به «{friendly_status}» تغییر یافت.",
    )
