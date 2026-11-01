import asyncio
from datetime import datetime, timedelta, timezone
import logging
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from core.locks import distributed_lock
from db.models.order import Order, OrderStatus, Transaction, TransactionStatus
from db.models.outbox import OutboxEvent
from db.models.product import Product
from db.session import AsyncSessionLocal
from services.payment.interfaces import PaymentGateway
from services.payment.zarinpal import ZarinPalGateway

logger = logging.getLogger("shopbot_backend.workers.payment_sync")


class PaymentSyncWorker:
    """
    Background payment reconciliation daemon.
    Regularly scans for stale PENDING orders older than the expiration window (e.g., 15 minutes),
    checks settlement status against ZarinPal, settles paid orders with Transactional Outbox events,
    or cancels abandoned orders and safely restores inventory stock.
    """

    def __init__(
        self,
        session_factory: Optional[async_sessionmaker[AsyncSession]] = None,
        gateway: Optional[PaymentGateway] = None,
        stale_threshold_minutes: int = 15,
        batch_size: int = 50,
    ) -> None:
        self.session_factory: async_sessionmaker[AsyncSession] = (
            session_factory or AsyncSessionLocal
        )
        self.gateway: PaymentGateway = gateway or ZarinPalGateway()
        self.stale_threshold_minutes: int = stale_threshold_minutes
        self.batch_size: int = batch_size
        self._is_running: bool = False
        self._stop_event: asyncio.Event = asyncio.Event()

    async def reconcile_order(self, session: AsyncSession, order_id: object) -> bool:
        """
        Reconciles a single pending order against ZarinPal gateway.
        Returns True if reconciled (either settled or canceled), False otherwise.
        """
        # Fetch order with items
        order_stmt = (
            select(Order)
            .where(Order.id == order_id)
            .options(selectinload(Order.items))
            .with_for_update(skip_locked=True)
        )
        order_res = await session.execute(order_stmt)
        order = order_res.scalar_one_or_none()

        if order is None or order.status != OrderStatus.PENDING:
            return False

        # Fetch latest transaction for this order
        tx_stmt = (
            select(Transaction)
            .where(Transaction.order_id == order.id)
            .order_by(Transaction.created_at.desc())
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        tx_res = await session.execute(tx_stmt)
        transaction = tx_res.scalar_one_or_none()

        if transaction is None:
            # Order has no payment transaction initiated; cancel and release stock
            logger.info(
                f"Stale order {order.id} has no transactions. Canceling and releasing stock."
            )
            await self._cancel_and_release_stock(session, order)
            await session.commit()
            return True

        if transaction.status == TransactionStatus.SUCCESS:
            # Idempotent reconciliation
            order.status = OrderStatus.PAID
            outbox_event = OutboxEvent(
                aggregate_type="Order",
                aggregate_id=str(order.id),
                event_type="OrderPaid",
                payload={
                    "order_id": str(order.id),
                    "transaction_id": str(transaction.id),
                    "ref_id": transaction.ref_id,
                    "amount": transaction.amount,
                    "status": OrderStatus.PAID.value,
                },
            )
            session.add(outbox_event)
            await session.commit()
            return True

        # Inquire ZarinPal banking provider
        try:
            verify_result = await self.gateway.verify_payment(
                amount=transaction.amount,
                authority=transaction.authority,
            )
        except Exception as prov_exc:
            logger.warning(
                f"Gateway check error for order {order.id} authority {transaction.authority}: {prov_exc}"
            )
            # Do not cancel order if gateway returned temporary communication error
            return False

        if verify_result.is_success:
            logger.info(
                f"ZarinPal confirmed payment for stale order {order.id} (RefID={verify_result.ref_id}). Settling."
            )
            transaction.status = TransactionStatus.SUCCESS
            transaction.ref_id = verify_result.ref_id
            order.status = OrderStatus.PAID

            outbox_event = OutboxEvent(
                aggregate_type="Order",
                aggregate_id=str(order.id),
                event_type="OrderPaid",
                payload={
                    "order_id": str(order.id),
                    "transaction_id": str(transaction.id),
                    "ref_id": transaction.ref_id,
                    "amount": transaction.amount,
                    "status": OrderStatus.PAID.value,
                },
            )
            session.add(outbox_event)
            await session.commit()
            return True
        else:
            logger.info(
                f"ZarinPal confirmed unpaid/expired for stale order {order.id}. Canceling and releasing stock."
            )
            transaction.status = TransactionStatus.FAILED
            await self._cancel_and_release_stock(session, order)
            await session.commit()
            return True

    async def _cancel_and_release_stock(
        self, session: AsyncSession, order: Order
    ) -> None:
        """
        Safely restores inventory stock count and marks order canceled.
        """
        distinct_pids = sorted(
            {item.product_id for item in order.items}, key=lambda x: str(x)
        )

        for item in order.items:
            prod_stmt = (
                select(Product).where(Product.id == item.product_id).with_for_update()
            )
            prod_res = await session.execute(prod_stmt)
            product = prod_res.scalar_one_or_none()
            if product is not None:
                product.stock_count += item.quantity
                session.add(product)

        order.status = OrderStatus.CANCELED
        session.add(order)

        outbox_event = OutboxEvent(
            aggregate_type="Order",
            aggregate_id=str(order.id),
            event_type="OrderCanceled",
            payload={
                "order_id": str(order.id),
                "reason": "PAYMENT_EXPIRED_OR_UNPAID",
                "status": OrderStatus.CANCELED.value,
            },
        )
        session.add(outbox_event)

    async def process_sync_batch(self, session: AsyncSession) -> int:
        """
        Queries and reconciles pending orders created more than stale_threshold_minutes ago.
        Uses skip_locked=True to prevent deadlocks with concurrent transactions.
        """
        cutoff_time = datetime.now(timezone.utc) - timedelta(
            minutes=self.stale_threshold_minutes
        )

        stmt = (
            select(Order.id)
            .where(
                Order.status == OrderStatus.PENDING,
                Order.created_at <= cutoff_time,
            )
            .order_by(Order.created_at.asc())
            .with_for_update(skip_locked=True)
            .limit(self.batch_size)
        )
        result = await session.execute(stmt)
        order_ids: List[object] = list(result.scalars().all())

        if not order_ids:
            return 0

        reconciled_count = 0
        for order_id in order_ids:
            try:
                # Wrap each order reconciliation in broad except
                success = await self.reconcile_order(session, order_id)
                if success:
                    reconciled_count += 1
            except Exception as exc:
                logger.error(
                    f"Failed to reconcile stale order {order_id}: {exc}",
                    exc_info=True,
                )
                await session.rollback()

        return reconciled_count

    async def run(
        self,
        poll_interval: float = 30.0,
        max_iterations: Optional[int] = None,
    ) -> int:
        """
        Main worker loop. Runs continuously until stop() is invoked or max_iterations reached.
        """
        self._is_running = True
        self._stop_event.clear()
        total_reconciled = 0
        iteration = 0

        logger.info(
            f"PaymentSyncWorker started (threshold={self.stale_threshold_minutes}m, "
            f"batch_size={self.batch_size}, interval={poll_interval}s)."
        )

        try:
            while self._is_running:
                iteration += 1
                try:
                    async with self.session_factory() as session:
                        processed = await self.process_sync_batch(session)
                        total_reconciled += processed
                except Exception as worker_exc:
                    logger.error(
                        f"Error in payment sync worker cycle: {worker_exc}",
                        exc_info=True,
                    )

                if max_iterations is not None and iteration >= max_iterations:
                    break

                try:
                    await asyncio.wait_for(
                        self._stop_event.wait(), timeout=poll_interval
                    )
                    break
                except asyncio.TimeoutError:
                    pass

        finally:
            self._is_running = False
            logger.info("PaymentSyncWorker daemon stopped.")

        return total_reconciled

    def stop(self) -> None:
        self._is_running = False
        self._stop_event.set()


async def run_payment_sync() -> None:
    logging.basicConfig(level=logging.INFO)
    worker = PaymentSyncWorker()
    await worker.run()


if __name__ == "__main__":
    asyncio.run(run_payment_sync())
