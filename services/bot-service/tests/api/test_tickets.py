import uuid
from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import create_access_token
from db.models.user import User, UserRole
from main import app


@pytest.mark.asyncio
async def test_tickets_unauthenticated() -> None:
    random_id = uuid.uuid4()
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res1 = await client.post("/api/v1/tickets", json={"subject": "test", "content": "hello"})
        assert res1.status_code == 401

        res2 = await client.get("/api/v1/tickets/my")
        assert res2.status_code == 401

        res3 = await client.get("/api/v1/tickets/admin")
        assert res3.status_code == 401

        res4 = await client.post(
            f"/api/v1/tickets/admin/{random_id}/reply",
            json={"content": "admin response"},
        )
        assert res4.status_code == 401

        res5 = await client.patch(
            f"/api/v1/tickets/admin/{random_id}/status",
            json={"status": "CLOSED"},
        )
        assert res5.status_code == 401

        res6 = await client.get(f"/api/v1/tickets/{random_id}")
        assert res6.status_code == 401

        res7 = await client.post(
            f"/api/v1/tickets/{random_id}/reply",
            json={"content": "customer reply"},
        )
        assert res7.status_code == 401


@pytest.mark.asyncio
async def test_tickets_admin_endpoints_forbidden_for_customer(db_session: AsyncSession) -> None:
    customer = User(
        messenger_id=f"cust_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
    )
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    customer_token = create_access_token(subject=str(customer.id))
    random_id = uuid.uuid4()

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res1 = await client.get(
            "/api/v1/tickets/admin",
            headers={"Authorization": f"Bearer {customer_token}"},
        )
        assert res1.status_code == 403

        res2 = await client.post(
            f"/api/v1/tickets/admin/{random_id}/reply",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"content": "unauthorized reply"},
        )
        assert res2.status_code == 403

        res3 = await client.patch(
            f"/api/v1/tickets/admin/{random_id}/status",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"status": "CLOSED"},
        )
        assert res3.status_code == 403


