from typing import Any, Dict, Optional
import uuid
from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps.use_cases import (
    get_initiate_payment_use_case,
    get_verify_payment_use_case,
)
from application.use_cases.payment_use_cases import (
    InitiatePaymentUseCase,
    VerifyPaymentUseCase,
)
from db.models.order import Order, OrderStatus, Transaction, TransactionStatus
from db.models.outbox import OutboxEvent
from db.models.product import Category, Product
from db.models.user import User, UserRole
from infrastructure.db.uow import SqlAlchemyUnitOfWork
from main import app
from services.commands.order_command import create_order_command
from services.payment.interfaces import (
    PaymentGateway,
    PaymentRequestResult,
    PaymentVerificationResult,
)


class MockTestPaymentGateway(PaymentGateway):
    """
    Mock payment gateway for test isolation.
    """

    def __init__(self, should_succeed: bool = True) -> None:
        self.should_succeed = should_succeed

    async def request_payment(
        self,
        amount: int,
        callback_url: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PaymentRequestResult:
        auth_code = f"A_{uuid.uuid4().hex[:16]}"
        return PaymentRequestResult(
            authority=auth_code,
            payment_url=f"https://sandbox.zarinpal.com/pg/StartPay/{auth_code}",
            fee=0,
        )

    async def verify_payment(
        self,
        amount: int,
        authority: str,
    ) -> PaymentVerificationResult:
        if self.should_succeed:
            return PaymentVerificationResult(
                is_success=True,
                ref_id="99887766",
                code=100,
                card_pan="603799******1234",
                fee=0,
            )
        return PaymentVerificationResult(
            is_success=False,
            ref_id=None,
            code=-51,
            fee=0,
        )


async def _seed_order(session: AsyncSession) -> Order:
    user = User(
        messenger_id=f"pay_user_{uuid.uuid4().hex[:8]}",
        role=UserRole.CUSTOMER,
        wallet_balance=0,
    )
    session.add(user)

    category = Category(
        name="Tablets",
        slug=f"tablets-{uuid.uuid4().hex[:8]}",
        is_active=True,
    )
    session.add(category)
    await session.flush()

    product = Product(
        category_id=category.id,
        sku=f"TAB-{uuid.uuid4().hex[:6]}",
        title="Pro Tablet 11",
        price=50_000_000,
        stock_count=10,
        is_active=True,
    )
    session.add(product)
    await session.commit()

    order = await create_order_command(
        session=session,
        user_id=user.id,
        items_data=[{"product_id": product.id, "quantity": 1}],
        address_snapshot={"city": "Tehran", "postal_code": "1999988888"},
    )
    return order


@pytest.mark.asyncio
async def test_api_initiate_payment_success(db_session: AsyncSession) -> None:
    order = await _seed_order(db_session)
    mock_gateway = MockTestPaymentGateway()

    uow = SqlAlchemyUnitOfWork(session=db_session)
    app.dependency_overrides[
        get_initiate_payment_use_case
    ] = lambda: InitiatePaymentUseCase(uow=uow, gateway=mock_gateway)

    try:
        transport = ASGITransport(app=app, raise_app_exceptions=False)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/payment/initiate",
                json={"order_id": str(order.id)},
            )
            assert resp.status_code == 201
            data = resp.json()
            assert data["order_id"] == str(order.id)
            assert "A_" in data["authority"]
            assert "StartPay" in data["payment_url"]
            assert data["amount"] == 50_000_000

            # Verify Transaction was created in DB
            stmt = select(Transaction).where(Transaction.order_id == order.id)
            tx_res = await db_session.execute(stmt)
            tx = tx_res.scalar_one_or_none()
            assert tx is not None
            assert tx.status == TransactionStatus.PENDING
            assert tx.authority == data["authority"]
    finally:
        app.dependency_overrides.pop(get_initiate_payment_use_case, None)


@pytest.mark.asyncio
async def test_api_initiate_payment_not_found_order(db_session: AsyncSession) -> None:
    uow = SqlAlchemyUnitOfWork(session=db_session)
    app.dependency_overrides[
        get_initiate_payment_use_case
    ] = lambda: InitiatePaymentUseCase(uow=uow, gateway=MockTestPaymentGateway())

    try:
        transport = ASGITransport(app=app, raise_app_exceptions=False)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/payment/initiate",
                json={"order_id": str(uuid.uuid4())},
            )
            assert resp.status_code == 404
            data = resp.json()
            assert data["code"] == "NOT_FOUND"
    finally:
        app.dependency_overrides.pop(get_initiate_payment_use_case, None)


