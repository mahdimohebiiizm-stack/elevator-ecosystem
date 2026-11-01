import asyncio
import sys
from sqlalchemy import select, delete
from db.session import AsyncSessionLocal
from db.models.user import User, UserRole, UserAddress
from db.models.order import Order, OrderItem, Transaction
from db.models.contract import ServiceContract
from db.models.ticket import Ticket, TicketMessage
from db.models.notification import Notification
from db.models.service import Elevator, ServiceRequest, Contract as ElevatorContract

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

REAL_ADMIN_PHONE = "09133982695"

# Verified real customer accounts that MUST be preserved
VERIFIED_REAL_PHONES = {
    "09133982695",  # Primary Admin: مهندس محبی
    "09137681873",  # علی احمدی
    "09132223344",  # رضا محمدی (برج سپهر کرمان)
    "09137778899",  # فاطمه شمس (مجتمع گلستان)
    "09930046324",  # احمد رضایی (مدیر مجتمع مهر)
    "09121112233",  # سارا کریمی (پروژه برج آفتاب)
    "09359876543",  # محمد حسینی (پیمانکار البرز)
}

async def execute_cascading_purge():
    async with AsyncSessionLocal() as session:
        # 1. Fetch all users
        stmt = select(User)
        result = await session.execute(stmt)
        all_users = result.scalars().all()
        print(f"Total users in DB before purge: {len(all_users)}")

        fake_users_to_purge = []
        real_users_to_keep = []

        for u in all_users:
            # Always preserve the primary admin
            if u.phone == REAL_ADMIN_PHONE or u.role == UserRole.ADMIN:
                real_users_to_keep.append(u)
                continue

            # Check if this user is a verified real customer
            if u.phone in VERIFIED_REAL_PHONES:
                real_users_to_keep.append(u)
                continue

            name = (u.name or "").strip()
            name_lower = name.lower()

            # Target criteria from Product Owner:
            # name contains 'تست' OR 'test' OR 'آسانرو' OR 'مشتری' OR name is NULL/empty
            is_fake = False
            if not name:
                is_fake = True
            elif "تست" in name:
                is_fake = True
            elif "test" in name_lower:
                is_fake = True
            elif "آسانرو" in name:
                is_fake = True
            elif "مشتری" in name:
                is_fake = True
            elif name_lower == "existing user":
                is_fake = True
            elif not u.phone:
                is_fake = True
            elif u.messenger_id and (
                u.messenger_id.startswith("order_tester_")
                or u.messenger_id.startswith("pay_user_")
                or u.messenger_id.startswith("val_user_")
                or u.messenger_id.startswith("cust_")
                or u.messenger_id.startswith("u1_")
                or u.messenger_id.startswith("u2_")
                or u.messenger_id.startswith("tg_bot_user_")
                or u.messenger_id.startswith("tg_")
                or u.messenger_id.startswith("bale_")
                or u.messenger_id.startswith("telegram_12345")
            ):
                is_fake = True

            if is_fake:
                fake_users_to_purge.append(u)
            else:
                real_users_to_keep.append(u)

        print(f"\n--- IDENTIFIED TARGETS ---")
        print(f"Fake customers to permanently destroy: {len(fake_users_to_purge)}")
        print(f"Real accounts preserved: {len(real_users_to_keep)}")
        for r in real_users_to_keep:
            print(f"  PRESERVED: ID={r.id} | Phone={r.phone} | Name={r.name} | Role={r.role}")

        if not fake_users_to_purge:
            print("No fake customers found to purge.")
            return

        fake_user_ids = [u.id for u in fake_users_to_purge]

        print(f"\n--- EXECUTING CASCADING DELETIONS ---")

        # 1. Ticket Messages
        del_tkt_msg = await session.execute(
            delete(TicketMessage).where(
                TicketMessage.sender_id.in_(fake_user_ids)
                | TicketMessage.ticket_id.in_(
                    select(Ticket.id).where(Ticket.user_id.in_(fake_user_ids))
                )
            )
        )
        print(f"  [1/9] Deleted ticket messages: {del_tkt_msg.rowcount}")

        # 2. Tickets
        del_tkt = await session.execute(
            delete(Ticket).where(Ticket.user_id.in_(fake_user_ids))
        )
        print(f"  [2/9] Deleted tickets: {del_tkt.rowcount}")

        # 3. Transactions (Order payments)
        del_tx = await session.execute(
            delete(Transaction).where(
                Transaction.order_id.in_(
                    select(Order.id).where(Order.user_id.in_(fake_user_ids))
                )
            )
        )
        print(f"  [3/9] Deleted order transactions: {del_tx.rowcount}")

        # 4. Order Items
        del_oi = await session.execute(
            delete(OrderItem).where(
                OrderItem.order_id.in_(
                    select(Order.id).where(Order.user_id.in_(fake_user_ids))
                )
            )
        )
        print(f"  [4/9] Deleted order items: {del_oi.rowcount}")

        # 5. Orders
        del_ord = await session.execute(
            delete(Order).where(Order.user_id.in_(fake_user_ids))
        )
        print(f"  [5/9] Deleted orders: {del_ord.rowcount}")

        # 6. Service Contracts
        del_sc = await session.execute(
            delete(ServiceContract).where(ServiceContract.user_id.in_(fake_user_ids))
        )
        print(f"  [6/9] Deleted service contracts: {del_sc.rowcount}")

        # 7. Elevators & Service Requests
        fake_elevator_ids_subquery = select(Elevator.id).where(Elevator.user_id.in_(fake_user_ids))
        del_sr = await session.execute(
            delete(ServiceRequest).where(ServiceRequest.elevator_id.in_(fake_elevator_ids_subquery))
        )
        del_ec = await session.execute(
            delete(ElevatorContract).where(ElevatorContract.elevator_id.in_(fake_elevator_ids_subquery))
        )
        del_el = await session.execute(
            delete(Elevator).where(Elevator.user_id.in_(fake_user_ids))
        )
        print(f"  [7/9] Deleted elevators & requests: {del_el.rowcount + del_sr.rowcount + del_ec.rowcount}")

        # 8. Notifications & User Addresses
        del_notif = await session.execute(
            delete(Notification).where(Notification.user_id.in_(fake_user_ids))
        )
        del_addr = await session.execute(
            delete(UserAddress).where(UserAddress.user_id.in_(fake_user_ids))
        )
        print(f"  [8/9] Deleted notifications ({del_notif.rowcount}) & addresses ({del_addr.rowcount})")

        # 9. Hard Delete Fake Users
        del_users = await session.execute(
            delete(User).where(User.id.in_(fake_user_ids))
        )
        print(f"  [9/9] Hard deleted fake customer users: {del_users.rowcount}")

        # COMMIT the transaction
        await session.commit()
        print("\n>>> TRANSACTION COMMITTED SUCCESSFULLY TO POSTGRESQL <<<")

        # Post-purge verification
        remaining_users = (await session.scalars(select(User).order_by(User.role, User.created_at))).all()
        print(f"\n--- POST-PURGE DATABASE VERIFICATION ---")
        print(f"Total remaining users in DB: {len(remaining_users)}")
        for idx, ru in enumerate(remaining_users, 1):
            print(f"  #{idx}: Name='{ru.name}' | Phone={ru.phone} | Role={ru.role} | ID={ru.id}")

if __name__ == "__main__":
    asyncio.run(execute_cascading_purge())
