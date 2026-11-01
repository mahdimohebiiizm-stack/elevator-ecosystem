import uuid
from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import create_access_token
from db.models.order import (
    Order,
    OrderStatus,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from db.models.product import Category, Product
from db.models.user import User, UserRole
from main import app


async def _seed_catalog(session: AsyncSession) -> tuple[User, Product]:
    user = User(
        messenger_id=f"order_tester_{uuid.uuid4().hex[:8]}",
        role=UserRole.CUSTOMER,
        wallet_balance=0,
    )
    session.add(user)

    category = Category(
        name="Laptops",
        slug=f"laptops-{uuid.uuid4().hex[:8]}",
        is_active=True,
    )
    session.add(category)
    await session.flush()

    product = Product(
        category_id=category.id,
        sku=f"LAP-{uuid.uuid4().hex[:6]}",
        title="Pro Laptop 16",
        price=95_000_000,  # 95M Rials
        stock_count=5,
        is_active=True,
    )
    session.add(product)
    await session.commit()
    await session.refresh(user)
    await session.refresh(product)
    return user, product


@pytest.mark.asyncio
async def test_api_create_order_success(db_session: AsyncSession) -> None:
    user, product = await _seed_catalog(db_session)
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "user_id": str(user.id),
            "items": [{"product_id": str(product.id), "quantity": 2}],
            "address_snapshot": {
                "city": "Tehran",
                "province": "Tehran",
                "full_address": "Jordan Ave, No 5",
            },
        }

        response = await client.post("/api/v1/orders", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == str(user.id)
        assert data["total_price"] == 190_000_000  # 2 * 95M
        assert data["status"] == "PENDING"
        assert len(data["items"]) == 1
        assert data["items"][0]["quantity"] == 2
        assert data["items"][0]["unit_price_at_purchase"] == 95_000_000


@pytest.mark.asyncio
async def test_api_create_order_insufficient_stock(db_session: AsyncSession) -> None:
    user, product = await _seed_catalog(db_session)
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "user_id": str(user.id),
            "items": [{"product_id": str(product.id), "quantity": 100}],  # stock is 5
            "address_snapshot": {"city": "Shiraz"},
        }

        response = await client.post("/api/v1/orders", json=payload)
        assert response.status_code == 409
        assert response.headers["content-type"] == "application/problem+json"

        problem = response.json()
        assert problem["code"] == "INSUFFICIENT_STOCK"
        assert problem["status"] == 409
        assert "Insufficient stock" in problem["message"]


@pytest.mark.asyncio
async def test_api_create_order_not_found_product(db_session: AsyncSession) -> None:
    user, _ = await _seed_catalog(db_session)
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        random_product_id = str(uuid.uuid4())
        payload = {
            "user_id": str(user.id),
            "items": [{"product_id": random_product_id, "quantity": 1}],
            "address_snapshot": {"city": "Isfahan"},
        }

        response = await client.post("/api/v1/orders", json=payload)
        assert response.status_code == 404
        assert response.headers["content-type"] == "application/problem+json"

        problem = response.json()
        assert problem["code"] == "NOT_FOUND"
        assert problem["status"] == 404
        assert random_product_id in problem["message"]


@pytest.mark.asyncio
async def test_api_create_order_validation_error() -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "user_id": str(uuid.uuid4()),
            "items": [
                {"product_id": str(uuid.uuid4()), "quantity": -5}
            ],  # invalid quantity
            "address_snapshot": {"city": "Kerman"},
        }

        response = await client.post("/api/v1/orders", json=payload)
        assert response.status_code == 422
        problem = response.json()
        assert problem["code"] == "VALIDATION_ERROR"
        assert problem["status"] == 422


