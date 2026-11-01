import logging
from typing import Optional
import uuid
from sqlalchemy import select

from core.config import settings
from core.exceptions import (
    InvalidOrderError,
    InvalidPaymentError,
    NotFoundError,
    PaymentProviderError,
)
from core.locks import distributed_lock
from db.models.order import Order, OrderStatus, Transaction, TransactionStatus
from db.models.outbox import OutboxEvent
from infrastructure.db.uow import IUnitOfWork
from schemas.payment import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentVerifyResponse,
)
from services.payment.interfaces import PaymentGateway
from services.payment.zarinpal import ZarinPalGateway

logger = logging.getLogger("shopbot_backend.use_cases.payment")


class InitiatePaymentUseCase:
    """
    Application use case initiating a banking payment gateway checkout session for an order.
    """

    def __init__(
        self,
        uow: IUnitOfWork,
        gateway: Optional[PaymentGateway] = None,
    ) -> None:
        self.uow = uow
        self.gateway: PaymentGateway = gateway or ZarinPalGateway()

    async def execute(
        self,
        request_dto: PaymentInitiateRequest,
    ) -> PaymentInitiateResponse:
        """
        Validates order existence and status, communicates with gateway provider,
        and saves initial pending Transaction record.
        """
        stmt = select(Order).where(Order.id == request_dto.order_id)
        result = await self.uow.session.execute(stmt)
        order: Optional[Order] = result.scalar_one_or_none()

        if order is None:
            raise NotFoundError(
                f"Order with ID '{request_dto.order_id}' was not found."
            )

        if order.status != OrderStatus.PENDING:
            raise InvalidOrderError(
                f"Cannot initiate payment for order in '{order.status.value}' status."
            )

        callback_url = request_dto.callback_url or settings.PAYMENT_CALLBACK_URL

        # Request payment gateway session (amount strictly in Rials)
        gateway_result = await self.gateway.request_payment(
            amount=order.total_price,
            callback_url=callback_url,
            description=f"Payment for ShopBot Order #{order.id}",
        )

        # Record pending transaction in database
        transaction = Transaction(
            id=uuid.uuid4(),
            order_id=order.id,
            gateway_name="ZarinPal",
            amount=order.total_price,
            authority=gateway_result.authority,
            status=TransactionStatus.PENDING,
        )
        self.uow.session.add(transaction)
        await self.uow.session.commit()

        return PaymentInitiateResponse(
            order_id=order.id,
            authority=gateway_result.authority,
            payment_url=gateway_result.payment_url,
            amount=order.total_price,
        )


class VerifyPaymentUseCase:
    """
    Application use case for idempotent, concurrency-safe payment verification and order settlement.
    """

    def __init__(
        self,
        uow: IUnitOfWork,
        gateway: Optional[PaymentGateway] = None,
    ) -> None:
        self.uow = uow
        self.gateway: PaymentGateway = gateway or ZarinPalGateway()

    async def execute(
        self,
        authority: str,
        bank_status: Optional[str] = None,
    ) -> PaymentVerifyResponse:
        """
        Executes idempotent verification with Redlock concurrency control and Transactional Outbox.
        """
        # Look up transaction by authority
        stmt = select(Transaction).where(Transaction.authority == authority)
        result = await self.uow.session.execute(stmt)
        transaction: Optional[Transaction] = result.scalar_one_or_none()

        if transaction is None:
            raise NotFoundError(
                f"Transaction with authority '{authority}' was not found."
            )

        # Concurrency Rule: Use Redlock when updating Transaction and Order status
        async with distributed_lock(f"lock:payment:transaction:{transaction.id}"):
            # Re-fetch transaction within the lock
            tx_stmt = (
                select(Transaction)
                .where(Transaction.id == transaction.id)
                .with_for_update()
            )
            tx_res = await self.uow.session.execute(tx_stmt)
            locked_tx: Transaction = tx_res.scalar_one()

            # Idempotency Rule: Check if Transaction is already SUCCESS
            if locked_tx.status == TransactionStatus.SUCCESS:
                logger.info(
                    f"Idempotent payment verification hit for transaction {locked_tx.id}."
                )
                return PaymentVerifyResponse(
                    order_id=locked_tx.order_id,
                    transaction_id=locked_tx.id,
                    ref_id=locked_tx.ref_id,
                    status=TransactionStatus.SUCCESS,
                    message="Payment already verified successfully (Idempotent).",
                )

            # Check if bank callback passed an explicit non-OK status (e.g. user canceled)
            if bank_status is not None and bank_status.upper() != "OK":
                locked_tx.status = TransactionStatus.FAILED
                await self.uow.session.commit()
                raise InvalidPaymentError(
                    "Payment was canceled by user or rejected by bank gateway."
                )

            # Verify with the upstream banking provider
            verify_result = await self.gateway.verify_payment(
                amount=locked_tx.amount,
                authority=locked_tx.authority,
            )

            if not verify_result.is_success:
                locked_tx.status = TransactionStatus.FAILED
                await self.uow.session.commit()
                raise PaymentProviderError(
                    f"Payment verification failed with provider error code {verify_result.code}."
                )

            # Settle Transaction and Order in the same ACID transaction
            locked_tx.status = TransactionStatus.SUCCESS
            locked_tx.ref_id = verify_result.ref_id

            order_stmt = (
                select(Order).where(Order.id == locked_tx.order_id).with_for_update()
            )
            order_res = await self.uow.session.execute(order_stmt)
            order: Order = order_res.scalar_one()
            order.status = OrderStatus.PAID

            # Outbox Integration: emit OrderPaid event atomically
            outbox_event = OutboxEvent(
                id=uuid.uuid4(),
                aggregate_type="Order",
                aggregate_id=str(order.id),
                event_type="OrderPaid",
                payload={
                    "order_id": str(order.id),
                    "transaction_id": str(locked_tx.id),
                    "ref_id": locked_tx.ref_id,
                    "amount": locked_tx.amount,
                    "status": OrderStatus.PAID.value,
                },
            )
            self.uow.session.add(outbox_event)

            await self.uow.session.commit()

            return PaymentVerifyResponse(
                order_id=order.id,
                transaction_id=locked_tx.id,
                ref_id=locked_tx.ref_id,
                status=TransactionStatus.SUCCESS,
                message="Payment verified successfully and order updated to PAID.",
            )
