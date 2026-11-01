import uuid
from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.endpoints.bot import (
    BotState,
    get_user_state,
    user_drafts,
    user_states,
)
from db.models.contract import ContractStatus, ServiceContract
from db.models.notification import Notification
from db.models.ticket import Ticket, TicketMessage, TicketStatus
from db.models.user import User, UserRole
from main import app


@pytest.mark.asyncio
async def test_telegram_webhook_start_command() -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "update_id": 10001,
            "message": {
                "message_id": 1,
                "from": {"id": 123456, "first_name": "Reza"},
                "chat": {"id": 123456, "type": "private"},
                "text": "/start",
            },
        }
        res = await client.post("/api/v1/bot/telegram/webhook", json=payload)
        assert res.status_code == 200
        assert res.json() == {"ok": True}


@pytest.mark.asyncio
async def test_telegram_webhook_contact_auto_registration(
    db_session: AsyncSession,
) -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        digits_suffix = f"{uuid.uuid4().int % 10000000:07d}"
        phone_raw = f"+98913{digits_suffix}"
        expected_phone = f"0913{digits_suffix}"
        tg_user_id = str(uuid.uuid4().int % 100000000)

        payload = {
            "update_id": 10002,
            "message": {
                "message_id": 2,
                "from": {"id": tg_user_id, "first_name": "علی", "last_name": "احمدی"},
                "chat": {"id": tg_user_id, "type": "private"},
                "contact": {
                    "phone_number": phone_raw,
                    "first_name": "علی",
                    "last_name": "احمدی",
                    "user_id": tg_user_id,
                },
            },
        }

        res = await client.post("/api/v1/bot/telegram/webhook", json=payload)
        assert res.status_code == 200
        assert res.json() == {"ok": True}

        # Verify user is auto-registered in DB
        stmt = select(User).where(User.phone == expected_phone)
        result = await db_session.execute(stmt)
        user = result.scalar_one_or_none()
        assert user is not None
        assert user.role == UserRole.CUSTOMER
        assert user.is_active is True
        assert user.telegram_id == tg_user_id
        assert "علی" in user.name