@pytest.mark.asyncio
async def test_get_admin_orders_unauthenticated() -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/orders/admin/all")
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_admin_orders_forbidden_for_customer(db_session: AsyncSession) -> None:
    customer = User(
        messenger_id=f"cust_test_{uuid.uuid4().hex[:8]}",
        phone="09110000000",
        role=UserRole.CUSTOMER,
        wallet_balance=0,
    )
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    token = create_access_token(subject=str(customer.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/orders/admin/all",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
        data = response.json()
        assert "Access denied" in data.get("detail", "") or "Access denied" in data.get("message", "")


@pytest.mark.asyncio
async def test_get_admin_orders_success_for_admin(db_session: AsyncSession) -> None:
    admin = User(
        messenger_id=f"admin_test_{uuid.uuid4().hex[:8]}",
        phone="09120000000",
        role=UserRole.ADMIN,
        wallet_balance=0,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)

    token = create_access_token(subject=str(admin.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/orders/admin/all",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        orders_list = response.json()
        assert isinstance(orders_list, list)
        if len(orders_list) > 0:
            first = orders_list[0]
            assert "id" in first
            assert "user_id" in first
            assert "total_price" in first
            assert "status" in first
            assert "items" in first
            assert "transactions" in first


@pytest.mark.asyncio
async def test_upload_receipt_invalid_mimetype(db_session: AsyncSession) -> None:
    user, product = await _seed_catalog(db_session)
    order = Order(
        user_id=user.id,
        total_price=95_000_000,
        status=OrderStatus.PENDING,
        address_snapshot={"city": "Kerman"},
    )
    db_session.add(order)
    await db_session.commit()
    await db_session.refresh(order)

    token = create_access_token(subject=str(user.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/orders/{order.id}/receipt",
            headers={"Authorization": f"Bearer {token}"},
            data={"tracking_code": "TRACK-1234", "date": "1403/08/04", "amount": "95000000"},
            files={"file": ("test.pdf", b"%PDF-dummy-content", "application/pdf")},
        )
        assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_receipt_unauthorized_user(db_session: AsyncSession) -> None:
    user1, _ = await _seed_catalog(db_session)
    user2, _ = await _seed_catalog(db_session)

    order = Order(
        user_id=user1.id,
        total_price=95_000_000,
        status=OrderStatus.PENDING,
        address_snapshot={"city": "Kerman"},
    )
    db_session.add(order)
    await db_session.commit()
    await db_session.refresh(order)

    # user2 tries to upload receipt for user1's order
    token2 = create_access_token(subject=str(user2.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/orders/{order.id}/receipt",
            headers={"Authorization": f"Bearer {token2}"},
            data={"tracking_code": "TRACK-1234", "date": "1403/08/04", "amount": "95000000"},
            files={"file": ("receipt.jpg", b"\xff\xd8\xff\xe0dummy-jpg-bytes", "image/jpeg")},
        )
        assert response.status_code == 403


@pytest.mark.asyncio
async def test_upload_receipt_success(db_session: AsyncSession) -> None:
    user, _ = await _seed_catalog(db_session)
    order = Order(
        user_id=user.id,
        total_price=95_000_000,
        status=OrderStatus.PENDING,
        address_snapshot={"city": "Kerman"},
    )
    db_session.add(order)
    await db_session.commit()
    await db_session.refresh(order)

    token = create_access_token(subject=str(user.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/orders/{order.id}/receipt",
            headers={"Authorization": f"Bearer {token}"},
            data={"tracking_code": f"TRK-{uuid.uuid4().hex[:8]}", "date": "1403/08/04", "amount": "95,000,000"},
            files={"file": ("receipt.jpg", b"\xff\xd8\xff\xe0dummy-jpg-bytes", "image/jpeg")},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "success"
        assert "/uploads/receipts/" in data["receipt_url"]
        assert "transaction_id" in data


@pytest.mark.asyncio
async def test_admin_update_order_status_success(db_session: AsyncSession) -> None:
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
    )
    user = User(
        messenger_id=f"cust_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
    )
    db_session.add_all([admin, user])
    await db_session.commit()
    await db_session.refresh(admin)
    await db_session.refresh(user)

    order = Order(
        user_id=user.id,
        total_price=120_000_000,
        status=OrderStatus.PENDING,
        address_snapshot={"city": "Kerman"},
    )
    db_session.add(order)
    await db_session.commit()
    await db_session.refresh(order)

    tx = Transaction(
        order_id=order.id,
        gateway_name="bank_receipt",
        amount=120_000_000,
        authority=f"REC-{uuid.uuid4().hex[:8]}",
        status=TransactionStatus.PENDING,
        transaction_type=TransactionType.ORDER_PAYMENT,
    )
    db_session.add(tx)
    await db_session.commit()
    await db_session.refresh(tx)

    admin_token = create_access_token(subject=str(admin.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.patch(
            f"/api/v1/orders/admin/{order.id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "status": "PAID",
                "transaction_id": str(tx.id),
                "transaction_status": "SUCCESS",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(order.id)
        assert data["status"] == "PAID"
        assert len(data["transactions"]) == 1
        assert data["transactions"][0]["status"] == "SUCCESS"


@pytest.mark.asyncio
async def test_admin_update_order_status_forbidden(db_session: AsyncSession) -> None:
    user = User(
        messenger_id=f"cust_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    order = Order(
        user_id=user.id,
        total_price=50_000_000,
        status=OrderStatus.PENDING,
        address_snapshot={"city": "Kerman"},
    )
    db_session.add(order)
    await db_session.commit()
    await db_session.refresh(order)

    user_token = create_access_token(subject=str(user.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.patch(
            f"/api/v1/orders/admin/{order.id}/status",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"status": "PAID"},
        )
        assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_update_order_logistics_and_new_statuses(db_session: AsyncSession) -> None:
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
    )
    user = User(
        messenger_id=f"cust_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
    )
    db_session.add_all([admin, user])
    await db_session.commit()
    await db_session.refresh(admin)
    await db_session.refresh(user)

    order = Order(
        user_id=user.id,
        total_price=75_000_000,
        status=OrderStatus.PENDING,
        address_snapshot={"city": "Kerman"},
    )
    db_session.add(order)
    await db_session.commit()
    await db_session.refresh(order)

    admin_token = create_access_token(subject=str(admin.id))
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. PENDING_QUOTATION
        res1 = await client.patch(
            f"/api/v1/orders/admin/{order.id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "PENDING_QUOTATION"},
        )
        assert res1.status_code == 200
        assert res1.json()["status"] == "PENDING_QUOTATION"

        # 2. PAYMENT_VERIFICATION
        res2 = await client.patch(
            f"/api/v1/orders/admin/{order.id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "PAYMENT_VERIFICATION"},
        )
        assert res2.status_code == 200
        assert res2.json()["status"] == "PAYMENT_VERIFICATION"

        # 3. SHIPPED with tracking_code
        res3 = await client.patch(
            f"/api/v1/orders/admin/{order.id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "SHIPPED", "tracking_code": "TPX-98237461"},
        )
        assert res3.status_code == 200
        data3 = res3.json()
        assert data3["status"] == "SHIPPED"
        assert data3["tracking_code"] == "TPX-98237461"

        # 4. READY_FOR_PICKUP
        res4 = await client.patch(
            f"/api/v1/orders/admin/{order.id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "READY_FOR_PICKUP"},
        )
        assert res4.status_code == 200
        assert res4.json()["status"] == "READY_FOR_PICKUP"


@pytest.mark.asyncio
async def test_admin_bulk_order_status_update(db_session: AsyncSession) -> None:
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
    )
    user = User(
        messenger_id=f"cust_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
    )
    db_session.add_all([admin, user])
    await db_session.commit()
    await db_session.refresh(admin)
    await db_session.refresh(user)

    o1 = Order(
        user_id=user.id,
        total_price=10_000_000,
        status=OrderStatus.PENDING,
        address_snapshot={"city": "Kerman"},
    )
    o2 = Order(
        user_id=user.id,
        total_price=20_000_000,
        status=OrderStatus.PENDING,
        address_snapshot={"city": "Kerman"},
    )
    db_session.add_all([o1, o2])
    await db_session.commit()
    await db_session.refresh(o1)
    await db_session.refresh(o2)

    admin_token = create_access_token(subject=str(admin.id))
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.patch(
            "/api/v1/orders/admin/bulk-status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "order_ids": [str(o1.id), str(o2.id)],
                "new_status": "PAID",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["affected_count"] == 2

        await db_session.refresh(o1)
        await db_session.refresh(o2)
        assert o1.status == OrderStatus.PAID
        assert o2.status == OrderStatus.PAID




