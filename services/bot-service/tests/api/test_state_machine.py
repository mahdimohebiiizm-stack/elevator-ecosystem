import io
import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import create_access_token
from db.models.contract import ServiceContract, ContractStatus
from db.models.notification import Notification
from db.models.order import Order, OrderStatus, Transaction, TransactionStatus, TransactionType
from db.models.product import Category, Product
from db.models.user import User, UserRole
from main import app


@pytest.mark.asyncio
async def test_order_receipt_upload_auto_transition(db_session: AsyncSession) -> None:
    """
    Test 1: When a user uploads a bank receipt for a PENDING order:
    - Order status auto-transitions to PAYMENT_VERIFICATION
    - In-app notification is created for Admin
    """
    # 1. Create Admin and Customer
    admin = User(
        messenger_id=f"admin_sm_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
        name="مدیر سیستم تست",
    )
    customer = User(
        messenger_id=f"cust_sm_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
        name="مشتری تست ماشین وضعیت",
    )
    db_session.add_all([admin, customer])
    await db_session.flush()

    # 2. Create Order in PENDING status
    order = Order(
        user_id=customer.id,
        total_price=5_000_000,
        status=OrderStatus.PENDING,
        address_snapshot={"city": "Kerman", "address": "خیابان شریعتی"},
    )
    db_session.add(order)
    await db_session.commit()
    await db_session.refresh(order)
    await db_session.refresh(customer)
    await db_session.refresh(admin)

    customer_token = create_access_token(subject=str(customer.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Mock file upload
        fake_file_content = b"fake-receipt-image-content"
        files = {
            "file": ("receipt.jpg", io.BytesIO(fake_file_content), "image/jpeg")
        }
        data = {
            "amount": "5000000",
            "tracking_code": "REC-998877",
            "date": "1405/08/10",
        }
        res = await client.post(
            f"/api/v1/orders/{order.id}/receipt",
            headers={"Authorization": f"Bearer {customer_token}"},
            files=files,
            data=data,
        )
        assert res.status_code == 201, res.text
        json_resp = res.json()
        assert json_resp["status"] == "success"

        # Verify Order transitioned to PAYMENT_VERIFICATION in DB
        db_order = await db_session.get(Order, order.id)
        assert db_order is not None
        assert db_order.status == OrderStatus.PAYMENT_VERIFICATION

        # Verify Admin received notification
        admin_notifs = (
            await db_session.execute(
                select(Notification).where(Notification.user_id == admin.id)
            )
        ).scalars().all()
        assert any("فیش بانکی" in n.title for n in admin_notifs)


@pytest.mark.asyncio
async def test_contract_quotation_auto_transition(db_session: AsyncSession) -> None:
    """
    Test 2: When Admin submits annual_price > 0 for a PENDING contract:
    - Auto-transitions contract to QUOTED if status is not explicitly overridden
    - If status is explicitly specified (manual override), that status takes precedence
    """
    admin = User(
        messenger_id=f"admin_cnt_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
        name="مدیر تست قرارداد",
    )
    customer = User(
        messenger_id=f"cust_cnt_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
        name="مشتری قرارداد تست",
    )
    db_session.add_all([admin, customer])
    await db_session.flush()

    contract = ServiceContract(
        user_id=customer.id,
        building_address="کرمان، میدان آزادی",
        elevator_type="هیدرولیک",
        stops_count=4,
        capacity_kg=600,
        speed_ms="1.0",
        status=ContractStatus.PENDING,
    )
    db_session.add(contract)
    await db_session.commit()
    await db_session.refresh(contract)
    await db_session.refresh(admin)

    admin_token = create_access_token(subject=str(admin.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Case 2A: annual_price > 0 without status -> auto-transition to QUOTED
        patch_res = await client.patch(
            f"/api/v1/contracts/admin/{contract.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"annual_price": 25_000_000, "tax_amount": 2_500_000},
        )
        assert patch_res.status_code == 200, patch_res.text
        data = patch_res.json()
        assert data["status"] == ContractStatus.QUOTED.value
        assert data["annual_price"] == 25_000_000

        # Case 2B: Manual override precedence
        # Set back to PENDING
        db_contract = await db_session.get(ServiceContract, contract.id)
        assert db_contract is not None
        db_contract.status = ContractStatus.PENDING
        await db_session.commit()

        # Admin quotes with explicit manual status REJECTED
        override_res = await client.patch(
            f"/api/v1/contracts/admin/{contract.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "annual_price": 30_000_000,
                "status": ContractStatus.REJECTED.value,
            },
        )
        assert override_res.status_code == 200
        override_data = override_res.json()
        assert override_data["status"] == ContractStatus.REJECTED.value


@pytest.mark.asyncio
async def test_order_shipping_auto_transition(db_session: AsyncSession) -> None:
    """
    Test 3: When Admin adds tracking_code to an order:
    - If status was PAID -> auto-transitions to SHIPPED
    - If status was READY_FOR_PICKUP -> auto-transitions to SHIPPED
    - If manual status is explicitly passed -> manual status takes precedence
    """
    admin = User(
        messenger_id=f"admin_ord_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
        name="مدیر تست سفارش",
    )
    customer = User(
        messenger_id=f"cust_ord_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
        name="مشتری لجستیک",
    )
    db_session.add_all([admin, customer])
    await db_session.flush()

    order_paid = Order(
        user_id=customer.id,
        total_price=12_000_000,
        status=OrderStatus.PAID,
        address_snapshot={"city": "Kerman"},
    )
    order_pickup = Order(
        user_id=customer.id,
        total_price=8_000_000,
        status=OrderStatus.READY_FOR_PICKUP,
        address_snapshot={"city": "Kerman"},
    )
    db_session.add_all([order_paid, order_pickup])
    await db_session.commit()
    await db_session.refresh(order_paid)
    await db_session.refresh(order_pickup)
    await db_session.refresh(admin)

    admin_token = create_access_token(subject=str(admin.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Case 3A: PAID order gets tracking_code without explicit status -> auto SHIPPED
        res1 = await client.patch(
            f"/api/v1/orders/admin/{order_paid.id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"tracking_code": "IRPOST-991122"},
        )
        assert res1.status_code == 200, res1.text
        data1 = res1.json()
        assert data1["status"] == OrderStatus.SHIPPED.value
        assert data1["tracking_code"] == "IRPOST-991122"

        # Case 3B: READY_FOR_PICKUP order gets tracking_code without explicit status -> auto SHIPPED
        res2 = await client.patch(
            f"/api/v1/orders/admin/{order_pickup.id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"tracking_code": "TIPAX-554433"},
        )
        assert res2.status_code == 200, res2.text
        data2 = res2.json()
        assert data2["status"] == OrderStatus.SHIPPED.value
        assert data2["tracking_code"] == "TIPAX-554433"

        # Case 3C: Manual override precedence: Admin updates tracking code but explicitly keeps READY_FOR_PICKUP
        res3 = await client.patch(
            f"/api/v1/orders/admin/{order_paid.id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "tracking_code": "LOCAL-COURIER-1",
                "status": OrderStatus.READY_FOR_PICKUP.value,
            },
        )
        assert res3.status_code == 200, res3.text
        data3 = res3.json()
        assert data3["status"] == OrderStatus.READY_FOR_PICKUP.value
        assert data3["tracking_code"] == "LOCAL-COURIER-1"