@pytest.mark.asyncio
async def test_bale_webhook_contact_link_existing_user(
    db_session: AsyncSession,
) -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        digits_suffix = f"{uuid.uuid4().int % 10000000:07d}"
        user_phone = f"0912{digits_suffix}"
        bale_user_id = str(uuid.uuid4().int % 100000000)

        # Pre-seed existing user without bale_id
        existing_user = User(
            messenger_id=f"user_{digits_suffix}",
            phone=user_phone,
            name="Existing User",
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        db_session.add(existing_user)
        await db_session.commit()
        await db_session.refresh(existing_user)

        payload = {
            "update_id": 20001,
            "message": {
                "message_id": 10,
                "from": {"id": bale_user_id, "first_name": "Existing"},
                "chat": {"id": bale_user_id, "type": "private"},
                "contact": {
                    "phone_number": f"98{user_phone[1:]}",  # 98912... variation
                    "first_name": "Existing",
                    "user_id": bale_user_id,
                },
            },
        }

        res = await client.post("/api/v1/bot/bale/webhook", json=payload)
        assert res.status_code == 200
        assert res.json() == {"ok": True}

        # Verify existing user got linked with bale_id
        await db_session.refresh(existing_user)
        assert existing_user.bale_id == bale_user_id


@pytest.mark.asyncio
async def test_bot_rbac_denial_for_customer(db_session: AsyncSession) -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tg_id = str(uuid.uuid4().int % 100000000)
        customer = User(
            messenger_id=f"cust_{tg_id}",
            phone=f"0913{uuid.uuid4().int % 10000000:07d}",
            name="Customer RBAC Test",
            role=UserRole.CUSTOMER,
            telegram_id=tg_id,
            is_active=True,
        )
        db_session.add(customer)
        await db_session.commit()

        # Customer attempts to run admin command
        payload = {
            "update_id": 30001,
            "message": {
                "message_id": 11,
                "from": {"id": tg_id},
                "chat": {"id": tg_id},
                "text": "📈 آمار کلیدی امروز",
            },
        }
        res = await client.post("/api/v1/bot/telegram/webhook", json=payload)
        assert res.status_code == 200
        assert res.json() == {"ok": True}


@pytest.mark.asyncio
async def test_bot_admin_metrics_and_actions(db_session: AsyncSession) -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_tg_id = str(uuid.uuid4().int % 100000000)
        stmt = select(User).where(User.phone == "09133982695")
        admin_user = (await db_session.execute(stmt)).scalars().first()
        if admin_user:
            admin_user.telegram_id = admin_tg_id
            admin_user.role = UserRole.ADMIN
        else:
            admin_user = User(
                messenger_id=f"admin_{admin_tg_id}",
                phone="09133982695",
                name="مدیر مهندس محبی",
                role=UserRole.ADMIN,
                telegram_id=admin_tg_id,
                is_active=True,
            )
            db_session.add(admin_user)
        await db_session.commit()

        # Admin runs metrics
        payload = {
            "update_id": 40001,
            "message": {
                "message_id": 20,
                "from": {"id": admin_tg_id},
                "chat": {"id": admin_tg_id},
                "text": "📈 آمار کلیدی امروز",
            },
        }
        res = await client.post("/api/v1/bot/telegram/webhook", json=payload)
        assert res.status_code == 200
        assert res.json() == {"ok": True}

        # Admin runs latest orders query
        payload["message"]["text"] = "📦 آخرین سفارشات"
        res_orders = await client.post("/api/v1/bot/telegram/webhook", json=payload)
        assert res_orders.status_code == 200

        # Admin runs pending contracts query
        payload["message"]["text"] = "📝 قراردادهای جدید"
        res_cnt = await client.post("/api/v1/bot/telegram/webhook", json=payload)
        assert res_cnt.status_code == 200

        # Admin runs open tickets query
        payload["message"]["text"] = "🎫 تیکتهای باز"
        res_tkt = await client.post("/api/v1/bot/telegram/webhook", json=payload)
        assert res_tkt.status_code == 200

        # Admin site link
        payload["message"]["text"] = "⚙️ مدیریت سامانه (سایت)"
        res_site = await client.post("/api/v1/bot/telegram/webhook", json=payload)
        assert res_site.status_code == 200


@pytest.mark.asyncio
async def test_bot_customer_menu_navigation(db_session: AsyncSession) -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tg_id = str(uuid.uuid4().int % 100000000)
        customer = User(
            messenger_id=f"cust_nav_{tg_id}",
            phone=f"0913{uuid.uuid4().int % 10000000:07d}",
            name="Customer Nav",
            role=UserRole.CUSTOMER,
            telegram_id=tg_id,
            wallet_balance=5000000,
            is_active=True,
        )
        db_session.add(customer)
        await db_session.commit()

        def make_msg(text: str) -> dict:
            return {
                "update_id": uuid.uuid4().int % 100000,
                "message": {
                    "message_id": 1,
                    "from": {"id": tg_id},
                    "chat": {"id": tg_id},
                    "text": text,
                },
            }

        # Test submenus
        commands = [
            "🛒 خدمات فروشگاه و خرید",
            "🛍️ کاتالوگ (سایت)",
            "📦 پیگیری سفارشات من",
            "🔙 بازگشت",
            "🏢 خدمات آسانسور و قراردادها",
            "📋 وضعیت قراردادهای من",
            "🛠️ ثبت خرابی فوری (اپلیکیشن)",
            "🔙 بازگشت",
            "💬 پشتیبانی و حساب کاربری",
            "📬 پیگیری تیکتها",
            "💰 موجودی کیف پول",
            "⚙️ تنظیمات پروفایل",
            "🔙 بازگشت",
        ]
        for cmd in commands:
            res = await client.post("/api/v1/bot/telegram/webhook", json=make_msg(cmd))
            assert res.status_code == 200
            assert res.json() == {"ok": True}


@pytest.mark.asyncio
async def test_bot_contract_fsm_wizard_atomic_commit(
    db_session: AsyncSession,
) -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tg_id = str(uuid.uuid4().int % 100000000)
        customer = User(
            messenger_id=f"cust_fsm_{tg_id}",
            phone=f"0913{uuid.uuid4().int % 10000000:07d}",
            name="مشتری قرارداد تست",
            role=UserRole.CUSTOMER,
            telegram_id=tg_id,
            is_active=True,
        )
        db_session.add(customer)
        await db_session.commit()

        user_key = f"telegram_{tg_id}"

        def make_msg(text: str) -> dict:
            return {
                "update_id": uuid.uuid4().int % 100000,
                "message": {
                    "message_id": 1,
                    "from": {"id": tg_id},
                    "chat": {"id": tg_id},
                    "text": text,
                },
            }

        # Step 1: Start contract wizard
        res1 = await client.post(
            "/api/v1/bot/telegram/webhook",
            json=make_msg("📝 درخواست قرارداد سرویس"),
        )
        assert res1.status_code == 200
        assert get_user_state(user_key) == BotState.CONTRACT_WAITING_BUILDING_NAME

        # Step 2: Send building name
        building_name = "برج تجاری الماس"
        res_bname = await client.post(
            "/api/v1/bot/telegram/webhook",
            json=make_msg(building_name),
        )
        assert res_bname.status_code == 200
        assert get_user_state(user_key) == BotState.CONTRACT_WAITING_ADDRESS

        # Step 3: Send address
        project_addr = "کرمان، میدان آزادی، بلوار جمهوری اسلامی"
        res2 = await client.post(
            "/api/v1/bot/telegram/webhook",
            json=make_msg(project_addr),
        )
        assert res2.status_code == 200
        assert get_user_state(user_key) == BotState.CONTRACT_WAITING_NATIONAL_ID

        # Step 4: Send employer national ID
        nid = "2991234567"
        res_nid = await client.post(
            "/api/v1/bot/telegram/webhook",
            json=make_msg(nid),
        )
        assert res_nid.status_code == 200
        assert get_user_state(user_key) == BotState.CONTRACT_WAITING_TYPE

        # Step 5: Send elevator type
        res3 = await client.post(
            "/api/v1/bot/telegram/webhook",
            json=make_msg("کششی گرلس (MRL)"),
        )
        assert res3.status_code == 200
        assert get_user_state(user_key) == BotState.CONTRACT_WAITING_STOPS

        # Step 6: Send stops count (Persian digits supported: ۷)
        res4 = await client.post(
            "/api/v1/bot/telegram/webhook",
            json=make_msg("۷"),
        )
        assert res4.status_code == 200
        assert get_user_state(user_key) == BotState.IDLE

        # Verify DB insert for ServiceContract and enforce No Pricing by Customer rule
        stmt = (
            select(ServiceContract)
            .where(ServiceContract.user_id == customer.id)
            .order_by(ServiceContract.created_at.desc())
        )
        res_db = await db_session.execute(stmt)
        contract = res_db.scalar_one_or_none()
        assert contract is not None
        assert contract.building_name == building_name
        assert contract.building_address == project_addr
        assert contract.employer_national_id == nid
        assert contract.elevator_type == "کششی گرلس (MRL)"
        assert contract.stops_count == 7
        assert contract.status == ContractStatus.PENDING
        assert contract.annual_price is None  # Strictly Enforce No Pricing Rule
        assert contract.qr_code_hash is not None

        # Verify notifications created
        notif_stmt = select(Notification).where(Notification.user_id == customer.id)
        notif_res = await db_session.execute(notif_stmt)
        assert len(notif_res.scalars().all()) >= 1


@pytest.mark.asyncio
async def test_bot_ticket_fsm_wizard_atomic_commit(
    db_session: AsyncSession,
) -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tg_id = str(uuid.uuid4().int % 100000000)
        customer = User(
            messenger_id=f"cust_tkt_{tg_id}",
            phone=f"0913{uuid.uuid4().int % 10000000:07d}",
            name="مشتری تیکت تست",
            role=UserRole.CUSTOMER,
            telegram_id=tg_id,
            is_active=True,
        )
        db_session.add(customer)
        await db_session.commit()

        user_key = f"telegram_{tg_id}"

        def make_msg(text: str) -> dict:
            return {
                "update_id": uuid.uuid4().int % 100000,
                "message": {
                    "message_id": 1,
                    "from": {"id": tg_id},
                    "chat": {"id": tg_id},
                    "text": text,
                },
            }

        # Step 1: Start ticket wizard
        res1 = await client.post(
            "/api/v1/bot/telegram/webhook",
            json=make_msg("🎫 ثبت تیکت جدید"),
        )
        assert res1.status_code == 200
        assert get_user_state(user_key) == BotState.TICKET_WAITING_SUBJECT

        # Step 2: Send ticket subject
        res2 = await client.post(
            "/api/v1/bot/telegram/webhook",
            json=make_msg("استعلام قطعات آسانسور گیرلس"),
        )
        assert res2.status_code == 200
        assert get_user_state(user_key) == BotState.TICKET_WAITING_MESSAGE

        # Step 3: Send ticket message body
        res3 = await client.post(
            "/api/v1/bot/telegram/webhook",
            json=make_msg("سلام، لطفاً قیمت روز موتور گیرلس آلبرتوساسی را بفرمایید."),
        )
        assert res3.status_code == 200
        assert get_user_state(user_key) == BotState.IDLE

        # Verify DB insert for Ticket and TicketMessage
        stmt = (
            select(Ticket)
            .where(Ticket.user_id == customer.id)
            .order_by(Ticket.created_at.desc())
        )
        res_db = await db_session.execute(stmt)
        ticket = res_db.scalar_one_or_none()
        assert ticket is not None
        assert ticket.subject == "استعلام قطعات آسانسور گیرلس"
        assert ticket.status == TicketStatus.OPEN

        # Verify TicketMessage
        msg_stmt = select(TicketMessage).where(TicketMessage.ticket_id == ticket.id)
        msg_res = await db_session.execute(msg_stmt)
        ticket_message = msg_res.scalar_one_or_none()
        assert ticket_message is not None
        assert "موتور گیرلس" in ticket_message.content
        assert ticket_message.is_from_admin is False


@pytest.mark.asyncio
async def test_bot_admin_direct_message_fsm(db_session: AsyncSession) -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_tg_id = str(uuid.uuid4().int % 100000000)
        target_tg_id = str(uuid.uuid4().int % 100000000)
        target_phone = f"0913{uuid.uuid4().int % 10000000:07d}"

        # 1. Admin
        admin = User(
            messenger_id=f"admin_dm_{admin_tg_id}",
            phone="09133982695",
            name="مهندس محبی",
            role=UserRole.ADMIN,
            telegram_id=admin_tg_id,
            is_active=True,
        )
        # 2. Target Customer
        customer = User(
            messenger_id=f"cust_dm_{target_tg_id}",
            phone=target_phone,
            name="مشتری گرامی",
            role=UserRole.CUSTOMER,
            telegram_id=target_tg_id,
            is_active=True,
        )
        db_session.add(admin)
        db_session.add(customer)
        await db_session.commit()

        admin_key = f"telegram_{admin_tg_id}"

        def make_admin_msg(text: str) -> dict:
            return {
                "update_id": uuid.uuid4().int % 100000,
                "message": {
                    "message_id": 1,
                    "from": {"id": admin_tg_id},
                    "chat": {"id": admin_tg_id},
                    "text": text,
                },
            }

        # Step 1: Admin clicks direct message button
        res1 = await client.post(
            "/api/v1/bot/telegram/webhook",
            json=make_admin_msg("✉️ ارسال پیام به کاربر"),
        )
        assert res1.status_code == 200
        assert get_user_state(admin_key) == BotState.ADMIN_WAITING_TARGET_USER

        # Step 2: Admin sends customer phone
        res2 = await client.post(
            "/api/v1/bot/telegram/webhook",
            json=make_admin_msg(target_phone),
        )
        assert res2.status_code == 200
        assert get_user_state(admin_key) == BotState.ADMIN_WAITING_DIRECT_MESSAGE

        # Step 3: Admin sends direct message
        msg_content = "سرویس ماهانه آسانسور شما برای روز دوشنبه ساعت ۱۰ صبح تنظیم شد."
        res3 = await client.post(
            "/api/v1/bot/telegram/webhook",
            json=make_admin_msg(msg_content),
        )
        assert res3.status_code == 200
        assert get_user_state(admin_key) == BotState.IDLE

        # Verify Notification record created in DB for customer
        stmt = select(Notification).where(Notification.user_id == customer.id)
        res_db = await db_session.execute(stmt)
        notif = res_db.scalar_one_or_none()
        assert notif is not None
        assert notif.message == msg_content


@pytest.mark.asyncio
async def test_bot_webhook_malformed_and_empty_payload() -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Empty payload
        res_empty = await client.post("/api/v1/bot/telegram/webhook", json={})
        assert res_empty.status_code == 200
        assert res_empty.json() == {"ok": True}

        # Incomplete message without chat or from
        res_malformed = await client.post(
            "/api/v1/bot/bale/webhook", json={"message": {"text": "hello"}}
        )
        assert res_malformed.status_code == 200
        assert res_malformed.json() == {"ok": True}