@pytest.mark.asyncio
async def test_api_verify_payment_success_idempotency_and_outbox(
    db_session: AsyncSession,
) -> None:
    """
    Test end-to-end payment verification:
    1. First call settles transaction to SUCCESS, sets Order to PAID, and emits OrderPaid outbox event.
    2. Second call is idempotent: returns 200 SUCCESS without re-updating or error.
    """
    order = await _seed_order(db_session)
    authority = f"A_VERIFY_TEST_{uuid.uuid4().hex[:12]}"

    transaction = Transaction(
        id=uuid.uuid4(),
        order_id=order.id,
        gateway_name="ZarinPal",
        amount=order.total_price,
        authority=authority,
        status=TransactionStatus.PENDING,
    )
    db_session.add(transaction)
    await db_session.commit()

    mock_gateway = MockTestPaymentGateway(should_succeed=True)
    uow = SqlAlchemyUnitOfWork(session=db_session)
    app.dependency_overrides[
        get_verify_payment_use_case
    ] = lambda: VerifyPaymentUseCase(uow=uow, gateway=mock_gateway)

    try:
        transport = ASGITransport(app=app, raise_app_exceptions=False)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # First verification call (bank callback GET /api/v1/payment/verify?Authority=...&Status=OK)
            resp1 = await client.get(
                "/api/v1/payment/verify",
                params={"Authority": authority, "Status": "OK"},
            )
            assert resp1.status_code == 200
            data1 = resp1.json()
            assert data1["status"] == "SUCCESS"
            assert data1["ref_id"] == "99887766"
            assert data1["order_id"] == str(order.id)

            # Check Database state
            await db_session.refresh(order)
            assert order.status == OrderStatus.PAID

            await db_session.refresh(transaction)
            assert transaction.status == TransactionStatus.SUCCESS
            assert transaction.ref_id == "99887766"

            # Check Transactional Outbox for OrderPaid event
            outbox_stmt = select(OutboxEvent).where(
                OutboxEvent.aggregate_id == str(order.id),
                OutboxEvent.event_type == "OrderPaid",
            )
            outbox_res = await db_session.execute(outbox_stmt)
            outbox_ev = outbox_res.scalar_one_or_none()
            assert outbox_ev is not None
            assert outbox_ev.payload["status"] == "PAID"
            assert outbox_ev.payload["ref_id"] == "99887766"

            # Second verification call: IDEMPOTENCY TEST
            resp2 = await client.get(
                "/api/v1/payment/verify",
                params={"Authority": authority, "Status": "OK"},
            )
            assert resp2.status_code == 200
            data2 = resp2.json()
            assert data2["status"] == "SUCCESS"
            assert data2["ref_id"] == "99887766"
            assert "Idempotent" in data2["message"]

    finally:
        app.dependency_overrides.pop(get_verify_payment_use_case, None)


@pytest.mark.asyncio
async def test_api_verify_payment_bank_rejection(db_session: AsyncSession) -> None:
    """
    Test when bank reports NOK (user canceled or rejected): marks transaction FAILED and returns 400.
    """
    order = await _seed_order(db_session)
    authority = f"A_NOK_TEST_{uuid.uuid4().hex[:12]}"

    transaction = Transaction(
        id=uuid.uuid4(),
        order_id=order.id,
        gateway_name="ZarinPal",
        amount=order.total_price,
        authority=authority,
        status=TransactionStatus.PENDING,
    )
    db_session.add(transaction)
    await db_session.commit()

    uow = SqlAlchemyUnitOfWork(session=db_session)
    app.dependency_overrides[
        get_verify_payment_use_case
    ] = lambda: VerifyPaymentUseCase(uow=uow, gateway=MockTestPaymentGateway())

    try:
        transport = ASGITransport(app=app, raise_app_exceptions=False)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/v1/payment/verify",
                params={"Authority": authority, "Status": "NOK"},
            )
            assert resp.status_code == 400
            problem = resp.json()
            assert problem["code"] == "INVALID_PAYMENT"

            await db_session.refresh(transaction)
            assert transaction.status == TransactionStatus.FAILED

            await db_session.refresh(order)
            assert order.status == OrderStatus.PENDING  # Order remains unpaid
    finally:
        app.dependency_overrides.pop(get_verify_payment_use_case, None)