@pytest.mark.asyncio
async def test_customer_create_ticket_and_list_my(db_session: AsyncSession) -> None:
    customer = User(
        messenger_id=f"cust_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
    )
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    token = create_access_token(subject=str(customer.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_res = await client.post(
            "/api/v1/tickets",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "subject": "درخواست پشتیبانی فنی تابلو فرمان",
                "content": "با سلام، خطای E20 روی اینورتر نمایش داده می‌شود.",
                "priority": "HIGH",
            },
        )
        assert create_res.status_code == 201
        data = create_res.json()
        assert data["subject"] == "درخواست پشتیبانی فنی تابلو فرمان"
        assert data["status"] == "OPEN"
        assert data["priority"] == "HIGH"
        assert len(data["messages"]) == 1
        assert data["messages"][0]["content"] == "با سلام، خطای E20 روی اینورتر نمایش داده می‌شود."
        assert data["messages"][0]["is_from_admin"] is False

        ticket_id = data["id"]

        # List customer tickets
        list_res = await client.get(
            "/api/v1/tickets/my",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert list_res.status_code == 200
        my_tickets = list_res.json()
        assert any(t["id"] == ticket_id for t in my_tickets)


@pytest.mark.asyncio
async def test_customer_isolation(db_session: AsyncSession) -> None:
    # Customer A
    user_a = User(
        messenger_id=f"cust_a_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
    )
    # Customer B
    user_b = User(
        messenger_id=f"cust_b_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
    )
    db_session.add_all([user_a, user_b])
    await db_session.commit()

    token_a = create_access_token(subject=str(user_a.id))
    token_b = create_access_token(subject=str(user_b.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # A creates ticket
        res = await client.post(
            "/api/v1/tickets",
            headers={"Authorization": f"Bearer {token_a}"},
            json={
                "subject": "تیکت محرمانه مشتری الف",
                "content": "اطلاعات مالی و پروژه",
                "priority": "MEDIUM",
            },
        )
        assert res.status_code == 201
        ticket_id = res.json()["id"]

        # B attempts to view A's ticket
        get_res = await client.get(
            f"/api/v1/tickets/{ticket_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert get_res.status_code == 403

        # B attempts to reply to A's ticket
        reply_res = await client.post(
            f"/api/v1/tickets/{ticket_id}/reply",
            headers={"Authorization": f"Bearer {token_b}"},
            json={"content": "پاسخ غیرمجاز"},
        )
        assert reply_res.status_code == 403


@pytest.mark.asyncio
async def test_customer_reply_and_thread(db_session: AsyncSession) -> None:
    customer = User(
        messenger_id=f"cust_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
    )
    db_session.add(customer)
    await db_session.commit()

    token = create_access_token(subject=str(customer.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create ticket
        create_res = await client.post(
            "/api/v1/tickets",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "subject": "استعلام قیمت سیم بکسل گوستاوولف",
                "content": "نیاز به یک کلاف ۱۰۰ متری نمره ۱۰",
                "priority": "LOW",
            },
        )
        assert create_res.status_code == 201
        ticket_id = create_res.json()["id"]

        # Reply
        reply_res = await client.post(
            f"/api/v1/tickets/{ticket_id}/reply",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "همچنین لطفاً مغزی کنفی باشد."},
        )
        assert reply_res.status_code == 201
        reply_data = reply_res.json()
        assert reply_data["content"] == "همچنین لطفاً مغزی کنفی باشد."
        assert reply_data["is_from_admin"] is False

        # Read ticket thread
        get_res = await client.get(
            f"/api/v1/tickets/{ticket_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert get_res.status_code == 200
        ticket_data = get_res.json()
        assert len(ticket_data["messages"]) == 2


@pytest.mark.asyncio
async def test_admin_flow_reply_and_status(db_session: AsyncSession) -> None:
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
    )
    customer = User(
        messenger_id=f"cust_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
    )
    db_session.add_all([admin, customer])
    await db_session.commit()

    admin_token = create_access_token(subject=str(admin.id))
    customer_token = create_access_token(subject=str(customer.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Customer creates ticket
        c_res = await client.post(
            "/api/v1/tickets",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "subject": "خرابی آسانسور برج آسمان",
                "content": "کابین در طبقه چهارم گیر کرده است.",
                "priority": "CRITICAL",
            },
        )
        assert c_res.status_code == 201
        ticket_id = c_res.json()["id"]

        # Admin lists all tickets
        list_res = await client.get(
            "/api/v1/tickets/admin",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert list_res.status_code == 200
        admin_tickets = list_res.json()
        assert any(t["id"] == ticket_id for t in admin_tickets)

        # Admin views single ticket
        view_res = await client.get(
            f"/api/v1/tickets/{ticket_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert view_res.status_code == 200
        assert view_res.json()["priority"] == "CRITICAL"

        # Admin replies
        reply_res = await client.post(
            f"/api/v1/tickets/admin/{ticket_id}/reply",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"content": "تیم امداد و نجات فنی اعزام گردید."},
        )
        assert reply_res.status_code == 201
        assert reply_res.json()["is_from_admin"] is True

        # Admin updates status to IN_PROGRESS
        patch1 = await client.patch(
            f"/api/v1/tickets/admin/{ticket_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "IN_PROGRESS"},
        )
        assert patch1.status_code == 200
        assert patch1.json()["status"] == "IN_PROGRESS"

        # Admin updates status to CLOSED
        patch2 = await client.patch(
            f"/api/v1/tickets/admin/{ticket_id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "CLOSED"},
        )
        assert patch2.status_code == 200
        assert patch2.json()["status"] == "CLOSED"


@pytest.mark.asyncio
async def test_ticket_not_found(db_session: AsyncSession) -> None:
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
    )
    db_session.add(admin)
    await db_session.commit()

    token = create_access_token(subject=str(admin.id))
    random_id = uuid.uuid4()

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r1 = await client.get(
            f"/api/v1/tickets/{random_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r1.status_code == 404

        r2 = await client.post(
            f"/api/v1/tickets/{random_id}/reply",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "test"},
        )
        assert r2.status_code == 404

        r3 = await client.post(
            f"/api/v1/tickets/admin/{random_id}/reply",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": "test"},
        )
        assert r3.status_code == 404

        r4 = await client.patch(
            f"/api/v1/tickets/admin/{random_id}/status",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "CLOSED"},
        )
        assert r4.status_code == 404
