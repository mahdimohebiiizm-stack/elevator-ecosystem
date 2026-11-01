import uuid
from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import create_access_token
from db.models.product import Category, Product
from db.models.user import User, UserRole
from main import app


@pytest.mark.asyncio
async def test_get_admin_products_unauthenticated() -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/products/admin/all")
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_admin_products_forbidden_for_customer(
    db_session: AsyncSession,
) -> None:
    user = User(
        messenger_id=f"cust_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    user_token = create_access_token(subject=str(user.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/products/admin/all",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 403
        data = response.json()
        assert data.get("status") == 403 or "detail" in data or "message" in data


@pytest.mark.asyncio
async def test_get_admin_products_success(
    db_session: AsyncSession,
) -> None:
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
    )
    db_session.add(admin)

    category = Category(
        name="موتور و گیربکس آسانسور",
        slug=f"motors-{uuid.uuid4().hex[:8]}",
        is_active=True,
    )
    db_session.add(category)
    await db_session.flush()

    product = Product(
        category_id=category.id,
        sku=f"MTR-{uuid.uuid4().hex[:6].upper()}",
        title="موتور گیرلس ساسی ایتالیا ۶ نفره",
        price=185_000_000,
        stock_count=4,
        is_active=True,
    )
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(admin)
    await db_session.refresh(product)

    admin_token = create_access_token(subject=str(admin.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/products/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        # Locate our seeded product in the returned list
        seeded = next((p for p in data if p["id"] == str(product.id)), None)
        assert seeded is not None
        assert seeded["sku"] == product.sku
        assert seeded["title"] == "موتور گیرلس ساسی ایتالیا ۶ نفره"
        assert seeded["price"] == 185_000_000
        assert seeded["stock_count"] == 4
        assert seeded["is_active"] is True
        assert seeded["category_id"] == str(category.id)
        assert seeded["category"] is not None
        assert seeded["category"]["id"] == str(category.id)
        assert seeded["category"]["name"] == "موتور و گیربکس آسانسور"
        assert seeded["category"]["slug"] == category.slug


@pytest.mark.asyncio
async def test_create_admin_product_success(db_session: AsyncSession) -> None:
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)

    admin_token = create_access_token(subject=str(admin.id))

    new_sku = f"CAB-{uuid.uuid4().hex[:6].upper()}"
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/products/admin",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": "کابین استیل طلایی لوکس ۶ نفره",
                "sku": new_sku,
                "price": 240_000_000,
                "stock_count": 2,
                "is_active": True,
                "brand": "Wittur",
                "country_of_origin": "Germany",
                "warranty_months": 24,
                "weight_kg": 450.5,
                "technical_specs": {"capacity_persons": 6, "speed_mps": 1.6},
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "کابین استیل طلایی لوکس ۶ نفره"
        assert data["sku"] == new_sku
        assert data["price"] == 240_000_000
        assert data["stock_count"] == 2
        assert data["is_active"] is True
        assert data["brand"] == "Wittur"
        assert data["country_of_origin"] == "Germany"
        assert data["warranty_months"] == 24
        assert data["weight_kg"] == 450.5
        assert data["technical_specs"]["capacity_persons"] == 6
        assert data["category"] is not None


@pytest.mark.asyncio
async def test_update_admin_product_success(db_session: AsyncSession) -> None:
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
    )
    category = Category(
        name="درب اتوماتیک آسانسور",
        slug=f"doors-{uuid.uuid4().hex[:8]}",
        is_active=True,
    )
    db_session.add_all([admin, category])
    await db_session.flush()

    product = Product(
        category_id=category.id,
        sku=f"DOR-{uuid.uuid4().hex[:6].upper()}",
        title="درب تمام اتوماتیک سانترال ۸۰ سانتی",
        price=45_000_000,
        stock_count=5,
        is_active=True,
    )
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(admin)
    await db_session.refresh(product)

    admin_token = create_access_token(subject=str(admin.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.patch(
            f"/api/v1/products/admin/{product.id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": "درب اتوماتیک تلسکوپی پلاس",
                "price": 52_000_000,
                "stock_count": 3,
                "is_active": False,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(product.id)
        assert data["title"] == "درب اتوماتیک تلسکوپی پلاس"
        assert data["price"] == 52_000_000
        assert data["stock_count"] == 3
        assert data["is_active"] is False


@pytest.mark.asyncio
async def test_get_public_products_unauthenticated(db_session: AsyncSession) -> None:
    category = Category(
        name="ریل و متعلقات",
        slug=f"rails-{uuid.uuid4().hex[:6]}",
        is_active=True,
    )
    db_session.add(category)
    await db_session.flush()

    active_p = Product(
        category_id=category.id,
        sku=f"RAL-{uuid.uuid4().hex[:6].upper()}",
        title="ریل آسانسور T9 ساورا اسپانیا",
        price=18_000_000,
        stock_count=20,
        is_active=True,
    )
    inactive_p = Product(
        category_id=category.id,
        sku=f"INACT-{uuid.uuid4().hex[:6].upper()}",
        title="کالای غیرفعال آزمایشی",
        price=10_000,
        stock_count=0,
        is_active=False,
    )
    db_session.add_all([active_p, inactive_p])
    await db_session.commit()

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Public request with NO Authorization header
        response = await client.get("/api/v1/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify active_p is returned and inactive_p is filtered out
        ids = [item["id"] for item in data]
        assert str(active_p.id) in ids
        assert str(inactive_p.id) not in ids
        # Verify eager-loaded category
        target = next(item for item in data if item["id"] == str(active_p.id))
        assert target["category"] is not None
        assert target["category"]["name"] == "ریل و متعلقات"


@pytest.mark.asyncio
async def test_admin_bulk_action_products(db_session: AsyncSession) -> None:
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)

    admin_token = create_access_token(subject=str(admin.id))

    category = Category(
        name="تست گروهی",
        slug=f"bulk-{uuid.uuid4().hex[:6]}",
        is_active=True,
    )
    db_session.add(category)
    await db_session.flush()

    p1 = Product(
        category_id=category.id,
        sku=f"BLK1-{uuid.uuid4().hex[:6].upper()}",
        title="کالای تستی ۱",
        price=1000,
        stock_count=5,
        is_active=True,
    )
    p2 = Product(
        category_id=category.id,
        sku=f"BLK2-{uuid.uuid4().hex[:6].upper()}",
        title="کالای تستی ۲",
        price=2000,
        stock_count=5,
        is_active=True,
    )
    db_session.add_all([p1, p2])
    await db_session.commit()
    await db_session.refresh(p1)
    await db_session.refresh(p2)

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Bulk deactivate
        res_deact = await client.patch(
            "/api/v1/products/admin/bulk-action",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"product_ids": [str(p1.id), str(p2.id)], "action": "deactivate"},
        )
        assert res_deact.status_code == 200
        assert res_deact.json()["affected_count"] == 2

        # 2. Bulk activate
        res_act = await client.patch(
            "/api/v1/products/admin/bulk-action",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"product_ids": [str(p1.id)], "action": "activate"},
        )
        assert res_act.status_code == 200
        assert res_act.json()["affected_count"] == 1

        # 3. Bulk delete
        res_del = await client.patch(
            "/api/v1/products/admin/bulk-action",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"product_ids": [str(p2.id)], "action": "delete"},
        )
        assert res_del.status_code == 200
        assert res_del.json()["affected_count"] == 1



