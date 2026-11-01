from datetime import datetime, timezone
import uuid
from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import create_access_token
from db.models.contract import ServiceContract, ContractStatus
from db.models.notification import Notification
from db.models.user import User, UserRole
from main import app


@pytest.mark.asyncio
async def test_service_contracts_full_flow(db_session: AsyncSession) -> None:
    # 1. Create Admin and Customer users
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
        name="مدیر تست",
    )
    customer = User(
        messenger_id=f"cust_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
        name="مشتری قرارداد",
    )
    db_session.add_all([admin, customer])
    await db_session.commit()
    await db_session.refresh(admin)
    await db_session.refresh(customer)

    admin_token = create_access_token(subject=str(admin.id))
    customer_token = create_access_token(subject=str(customer.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Customer submits wizard
        payload = {
            "building_address": "کرمان، خیابان شهید بهشتی، پلاک ۱۲",
            "elevator_type": "کششی گیربکس",
            "stops_count": 6,
            "capacity_kg": 600,
            "speed_ms": "1.0",
        }
        res_create = await client.post(
            "/api/v1/contracts",
            headers={"Authorization": f"Bearer {customer_token}"},
            json=payload,
        )
        assert res_create.status_code == 201
        created_contract = res_create.json()
        assert created_contract["status"] == ContractStatus.PENDING.value
        assert created_contract["building_address"] == payload["building_address"]
        contract_id = created_contract["id"]

        # Verify Admin received a notification
        admin_notifs = (
            await db_session.execute(
                select(Notification).where(Notification.user_id == admin.id)
            )
        ).scalars().all()
        assert len(admin_notifs) >= 1
        assert "درخواست قرارداد" in admin_notifs[-1].title

        # Step 2: Customer views my contracts
        res_my = await client.get(
            "/api/v1/contracts/my",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert res_my.status_code == 200
        my_list = res_my.json()
        assert any(c["id"] == contract_id for c in my_list)

        # Step 3: Admin lists contracts
        # Customer trying to access admin endpoint -> 403
        res_forbidden = await client.get(
            "/api/v1/contracts/admin",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert res_forbidden.status_code == 403

        # Admin lists all contracts -> 200
        res_admin = await client.get(
            "/api/v1/contracts/admin",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_admin.status_code == 200
        admin_list = res_admin.json()
        assert any(c["id"] == contract_id for c in admin_list)

        # Step 4: Admin reviews and quotes the contract
        patch_payload = {
            "annual_price": 14500000.0,
            "tax_amount": 1450000.0,
            "status": ContractStatus.QUOTED.value,
        }
        res_patch = await client.patch(
            f"/api/v1/contracts/admin/{contract_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=patch_payload,
        )
        assert res_patch.status_code == 200
        updated = res_patch.json()
        assert updated["annual_price"] == 14500000.0
        assert updated["status"] == ContractStatus.QUOTED.value

        # Verify Customer received a notification
        customer_notifs = (
            await db_session.execute(
                select(Notification).where(Notification.user_id == customer.id)
            )
        ).scalars().all()
        assert len(customer_notifs) >= 1
        assert "وضعیت قرارداد" in customer_notifs[-1].title
        assert "14,500,000" in customer_notifs[-1].message
