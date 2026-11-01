import asyncio
from datetime import date, datetime, timedelta, timezone
import sys
from sqlalchemy import delete, or_, select, update

from db.session import AsyncSessionLocal
from db.models.user import User, UserAddress, UserRole
from db.models.product import Category, Product
from db.models.order import (
    Order,
    OrderItem,
    OrderStatus,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from db.models.ticket import Ticket, TicketMessage, TicketPriority, TicketStatus
from db.models.service import (
    Elevator,
    Contract,
    ServiceRequest,
    ServiceRequestType,
    ServiceRequestStatus,
)
from db.models.cms import SiteSetting


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


async def seed_database() -> None:
    print("[SEED] Starting Database Seeding Routine...")

    async with AsyncSessionLocal() as session:
        # -------------------------------------------------------------
        # 1. SEED USERS & ENFORCE STRICT ENUMERATION (1 ADMIN + EXACTLY 5 CUSTOMERS)
        # -------------------------------------------------------------
        print("[SEED] Checking & Enforcing Users (1 Admin + Exactly 5 Customers)...")
        
        admin_phone = "09133982695"
        allowed_customer_phones = [
            ("09930046324", "احمد رضایی (مدیر مجتمع مهر)", 500000),
            ("09121112233", "سارا کریمی (پروژه برج آفتاب)", 1200000),
            ("09359876543", "محمد حسینی (پیمانکار البرز)", 0),
            ("09132223344", "رضا محمدی (برج سپهر کرمان)", 750000),
            ("09137778899", "فاطمه شمس (مجتمع گلستان)", 300000),
        ]
        all_allowed_phones = {admin_phone} | {p[0] for p in allowed_customer_phones}

        # 1.1 Wipe any extra or stray users not in the designated list
        wipe_stmt = delete(User).where(
            or_(
                User.phone.is_(None),
                ~User.phone.in_(all_allowed_phones),
            )
        )
        wiped_res = await session.execute(wipe_stmt)
        if wiped_res.rowcount > 0:
            print(f"   -> Wiped {wiped_res.rowcount} obsolete/duplicate test users.")

        # 1.1.1 Deduplicate any multiple records for the designated phones
        for phone in all_allowed_phones:
            dup_stmt = select(User).where(User.phone == phone).order_by(User.created_at)
            dupes = (await session.execute(dup_stmt)).scalars().all()
            if len(dupes) > 1:
                for extra in dupes[1:]:
                    await session.delete(extra)
                await session.flush()

        # 1.2 Seed / Update the EXACT single Admin
        admin_stmt = select(User).where(User.phone == admin_phone)
        admin = (await session.execute(admin_stmt)).scalar_one_or_none()
        if not admin:
            admin = User(
                phone=admin_phone,
                name="مهندس محبی (مدیریت شرکت آسانرو)",
                messenger_id=f"web_{admin_phone}",
                role=UserRole.ADMIN,
                wallet_balance=0,
                is_active=True,
            )
            session.add(admin)
            await session.flush()
            print(f"   -> Admin user created ({admin.phone}, ID: {admin.id})")
        else:
            admin.name = "مهندس محبی (مدیریت شرکت آسانرو)"
            admin.role = UserRole.ADMIN
            admin.is_active = True
            print(f"   -> Admin user verified ({admin.phone})")

        # 1.3 Ensure Admin Address
        admin_addr_stmt = select(UserAddress).where(UserAddress.user_id == admin.id)
        if not (await session.execute(admin_addr_stmt)).scalar_one_or_none():
            admin_address = UserAddress(
                user_id=admin.id,
                title="دفتر مرکزی شرکت آسانرو",
                province="کرمان",
                city="کرمان",
                postal_code="7618954321",
                full_address="کرمان، بلوار جمهوری اسلامی، نبش کوچه ۱۵، شرکت آسانرو اطمینان امیر کرمان",
                is_default=True,
            )
            session.add(admin_address)

        # 1.4 Seed / Update EXACTLY 5 Customers
        for c_phone, c_name, c_wallet in allowed_customer_phones:
            c_stmt = select(User).where(User.phone == c_phone)
            cust = (await session.execute(c_stmt)).scalar_one_or_none()
            if not cust:
                cust = User(
                    phone=c_phone,
                    name=c_name,
                    messenger_id=f"web_{c_phone}",
                    role=UserRole.CUSTOMER,
                    wallet_balance=c_wallet,
                    is_active=True,
                )
                session.add(cust)
                await session.flush()
                print(f"   -> Customer user created ({c_phone}: {c_name})")
            else:
                cust.name = c_name
                cust.role = UserRole.CUSTOMER
                cust.wallet_balance = c_wallet
                cust.is_active = True
                print(f"   -> Customer user updated ({c_phone}: {c_name})")

            # Address for primary customer
            if c_phone == "09930046324":
                cust_addr_stmt = select(UserAddress).where(UserAddress.user_id == cust.id)
                if not (await session.execute(cust_addr_stmt)).scalar_one_or_none():
                    customer_address = UserAddress(
                        user_id=cust.id,
                        title="ساختمان مهر",
                        province="کرمان",
                        city="کرمان",
                        postal_code="7617812345",
                        full_address="کرمان، خیابان شریعتی، کوچه ۲، مجتمع مسکونی مهر، واحد ۴",
                        is_default=True,
                    )
                    session.add(customer_address)

        # 1.5 Ensure NO OTHER user has ADMIN role
        demote_stmt = (
            update(User)
            .where(User.phone != admin_phone, User.role == UserRole.ADMIN)
            .values(role=UserRole.CUSTOMER)
        )
        await session.execute(demote_stmt)
        await session.flush()

        # Primary customer instance for related entities (Orders, Tickets, Contracts)
        primary_cust_stmt = select(User).where(User.phone == "09930046324")
        customer = (await session.execute(primary_cust_stmt)).scalar_one()

        # -------------------------------------------------------------
        # 2. SEED CATEGORIES & PRODUCTS
        # -------------------------------------------------------------
        print("[SEED] Checking & Seeding Catalog...")
        cat_slug = "elevator-packages"
        cat_stmt = select(Category).where(Category.slug == cat_slug)
        category = (await session.execute(cat_stmt)).scalar_one_or_none()

        if not category:
            category = Category(
                name="پکیج‌های آسانسور",
                slug=cat_slug,
                is_active=True,
            )
            session.add(category)
            await session.flush()
            print(f"   -> Category created: {category.name}")
        else:
            print(f"   -> Category already exists: {category.name}")

        packages_to_seed = [
            (
                "PKG-MRL-01",
                "پکیج آسانسور کششی MRL گیرلس ۸ نفره",
                "پکیج کامل بدون موتورخانه (MRL) با موتور گیرلس، ظرفیت ۶۳۰ کیلوگرم (۸ نفره)، سرعت ۱ متر بر ثانیه، تابلو فرمان درایودار VVVF و کابین تمام استیل لاکچری.",
                1450000000,
                10,
            ),
            (
                "PKG-GEAR-02",
                "پکیج آسانسور کششی گیربکس ۶ نفره استاندارد",
                "پکیج کامل ۵ توقف با موتور بهران، تابلو فرمان آرمان فراز، درب‌های اتوماتیک یاران و کابین ام‌دی‌اف استیل.",
                980000000,
                8,
            ),
            (
                "PKG-HYD-03",
                "پکیج آسانسور هیدرولیک مسکونی ۴ نفره هوم‌لیفت",
                "پکیج هیدرولیک بدون نیاز به موتورخانه مناسب ویلاها و ساختمان‌های دوبلکس با جک مستقیم، شیر بلین آلمان و پاوریونیت سایلنت.",
                650000000,
                5,
            ),
        ]

        for p_sku, p_title, p_desc, p_price, p_stock in packages_to_seed:
            prod_stmt = select(Product).where(Product.sku == p_sku)
            existing_prod = (await session.execute(prod_stmt)).scalar_one_or_none()
            if not existing_prod:
                new_prod = Product(
                    category_id=category.id,
                    sku=p_sku,
                    title=p_title,
                    description=p_desc,
                    price=p_price,
                    stock_count=p_stock,
                    is_active=True,
                )
                session.add(new_prod)
                print(f"   -> Package created: {p_title} ({p_sku})")
            else:
                existing_prod.title = p_title
                existing_prod.category_id = category.id
                existing_prod.is_active = True
                print(f"   -> Package verified: {p_title} ({p_sku})")
        await session.flush()

        # Primary package reference for orders
        primary_pkg_stmt = select(Product).where(Product.sku == "PKG-MRL-01")
        product = (await session.execute(primary_pkg_stmt)).scalar_one()

        # -------------------------------------------------------------
        # 3. SEED CUSTOMER ORDER & TRANSACTION
        # -------------------------------------------------------------
        print("[SEED] Checking & Seeding Orders...")
        tracking_code = "293847561029"
        order_stmt = select(Order).where(Order.tracking_code == tracking_code)
        order = (await session.execute(order_stmt)).scalar_one_or_none()

        if not order:
            order = Order(
                user_id=customer.id,
                total_price=1450000000,
                status=OrderStatus.SHIPPED,
                shipping_method="تیپاکس",
                tracking_code=tracking_code,
                address_snapshot={
                    "title": "ساختمان مهر",
                    "province": "کرمان",
                    "city": "کرمان",
                    "postal_code": "7617812345",
                    "full_address": "کرمان، خیابان شریعتی، کوچه ۲، مجتمع مسکونی مهر، واحد ۴",
                    "phone": customer.phone,
                },
            )
            session.add(order)
            await session.flush()

            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=1,
                unit_price_at_purchase=1450000000,
            )
            session.add(order_item)

            transaction = Transaction(
                order_id=order.id,
                gateway_name="Zarinpal",
                amount=1450000000,
                authority="A00000000000000000000000000123456789",
                ref_id="TRX-84729104",
                status=TransactionStatus.SUCCESS,
                transaction_type=TransactionType.ORDER_PAYMENT,
                receipt_url="https://asanro-etminan.ir/receipts/rec-98213.pdf",
            )
            session.add(transaction)
            print(f"   -> Order created with ID: {order.id}, Status: {order.status}")
        else:
            print(f"   -> Order already exists ({order.tracking_code})")

        # -------------------------------------------------------------
        # 4. SEED SUPPORT TICKETS
        # -------------------------------------------------------------
        print("[SEED] Checking & Seeding Tickets...")
        ticket_subject = "سوال درباره پکیج آسانسور MRL"
        ticket_stmt = select(Ticket).where(
            Ticket.user_id == customer.id,
            Ticket.subject == ticket_subject,
        )
        ticket = (await session.execute(ticket_stmt)).scalar_one_or_none()

        if not ticket:
            ticket = Ticket(
                user_id=customer.id,
                subject=ticket_subject,
                status=TicketStatus.REPLIED,
                priority=TicketPriority.MEDIUM,
            )
            session.add(ticket)
            await session.flush()

            # Message 1: Customer asks question
            msg1 = TicketMessage(
                ticket_id=ticket.id,
                sender_id=customer.id,
                content="سلام و احترام، آیا هزینه نصب و ریل‌گذاری نیز همراه با این پکیج محاسبه شده است یا نیاز به قرارداد جداگانه دارد؟",
                is_from_admin=False,
            )
            session.add(msg1)

            # Message 2: Admin reply
            msg2 = TicketMessage(
                ticket_id=ticket.id,
                sender_id=admin.id,
                content="با سلام و درود خدمت شما. هزینه این پکیج شامل تجهیزات کامل مکانیکال و الکتریکال می‌باشد. خدمات نصب و راه‌اندازی تحت قرارداد جداگانه خدمات فنی و با تخفیف ویژه پکیج ارائه می‌گردد.",
                is_from_admin=True,
            )
            session.add(msg2)
            print(f"   -> Ticket created with ID: {ticket.id}, Status: {ticket.status}")
        else:
            print(f"   -> Ticket already exists ({ticket.subject})")

        # -------------------------------------------------------------
        # 5. SEED ELEVATOR, CONTRACT & SERVICE REQUEST
        # -------------------------------------------------------------
        print("[SEED] Checking & Seeding Elevators & Service Contracts...")
        building_name = "مجتمع مسکونی مهر"
        elev_stmt = select(Elevator).where(
            Elevator.user_id == customer.id,
            Elevator.building_name == building_name,
        )
        elevator = (await session.execute(elev_stmt)).scalar_one_or_none()

        if not elevator:
            elevator = Elevator(
                user_id=customer.id,
                building_name=building_name,
                postal_code="7617812345",
                elevator_type="کششی گرلس",
                capacity_kg=300,
                stops=5,
                speed=1.0,
            )
            session.add(elevator)
            await session.flush()
            print(f"   -> Elevator registered: {elevator.building_name} (ID: {elevator.id})")
        else:
            print(f"   -> Elevator already registered: {elevator.building_name}")

        contract_num = "CNT-1403-0892"
        cnt_stmt = select(Contract).where(Contract.contract_number == contract_num)
        contract = (await session.execute(cnt_stmt)).scalar_one_or_none()

        if not contract:
            contract = Contract(
                elevator_id=elevator.id,
                contract_number=contract_num,
                start_date=date(2024, 1, 1),
                end_date=date(2025, 1, 1),
                total_price=190000000,  # 19M Tomans in Rials
                is_active=True,
            )
            session.add(contract)
            print(f"   -> Contract created: {contract.contract_number}")
        else:
            print(f"   -> Contract already exists: {contract.contract_number}")

        sr_stmt = select(ServiceRequest).where(ServiceRequest.elevator_id == elevator.id)
        service_req = (await session.execute(sr_stmt)).scalar_one_or_none()

        if not service_req:
            service_req = ServiceRequest(
                elevator_id=elevator.id,
                type=ServiceRequestType.REPAIR_REQUEST,
                status=ServiceRequestStatus.IN_PROGRESS,
                description="آسانسور در طبقه ۲ هنگام توقف تکان شدید دارد و درب گاهی گیر می‌کند.",
                scheduled_date=datetime.now(timezone.utc) + timedelta(days=1),
            )
            session.add(service_req)
            print(f"   -> Service Request created: {service_req.type} ({service_req.status})")
        else:
            print(f"   -> Service Request already exists for elevator")

        # -------------------------------------------------------------
        # 6. SEED CMS & SITE SETTINGS
        # -------------------------------------------------------------
        print("[SEED] Checking & Seeding CMS Site Settings...")
        cms_stmt = select(SiteSetting).where(SiteSetting.id == "main_config")
        site_setting = (await session.execute(cms_stmt)).scalar_one_or_none()

        if not site_setting:
            site_setting = SiteSetting(
                id="main_config",
                contact_phone="09133982695",
                contact_email="etminannamirrelee@gmail.com",
                hero_banners=[],
                about_text="شرکت آسانرو اطمینان امیر کرمان با مدیریت آقای محبی، ارائه‌دهنده خدمات تخصصی نصب، راه‌اندازی، استانداردسازی، سرویس و نگهداری دوره‌ای و تامین قطعات انواع آسانسور و پله برقی در استان کرمان.",
            )
            session.add(site_setting)
            print(f"   -> SiteSetting created: {site_setting.id}")
        else:
            print(f"   -> SiteSetting already exists: {site_setting.id}")

        # Commit all entities
        await session.commit()
        print("[SEED] Database Seeding Completed Successfully!")


if __name__ == "__main__":
    try:
        asyncio.run(seed_database())
    except Exception as exc:
        print(f"[SEED ERROR]: {exc}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
