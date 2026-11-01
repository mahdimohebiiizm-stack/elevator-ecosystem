import uuid
from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import create_access_token
from db.models.user import User, UserRole
from main import app


@pytest.mark.asyncio
async def test_api_bot_auth_provision_and_reauthenticate(
    db_session: AsyncSession,
) -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        messenger_id = f"tg_bot_user_{uuid.uuid4().hex[:8]}"
        payload = {
            "messenger_id": messenger_id,
            "phone": "+989123334455",
        }

        # Provision
        res_1 = await client.post("/api/v1/users/bot-auth", json=payload)
        assert res_1.status_code == 200
        user_1 = res_1.json()
        assert user_1["messenger_id"] == messenger_id
        assert user_1["phone"] == "+989123334455"
        assert user_1["role"] == "CUSTOMER"
        assert user_1["wallet_balance"] == 0
        user_id = user_1["id"]

        # Re-authenticate
        res_2 = await client.post(
            "/api/v1/users/bot-auth", json={"messenger_id": messenger_id}
        )
        assert res_2.status_code == 200
        user_2 = res_2.json()
        assert user_2["id"] == user_id
        assert user_2["messenger_id"] == messenger_id


@pytest.mark.asyncio
async def test_admin_get_all_users_permissions(db_session: AsyncSession) -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Unauthenticated -> 401
        res_unauth = await client.get("/api/v1/users/admin/all")
        assert res_unauth.status_code == 401

        # Customer -> 403
        customer = User(
            messenger_id=f"cust_{uuid.uuid4().hex[:8]}",
            phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
            role=UserRole.CUSTOMER,
        )
        db_session.add(customer)
        await db_session.commit()
        await db_session.refresh(customer)
        cust_token = create_access_token(subject=str(customer.id))

        res_forbidden = await client.get(
            "/api/v1/users/admin/all",
            headers={"Authorization": f"Bearer {cust_token}"},
        )
        assert res_forbidden.status_code == 403

        # Admin -> 200
        admin = User(
            messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
            phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
            role=UserRole.ADMIN,
            name="مدیر سیستم",
        )
        db_session.add(admin)
        await db_session.commit()
        await db_session.refresh(admin)
        admin_token = create_access_token(subject=str(admin.id))

        res_admin = await client.get(
            "/api/v1/users/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_admin.status_code == 200
        users_list = res_admin.json()
        assert isinstance(users_list, list)
        assert len(users_list) >= 2
        # Verify required keys
        sample = users_list[0]
        assert "id" in sample
        assert "phone" in sample
        assert "name" in sample
        assert "role" in sample
        assert "is_active" in sample
        assert "created_at" in sample


@pytest.mark.asyncio
async def test_admin_bulk_deactivate_users(db_session: AsyncSession) -> None:
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
    )
    u1 = User(
        messenger_id=f"u1_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    u2 = User(
        messenger_id=f"u2_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add_all([admin, u1, u2])
    await db_session.commit()
    await db_session.refresh(admin)
    await db_session.refresh(u1)
    await db_session.refresh(u2)

    admin_token = create_access_token(subject=str(admin.id))
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Bulk deactivate u1 and u2
        res = await client.patch(
            "/api/v1/users/admin/bulk-deactivate",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"user_ids": [str(u1.id), str(u2.id)]},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["affected_count"] == 2
        assert "کاربر با موفقیت غیرفعال شدند" in data["message"]

        # Check DB status
        await db_session.refresh(u1)
        await db_session.refresh(u2)
        assert u1.is_active is False
        assert u2.is_active is False

        # Attempt to deactivate admin itself -> Protected
        res_self = await client.patch(
            "/api/v1/users/admin/bulk-deactivate",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"user_ids": [str(admin.id)]},
        )
        assert res_self.status_code == 200
        data_self = res_self.json()
        assert data_self["affected_count"] == 0


@pytest.mark.asyncio
async def test_admin_update_user_details_full(db_session: AsyncSession) -> None:
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
    )
    user = User(
        messenger_id=f"cust_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
        name="نام قدیمی",
    )
    db_session.add_all([admin, user])
    await db_session.commit()
    await db_session.refresh(admin)
    await db_session.refresh(user)

    admin_token = create_access_token(subject=str(admin.id))
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Update name, phone, password, is_active
        new_phone = f"+98913{uuid.uuid4().int % 10000000:07d}"
        res = await client.patch(
            f"/api/v1/users/admin/{user.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "مهندس احمدی",
                "phone": new_phone,
                "password": "NewSecretPassword123",
                "is_active": False,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "مهندس احمدی"
        assert data["phone"] == new_phone
        assert data["is_active"] is False

        await db_session.refresh(user)
        assert user.password_hash is not None
        assert user.name == "مهندس احمدی"

