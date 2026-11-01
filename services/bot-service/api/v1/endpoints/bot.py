import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import uuid

from fastapi import APIRouter, Depends, status
import httpx
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from api.deps.uow import get_uow
from api.v1.services.bot_notifier import BotNotificationService
from core.config import settings
from db.models.contract import ContractStatus, ServiceContract
from db.models.notification import Notification
from db.models.order import Order, OrderStatus
from db.models.ticket import Ticket, TicketMessage, TicketPriority, TicketStatus
from db.models.user import User, UserRole
from infrastructure.db.uow import IUnitOfWork

logger = logging.getLogger("shopbot_backend.routers.bot")

router = APIRouter(prefix="/bot", tags=["Messenger Bots (Telegram & Bale)"])

FRONTEND_BASE_URL: str = getattr(settings, "FRONTEND_URL", "http://localhost:3000")

# ---------------------------------------------------------------------------
# In-Memory Finite State Machine (FSM) Storage
# ---------------------------------------------------------------------------
class BotState:
    IDLE = "IDLE"
    CONTRACT_WAITING_BUILDING_NAME = "CONTRACT_WAITING_BUILDING_NAME"
    CONTRACT_WAITING_ADDRESS = "CONTRACT_WAITING_ADDRESS"
    CONTRACT_WAITING_NATIONAL_ID = "CONTRACT_WAITING_NATIONAL_ID"
    CONTRACT_WAITING_TYPE = "CONTRACT_WAITING_TYPE"
    CONTRACT_WAITING_STOPS = "CONTRACT_WAITING_STOPS"
    TICKET_WAITING_SUBJECT = "TICKET_WAITING_SUBJECT"
    TICKET_WAITING_MESSAGE = "TICKET_WAITING_MESSAGE"
    ADMIN_WAITING_TARGET_USER = "ADMIN_WAITING_TARGET_USER"
    ADMIN_WAITING_DIRECT_MESSAGE = "ADMIN_WAITING_DIRECT_MESSAGE"


user_states: Dict[str, str] = {}
user_drafts: Dict[str, Dict[str, Any]] = {}


def get_user_state(user_key: str) -> str:
    return user_states.get(user_key, BotState.IDLE)


def set_user_state(user_key: str, state: str) -> None:
    user_states[user_key] = state


def clear_user_state(user_key: str) -> None:
    user_states.pop(user_key, None)
    user_drafts.pop(user_key, None)


# ---------------------------------------------------------------------------
# Keyboard Generators & Menus
# ---------------------------------------------------------------------------
def make_reply_keyboard(rows: List[List[str]], resize: bool = True) -> Dict[str, Any]:
    return {
        "keyboard": [[{"text": col} for col in row] for row in rows],
        "resize_keyboard": resize,
    }


def make_inline_keyboard(rows: List[List[Tuple[str, str]]]) -> Dict[str, Any]:
    return {
        "inline_keyboard": [
            [{"text": label, "url": url} for label, url in row] for row in rows
        ]
    }


# Customer Keyboards
MAIN_CUSTOMER_MENU = make_reply_keyboard(
    [
        ["🛒 خدمات فروشگاه و خرید"],
        ["🏢 خدمات آسانسور و قراردادها"],
        ["💬 پشتیبانی و حساب کاربری"],
    ]
)

SUB_CUSTOMER_SHOP = make_reply_keyboard(
    [
        ["🛍️ کاتالوگ (سایت)", "📦 پیگیری سفارشات من"],
        ["🔙 بازگشت"],
    ]
)

SUB_CUSTOMER_CONTRACT = make_reply_keyboard(
    [
        ["📝 درخواست قرارداد سرویس", "📋 وضعیت قراردادهای من"],
        ["🛠️ ثبت خرابی فوری (اپلیکیشن)"],
        ["🔙 بازگشت"],
    ]
)

SUB_CUSTOMER_SUPPORT = make_reply_keyboard(
    [
        ["🎫 ثبت تیکت جدید", "📬 پیگیری تیکتها"],
        ["💰 موجودی کیف پول", "⚙️ تنظیمات پروفایل"],
        ["🔙 بازگشت"],
    ]
)

# Admin Keyboards
MAIN_ADMIN_MENU = make_reply_keyboard(
    [
        ["📊 داشبورد و سفارشات"],
        ["🏢 قراردادها و پشتیبانی"],
        ["✉️ ارسال پیام به کاربر", "⚙️ مدیریت سامانه (سایت)"],
    ]
)

SUB_ADMIN_ORDERS = make_reply_keyboard(
    [
        ["📈 آمار کلیدی امروز", "📦 آخرین سفارشات"],
        ["🔙 بازگشت"],
    ]
)

SUB_ADMIN_TICKETS = make_reply_keyboard(
    [
        ["📝 قراردادهای جدید", "🎫 تیکتهای باز"],
        ["🔙 بازگشت"],
    ]
)

# FSM Helper Keyboards
CONTRACT_TYPE_KEYBOARD = make_reply_keyboard(
    [
        ["کششی گیربکس", "کششی گرلس (MRL)"],
        ["هیدرولیک مسکونی", "🔙 بازگشت"],
    ]
)

CANCEL_KEYBOARD = make_reply_keyboard([["🔙 بازگشت"]])

# ---------------------------------------------------------------------------
# Persian Translations
# ---------------------------------------------------------------------------
ORDER_STATUS_FA = {
    OrderStatus.PENDING: "ثبت اولیه",
    OrderStatus.PENDING_QUOTATION: "در انتظار پیش‌فاکتور",
    OrderStatus.PAYMENT_VERIFICATION: "بررسی فیش واریزی",
    OrderStatus.PAID: "پرداخت شده",
    OrderStatus.SHIPPED: "تحویل به پست/تیپاکس",
    OrderStatus.READY_FOR_PICKUP: "آماده تحویل حضوری در کرمان",
    OrderStatus.CANCELED: "لغو شده",
}

CONTRACT_STATUS_FA = {
    ContractStatus.PENDING: "در انتظار کارشناسی و قیمت‌گذاری",
    ContractStatus.QUOTED: "پیش‌فاکتور صادر شده",
    ContractStatus.ACTIVE: "فعال",
    ContractStatus.REJECTED: "رد شده",
    ContractStatus.EXPIRED: "پایان قرارداد",
}

TICKET_STATUS_FA = {
    TicketStatus.OPEN: "در انتظار پاسخ کارشناس",
    TicketStatus.IN_PROGRESS: "در حال بررسی فنی",
    TicketStatus.REPLIED: "پاسخ داده شده",
    TicketStatus.CLOSED: "بسته شده",
}

TICKET_PRIORITY_FA = {
    TicketPriority.LOW: "عادی",
    TicketPriority.MEDIUM: "متوسط",
    TicketPriority.HIGH: "مهم",
    TicketPriority.CRITICAL: "بحرانی / فوری",
}

ADMIN_COMMANDS = {
    "📊 داشبورد و سفارشات",
    "📈 آمار کلیدی امروز",
    "📦 آخرین سفارشات",
    "🏢 قراردادها و پشتیبانی",
    "📝 قراردادهای جدید",
    "🎫 تیکتهای باز",
    "🎫 تیکت‌های باز",
    "⚙️ مدیریت سامانه (سایت)",
    "✉️ ارسال پیام به کاربر",
}


def sanitize_phone_number(raw_phone: str) -> str:
    """
    Standardizes Iranian mobile phone numbers to 11-digit '09XXXXXXXXX' format.
    Handles +98, 0098, 98, and 10-digit 9... variations.
    """
    cleaned = re.sub(r"[^\d]", "", raw_phone)
    if cleaned.startswith("0098"):
        cleaned = "0" + cleaned[4:]
    elif cleaned.startswith("98"):
        cleaned = "0" + cleaned[2:]
    elif not cleaned.startswith("0") and len(cleaned) == 10 and cleaned.startswith("9"):
        cleaned = "0" + cleaned
    return cleaned


def to_english_digits(text: str) -> str:
    """
    Converts Persian and Arabic numeric characters to ASCII digits.
    """
    persian_digits = "۰۱۲۳۴۵۶۷۸۹"
    arabic_digits = "٠١٢٣٤٥٦٧٨٩"
    for i in range(10):
        text = text.replace(persian_digits[i], str(i)).replace(arabic_digits[i], str(i))
    return text


async def send_bot_message(
    platform: str,
    chat_id: Any,
    text: str,
    reply_markup: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Dispatches outbound message to Telegram or Bale Bot API.
    If bot token is not configured in environment, gracefully skips network call.
    """
    token = (
        settings.TELEGRAM_BOT_TOKEN
        if platform == "telegram"
        else settings.BALE_BOT_TOKEN
    )
    if not token:
        logger.info(
            f"[{platform.upper()}] No bot token configured, skipping real HTTP dispatch to chat_id={chat_id}"
        )
        return True

    base_url = (
        "https://api.telegram.org"
        if platform == "telegram"
        else "https://tapi.bale.ai"
    )
    endpoint = f"{base_url}/bot{token}/sendMessage"

    body: Dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
    }
    if reply_markup:
        body["reply_markup"] = reply_markup

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(endpoint, json=body)
            if not resp.is_success:
                logger.warning(
                    f"[{platform.upper()}] Outbound message returned status {resp.status_code}: {resp.text}"
                )
            return resp.is_success
    except Exception as exc:
        logger.warning(f"[{platform.upper()}] Network error sending message: {exc}")
        return False


async def process_bot_update(
    update: Dict[str, Any],
    platform: str,
    uow: IUnitOfWork,
) -> None:
    """
    Core bot router handling Authentication, RBAC, Nested Menus, and FSM Wizards.
    """
    message = update.get("message") or update.get("edited_message")
    if not message:
        logger.info(f"[{platform}] Update contains no message, skipping.")
        return

    chat = message.get("chat", {})
    chat_id = chat.get("id")
    from_user = message.get("from", {})
    user_platform_id = str(from_user.get("id") or chat_id or "")

    if not chat_id or not user_platform_id:
        logger.warning(f"[{platform}] Missing chat_id or user_id in update.")
        return

    user_key = f"{platform}_{chat_id}"
    text = (message.get("text") or "").strip()
    contact = message.get("contact")

    # -----------------------------------------------------------------------
    # 1. Contact Shared: Registration & Account Linking
    # -----------------------------------------------------------------------
    if contact and isinstance(contact, dict):
        raw_phone = str(contact.get("phone_number") or "").strip()
        sanitized_phone = sanitize_phone_number(raw_phone)

        if not sanitized_phone:
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text="شماره تماس دریافت شده نامعتبر است. لطفاً مجدداً تلاش فرمایید.",
            )
            return

        stmt = select(User).where(User.phone == sanitized_phone)
        res = await uow.session.execute(stmt)
        user = res.scalar_one_or_none()

        if user:
            if platform == "telegram":
                user.telegram_id = user_platform_id
            elif platform == "bale":
                user.bale_id = user_platform_id
            logger.info(
                f"[{platform}] Linked {platform}_id {user_platform_id} to existing user {user.id}"
            )
        else:
            first_name = contact.get("first_name") or from_user.get("first_name") or ""
            last_name = contact.get("last_name") or from_user.get("last_name") or ""
            full_name = f"{first_name} {last_name}".strip() or "کاربر پیام‌رسان"

            role = (
                UserRole.ADMIN
                if sanitized_phone == "09133982695"
                else UserRole.CUSTOMER
            )
            user = User(
                messenger_id=f"{platform}_{user_platform_id}",
                phone=sanitized_phone,
                name=full_name,
                role=role,
                is_active=True,
                telegram_id=user_platform_id if platform == "telegram" else None,
                bale_id=user_platform_id if platform == "bale" else None,
            )
            uow.session.add(user)
            logger.info(
                f"[{platform}] Auto-registered new user {user.phone} ({user.name})"
            )

        await uow.commit()
        clear_user_state(user_key)

        is_admin = (user.role == UserRole.ADMIN or user.phone == "09133982695")
        if is_admin:
            welcome_text = (
                "✅ **حساب مدیریت با موفقیت متصل شد.**\n\n"
                "سلام مهندس محبی عزیز، به پنل راهبری و مدیریت آسانرو اطمینان امیر کرمان خوش آمدید."
            )
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text=welcome_text,
                reply_markup=MAIN_ADMIN_MENU,
            )
        else:
            welcome_text = (
                "✅ **حساب کاربری شما متصل شد!**\n\n"
                f"سلام {user.name or 'کاربر گرامی'}، به سامانه خدمات و پشتیبانی آسانرو اطمینان امیر کرمان خوش آمدید.\n"
                "لطفاً از منوی زیر خدمت مورد نظر خود را انتخاب نمایید:"
            )
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text=welcome_text,
                reply_markup=MAIN_CUSTOMER_MENU,
            )
        return

    # -----------------------------------------------------------------------
    # 2. Lookup Existing Linked User
    # -----------------------------------------------------------------------
    user_stmt = select(User).where(
        (User.telegram_id == user_platform_id)
        if platform == "telegram"
        else (User.bale_id == user_platform_id)
    )
    user_res = await uow.session.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    # If user is not linked in DB yet
    if not user:
        welcome_text = (
            "به پشتیبانی و خدمات آسانرو اطمینان امیر کرمان خوش آمدید. "
            "برای ورود یا ثبت‌نام، لطفاً شماره تماس خود را از طریق دکمه زیر ارسال کنید."
        )
        reply_markup = {
            "keyboard": [
                [
                    {
                        "text": "ارسال شماره تماس 📱",
                        "request_contact": True,
                    }
                ]
            ],
            "resize_keyboard": True,
            "one_time_keyboard": True,
        }
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=welcome_text,
            reply_markup=reply_markup,
        )
        return

    is_admin = (user.role == UserRole.ADMIN or user.phone == "09133982695")
    current_main_menu = MAIN_ADMIN_MENU if is_admin else MAIN_CUSTOMER_MENU

    # -----------------------------------------------------------------------
    # 3. Global Navigation: /start, /menu, 🔙 بازگشت
    # -----------------------------------------------------------------------
    if text in ["/start", "/menu", "منو"]:
        clear_user_state(user_key)
        if is_admin:
            msg = (
                "سلام مهندس محبی عزیز، به پنل راهبری آسانرو اطمینان امیر کرمان خوش آمدید.\n"
                "لطفاً بخش مورد نظر را از منوی زیر انتخاب نمایید:"
            )
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text=msg,
                reply_markup=MAIN_ADMIN_MENU,
            )
        else:
            msg = (
                f"سلام {user.name or 'کاربر گرامی'}، به ربات آسانرو اطمینان امیر کرمان خوش آمدید.\n"
                "لطفاً خدمت مورد نظر را از منوی زیر انتخاب نمایید:"
            )
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text=msg,
                reply_markup=MAIN_CUSTOMER_MENU,
            )
        return

    if text in ["🔙 بازگشت", "بازگشت", "🔙 انصراف", "انصراف", "/cancel"]:
        clear_user_state(user_key)
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text="عملیات لغو شد. به منوی اصلی بازگشتید:",
            reply_markup=current_main_menu,
        )
        return

    # -----------------------------------------------------------------------
    # 4. In-Memory FSM Wizard Dispatcher
    # -----------------------------------------------------------------------
    current_state = get_user_state(user_key)

    # --- Service Contract Wizard Flow ---
    if current_state == BotState.CONTRACT_WAITING_BUILDING_NAME:
        if len(text.strip()) < 2:
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text="⚠️ نام ساختمان بسیار کوتاه است. لطفاً نام کامل مجتمع یا پروژه را وارد فرمایید:\n(مثال: مجتمع مسکونی آفتاب، برج پزشکان پارس)",
                reply_markup=CANCEL_KEYBOARD,
            )
            return

        user_drafts.setdefault(user_key, {})["building_name"] = text.strip()
        set_user_state(user_key, BotState.CONTRACT_WAITING_ADDRESS)
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text="📍 **مرحله ۲ از ۵: نشانی دقیق پروژه**\nلطفاً **آدرس دقیق ساختمان، شهر، خیابان و پلاک** را وارد فرمایید:\n(مثال: کرمان، خیابان شهید بهشتی، کوچه ۱۲، پلاک ۲۴)",
            reply_markup=CANCEL_KEYBOARD,
        )
        return

    elif current_state == BotState.CONTRACT_WAITING_ADDRESS:
        if len(text.strip()) < 5:
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text="⚠️ آدرس وارد شده بسیار کوتاه است. لطفاً آدرس کامل پروژه را به همراه نام ساختمان بنویسید:\n(مثال: کرمان، خیابان شهید بهشتی، کوچه ۱۲، پلاک ۲۴)",
                reply_markup=CANCEL_KEYBOARD,
            )
            return

        user_drafts.setdefault(user_key, {})["building_address"] = text.strip()
        set_user_state(user_key, BotState.CONTRACT_WAITING_NATIONAL_ID)
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=(
                "🆔 **مرحله ۳ از ۵: کد ملی / شناسه ملی کارفرما**\n"
                "جهت ثبت رسمی در سیستم و صدور قرارداد قانونی، لطفاً **کد ملی (یا شناسه ملی حقوقی)** کارفرما را ارسال نمایید:\n"
                "(در صورتی که هم‌اکنون به آن دسترسی ندارید، کلمه **ندارم** را ارسال فرمایید تا توسط کارشناس در پنل مدیریت تکمیل گردد)"
            ),
            reply_markup=CANCEL_KEYBOARD,
        )
        return

    elif current_state == BotState.CONTRACT_WAITING_NATIONAL_ID:
        clean_nid = to_english_digits(text.strip())
        if clean_nid in ["ندارم", "بعدا", "ندارم.", "none", "-", "خیر"]:
            employer_nid = None
        else:
            employer_nid = re.sub(r"[^\d]", "", clean_nid) or clean_nid

        user_drafts.setdefault(user_key, {})["employer_national_id"] = employer_nid
        set_user_state(user_key, BotState.CONTRACT_WAITING_TYPE)
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text="⚙️ **مرحله ۴ از ۵:** لطفاً **نوع سیستم آسانسور** را از گزینه‌های زیر انتخاب کرده یا تایپ نمایید:",
            reply_markup=CONTRACT_TYPE_KEYBOARD,
        )
        return

    elif current_state == BotState.CONTRACT_WAITING_TYPE:
        if len(text) < 2:
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text="⚠️ لطفاً نوع آسانسور را از کیبورد انتخاب نمایید.",
                reply_markup=CONTRACT_TYPE_KEYBOARD,
            )
            return

        user_drafts.setdefault(user_key, {})["elevator_type"] = text.strip()
        set_user_state(user_key, BotState.CONTRACT_WAITING_STOPS)
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text="🔢 **مرحله ۵ از ۵:** لطفاً **تعداد توقف (تعداد طبقات و ایستگاه‌ها)** آسانسور را به عدد وارد فرمایید:\n(مثال: 5)",
            reply_markup=CANCEL_KEYBOARD,
        )
        return

    elif current_state == BotState.CONTRACT_WAITING_STOPS:
        cleaned_num = re.sub(r"[^\d]", "", to_english_digits(text))
        if not cleaned_num or not (1 <= int(cleaned_num) <= 100):
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text="⚠️ لطفاً تعداد توقف را به صورت یک عدد معتبر بین ۱ تا ۱۰۰ وارد کنید:\n(مثال: 5)",
                reply_markup=CANCEL_KEYBOARD,
            )
            return

        stops = int(cleaned_num)
        draft = user_drafts.get(user_key, {})
        building_name = draft.get("building_name")
        address = draft.get("building_address", "ثبت نشده")
        employer_nid = draft.get("employer_national_id")
        elevator_type = draft.get("elevator_type", "کششی گیربکس")

        # Atomic Transaction: Insert Contract + Notifications
        contract = ServiceContract(
            user_id=user.id,
            building_name=building_name,
            building_address=address,
            employer_national_id=employer_nid,
            elevator_type=elevator_type,
            stops_count=stops,
            capacity_kg=600,
            speed_ms="1.0 m/s",
            usage_type="مسافری",
            payment_frequency="FLEXIBLE",
            status=ContractStatus.PENDING,
            annual_price=None,  # Strictly Enforce "No Pricing by Customer"
        )
        uow.session.add(contract)
        await uow.session.flush()

        # Notify All Admins
        admins_stmt = select(User).where(User.role == UserRole.ADMIN)
        admins_res = await uow.session.execute(admins_stmt)
        admins = admins_res.scalars().all()
        user_label = user.name or user.phone or "مشتری ربات"
        for admin in admins:
            uow.session.add(
                Notification(
                    user_id=admin.id,
                    title="درخواست قرارداد سرویس جدید (ربات)",
                    message=f"درخواست قرارداد سرویس توسط {user_label} برای پروژه «{address[:35]}» ثبت شد.",
                )
            )

        # Notify Customer
        uow.session.add(
            Notification(
                user_id=user.id,
                title="ثبت موفق درخواست قرارداد سرویس",
                message=f"درخواست سرویس و نگهداری آسانسور پروژه «{address[:35]}» در سیستم ثبت شد و در حال کارشناسی است.",
            )
        )

        await uow.commit()
        clear_user_state(user_key)

        # Proactive Notification Hook: Alert all Admins
        await BotNotificationService.notify_admins(
            f"🔔 **آلارم جدید:** یک درخواست قرارداد سرویس از سوی {user_label} برای پروژه «{address[:35]}» ثبت شد.",
            uow.session,
        )

        b_name_line = f"🏢 نام مجتمع: {building_name}\n" if building_name else ""
        nid_line = f"🆔 کد ملی کارفرما: {employer_nid}\n" if employer_nid else ""
        success_msg = (
            "✅ **درخواست قرارداد سرویس با موفقیت ثبت شد.**\n\n"
            f"{b_name_line}"
            f"📍 نشانی پروژه: {address}\n"
            f"{nid_line}"
            f"⚙️ نوع آسانسور: {elevator_type}\n"
            f"🔢 تعداد توقف: {stops} توقف\n"
            f"👥 کاربری: مسافری | ظرفیت: ۶۰۰ کیلوگرم\n\n"
            "📋 وضعیت: **در انتظار کارشناسی و برآورد قیمت**\n"
            "مهندسین شرکت آسانرو اطمینان امیر کرمان در اسرع وقت مشخصات را ارزیابی و پیش‌فاکتور سالیانه را ثبت خواهند کرد."
        )
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=success_msg,
            reply_markup=MAIN_CUSTOMER_MENU,
        )
        return

    # --- Support Ticket Wizard Flow ---
    elif current_state == BotState.TICKET_WAITING_SUBJECT:
        if len(text) < 3:
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text="⚠️ عنوان تیکت بسیار کوتاه است. لطفاً موضوع تیکت را با جزئیات بنویسید:\n(مثال: استعلام قطعات تابلو فرمان)",
                reply_markup=CANCEL_KEYBOARD,
            )
            return

        user_drafts.setdefault(user_key, {})["ticket_subject"] = text
        set_user_state(user_key, BotState.TICKET_WAITING_MESSAGE)
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text="✍️ **مرحله ۲ از ۲:** لطفاً **متن کامل پیام و شرح درخواست** خود را بنویسید:",
            reply_markup=CANCEL_KEYBOARD,
        )
        return

    elif current_state == BotState.TICKET_WAITING_MESSAGE:
        if len(text) < 3:
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text="⚠️ متن پیام نمی‌تواند خالی باشد. لطفاً شرح پیام خود را ارسال فرمایید:",
                reply_markup=CANCEL_KEYBOARD,
            )
            return

        subject = user_drafts.get(user_key, {}).get("ticket_subject", "تیکت پشتیبانی")

        # Atomic Transaction: Insert Ticket + First Message + Admin Notifications
        ticket = Ticket(
            user_id=user.id,
            subject=subject,
            status=TicketStatus.OPEN,
            priority=TicketPriority.MEDIUM,
        )
        uow.session.add(ticket)
        await uow.session.flush()

        ticket_msg = TicketMessage(
            ticket_id=ticket.id,
            sender_id=user.id,
            content=text,
            is_from_admin=False,
        )
        uow.session.add(ticket_msg)

        admins_stmt = select(User).where(User.role == UserRole.ADMIN)
        admins_res = await uow.session.execute(admins_stmt)
        admins = admins_res.scalars().all()
        user_label = user.name or user.phone or "مشتری ربات"
        for admin in admins:
            uow.session.add(
                Notification(
                    user_id=admin.id,
                    title="تیکت پشتیبانی جدید (ربات)",
                    message=f"تیکت جدید با عنوان «{subject[:30]}» توسط {user_label} ثبت شد.",
                )
            )

        await uow.commit()
        clear_user_state(user_key)

        # Proactive Notification Hook: Alert all Admins
        await BotNotificationService.notify_admins(
            f"🎫 **آلارم جدید:** یک تیکت جدید از سوی {user_label} با موضوع «{subject[:35]}» ثبت شد.",
            uow.session,
        )

        success_msg = (
            "✅ **تیکت پشتیبانی شما با موفقیت ثبت شد.**\n\n"
            f"📌 موضوع: {subject}\n"
            "کارشناسان پشتیبانی آسانرو در اسرع وقت پیام شما را بررسی و پاسخ خواهند داد."
        )
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=success_msg,
            reply_markup=MAIN_CUSTOMER_MENU,
        )
        return

    # --- Admin Direct Message Flow ---
    elif current_state == BotState.ADMIN_WAITING_TARGET_USER:
        if not is_admin:
            clear_user_state(user_key)
            return

        clean_input = text.strip()
        sanitized = sanitize_phone_number(clean_input)
        target_user = None

        if sanitized:
            target_res = await uow.session.execute(
                select(User).where(User.phone == sanitized)
            )
            target_user = target_res.scalars().first()

        if not target_user:
            target_res = await uow.session.execute(
                select(User).where(
                    (User.telegram_id == clean_input) | (User.bale_id == clean_input)
                )
            )
            target_user = target_res.scalars().first()

        if not target_user:
            try:
                u_uuid = uuid.UUID(clean_input)
                target_res = await uow.session.execute(
                    select(User).where(User.id == u_uuid)
                )
                target_user = target_res.scalar_one_or_none()
            except Exception:
                pass

        if not target_user:
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text="❌ کاربری با این مشخصات یافت نشد. لطفاً شماره همراه (مثال: 09121112233) یا شناسه معتبر ارسال فرمایید:",
                reply_markup=CANCEL_KEYBOARD,
            )
            return

        if not target_user.telegram_id and not target_user.bale_id:
            clear_user_state(user_key)
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text=(
                    f"⚠️ کاربر «{target_user.name or target_user.phone}» در سیستم وجود دارد "
                    "اما هنوز به ربات تلگرام یا بله متصل نشده است و پیام‌رسانی برای ایشان مقدور نیست."
                ),
                reply_markup=MAIN_ADMIN_MENU,
            )
            return

        user_drafts.setdefault(user_key, {})["target_user_id"] = str(target_user.id)
        set_user_state(user_key, BotState.ADMIN_WAITING_DIRECT_MESSAGE)

        channels = []
        if target_user.telegram_id:
            channels.append("تلگرام ✅")
        if target_user.bale_id:
            channels.append("بله ✅")
        channels_str = " | ".join(channels)

        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=(
                f"👤 کاربر مقصد: **{target_user.name or 'کاربر آسانرو'}** ({target_user.phone})\n"
                f"کانال‌های فعال: {channels_str}\n\n"
                "✍️ لطفاً **متن پیامی** که می‌خواهید برای ایشان ارسال شود را بنویسید:"
            ),
            reply_markup=CANCEL_KEYBOARD,
        )
        return

    elif current_state == BotState.ADMIN_WAITING_DIRECT_MESSAGE:
        if not is_admin:
            clear_user_state(user_key)
            return

        if len(text) < 2:
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text="⚠️ متن پیام نمی‌تواند خالی باشد. لطفاً متن پیام را ارسال فرمایید:",
                reply_markup=CANCEL_KEYBOARD,
            )
            return

        target_user_id_str = user_drafts.get(user_key, {}).get("target_user_id")
        if not target_user_id_str:
            clear_user_state(user_key)
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text="خطا در بازیابی کاربر مقصد. لطفاً مجدداً تلاش فرمایید.",
                reply_markup=MAIN_ADMIN_MENU,
            )
            return

        target_res = await uow.session.execute(
            select(User).where(User.id == uuid.UUID(target_user_id_str))
        )
        target_user = target_res.scalar_one_or_none()
        if not target_user:
            clear_user_state(user_key)
            await send_bot_message(
                platform=platform,
                chat_id=chat_id,
                text="کاربر مقصد یافت نشد.",
                reply_markup=MAIN_ADMIN_MENU,
            )
            return

        outbound_text = (
            "📩 **پیام دریافتی از سوی مدیریت آسانرو اطمینان امیر کرمان:**\n\n"
            f"{text}\n\n"
            "📞 در صورت هرگونه سوال با پشتیبانی شرکت در ارتباط باشید."
        )

        sent = await BotNotificationService.send_to_user(target_user, outbound_text)

        # Audit notification in DB
        uow.session.add(
            Notification(
                user_id=target_user.id,
                title="پیام مستقیم از مدیریت آسانرو",
                message=text,
            )
        )
        await uow.commit()
        clear_user_state(user_key)

        if sent:
            res_msg = f"✅ پیام با موفقیت برای کاربر «{target_user.name or target_user.phone}» در پیام‌رسان ارسال و در سامانه ثبت گردید."
        else:
            res_msg = f"⚠️ پیام در سامانه ثبت شد، اما ارسال به پیام‌رسان کاربر با خطا مواجه گردید (ممکن است کاربر ربات را بلاک کرده باشد)."

        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=res_msg,
            reply_markup=MAIN_ADMIN_MENU,
        )
        return

    # -----------------------------------------------------------------------
    # 5. Strict Role-Based Access Control (RBAC) Guard
    # -----------------------------------------------------------------------
    if text in ADMIN_COMMANDS and not is_admin:
        denial_text = (
            "⛔ **دسترسی غیرمجاز:**\n"
            "این بخش مختص مدیریت و کارشناسان فنی آسانرو اطمینان امیر کرمان است."
        )
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=denial_text,
            reply_markup=MAIN_CUSTOMER_MENU,
        )
        return

    # -----------------------------------------------------------------------
    # 6. Admin Workflows & Submenus
    # -----------------------------------------------------------------------
    if is_admin and text == "📊 داشبورد و سفارشات":
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text="📊 **بخش آمار و سفارشات مدیریت:**\nلطفاً گزینه مورد نظر را انتخاب فرمایید:",
            reply_markup=SUB_ADMIN_ORDERS,
        )
        return

    if is_admin and text == "🏢 قراردادها و پشتیبانی":
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text="🏢 **مدیریت قراردادها و تیکت‌های پشتیبانی:**\nلطفاً گزینه مورد نظر را انتخاب فرمایید:",
            reply_markup=SUB_ADMIN_TICKETS,
        )
        return

    if is_admin and text == "📈 آمار کلیدی امروز":
        total_orders = (
            await uow.session.execute(select(func.count(Order.id)))
        ).scalar_one()
        pending_orders = (
            await uow.session.execute(
                select(func.count(Order.id)).where(
                    Order.status.in_(
                        [
                            OrderStatus.PENDING,
                            OrderStatus.PENDING_QUOTATION,
                            OrderStatus.PAYMENT_VERIFICATION,
                        ]
                    )
                )
            )
        ).scalar_one()
        open_tickets = (
            await uow.session.execute(
                select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.OPEN)
            )
        ).scalar_one()
        pending_contracts = (
            await uow.session.execute(
                select(func.count(ServiceContract.id)).where(
                    ServiceContract.status == ContractStatus.PENDING
                )
            )
        ).scalar_one()
        total_users = (
            await uow.session.execute(select(func.count(User.id)))
        ).scalar_one()

        stats_msg = (
            "📈 **آمار و شاخص‌های کلیدی سامانه آسانرو:**\n\n"
            f"👥 کل کاربران ثبت‌شده: **{total_users} نفر**\n"
            f"📦 کل سفارشات ثبت‌شده: **{total_orders} سفارش** (⏳ {pending_orders} نیازمند بررسی)\n"
            f"🏢 قراردادهای سرویس در انتظار قیمت‌گذاری: **{pending_contracts} قرارداد**\n"
            f"🎫 تیکت‌های پشتیبانی باز و بدون پاسخ: **{open_tickets} تیکت**\n\n"
            "اطلاعات به‌صورت زنده و بلادرنگ از پایگاه داده استخراج گردیده است."
        )
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=stats_msg,
            reply_markup=SUB_ADMIN_ORDERS,
        )
        return

    if is_admin and text == "📦 آخرین سفارشات":
        orders_stmt = (
            select(Order)
            .options(joinedload(Order.user))
            .order_by(Order.created_at.desc())
            .limit(5)
        )
        orders_res = await uow.session.execute(orders_stmt)
        orders = orders_res.scalars().all()

        if not orders:
            orders_msg = "📦 هیچ سفارشی تاکنون در سامانه ثبت نشده است."
        else:
            lines = ["📦 **آخرین سفارشات ثبت‌شده در سیستم:**\n"]
            for o in orders:
                cust_label = (
                    o.user.name or o.user.phone if o.user else "کاربر نامشخص"
                )
                status_fa = ORDER_STATUS_FA.get(o.status, str(o.status.value))
                toman = o.total_price // 10
                tracking = f" | کد رهگیری: {o.tracking_code}" if o.tracking_code else ""
                lines.append(
                    f"• سفارش #{str(o.id)[:8]} | {cust_label}\n"
                    f"  مبلغ: {toman:,} تومان | وضعیت: {status_fa}{tracking}\n"
                )
            orders_msg = "\n".join(lines)

        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=orders_msg,
            reply_markup=SUB_ADMIN_ORDERS,
        )
        return

    if is_admin and text == "📝 قراردادهای جدید":
        contracts_stmt = (
            select(ServiceContract)
            .options(joinedload(ServiceContract.user))
            .where(ServiceContract.status == ContractStatus.PENDING)
            .order_by(ServiceContract.created_at.desc())
            .limit(5)
        )
        contracts_res = await uow.session.execute(contracts_stmt)
        pending_list = contracts_res.scalars().all()

        if not pending_list:
            c_msg = "✅ در حال حاضر هیچ قرارداد جدیدی در انتظار کارشناسی وجود ندارد."
        else:
            lines = ["📝 **قراردادهای سرویس در انتظار بررسی و قیمت‌گذاری:**\n"]
            for c in pending_list:
                c_name = c.user.name or c.user.phone if c.user else "مشتری"
                c_phone = c.user.phone if c.user else "-"
                lines.append(
                    f"• پروژه: {c.building_address[:35]}\n"
                    f"  مشتری: {c_name} ({c_phone})\n"
                    f"  مشخصات: {c.elevator_type} | {c.stops_count} توقف | {c.capacity_kg} کیلوگرم\n"
                )
            c_msg = "\n".join(lines)

        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=c_msg,
            reply_markup=SUB_ADMIN_TICKETS,
        )
        return

    if is_admin and text in ["🎫 تیکتهای باز", "🎫 تیکت‌های باز"]:
        tickets_stmt = (
            select(Ticket)
            .options(joinedload(Ticket.user))
            .where(Ticket.status == TicketStatus.OPEN)
            .order_by(Ticket.created_at.desc())
            .limit(5)
        )
        tickets_res = await uow.session.execute(tickets_stmt)
        open_list = tickets_res.scalars().all()

        if not open_list:
            t_msg = "✅ هیچ تیکت باز یا بدون پاسخی در سیستم وجود ندارد."
        else:
            lines = ["🎫 **تیکت‌های باز در انتظار پاسخ کارشناس:**\n"]
            for t in open_list:
                t_user = t.user.name or t.user.phone if t.user else "کاربر"
                p_fa = TICKET_PRIORITY_FA.get(t.priority, str(t.priority.value))
                lines.append(f"• موضوع: {t.subject}\n  کاربر: {t_user} | اولویت: {p_fa}\n")
            t_msg = "\n".join(lines)

        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=t_msg,
            reply_markup=SUB_ADMIN_TICKETS,
        )
        return

    if is_admin and text == "⚙️ مدیریت سامانه (سایت)":
        admin_link_kb = make_inline_keyboard(
            [[("ورود به پنل مدیریت سایت 🖥️", f"{FRONTEND_BASE_URL}/admin")]]
        )
        admin_msg = (
            "⚙️ **سامانه راهبری آسانرو اطمینان امیر کرمان:**\n\n"
            "برای دسترسی به پیشخوان جامع ERP، مدیریت سفارشات، صدور پیش‌فاکتور قراردادها، تایید فیش‌ها و ویرایش کاتالوگ قطعات وارد شوید."
        )
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=admin_msg,
            reply_markup=admin_link_kb,
        )
        return

    if is_admin and text == "✉️ ارسال پیام به کاربر":
        set_user_state(user_key, BotState.ADMIN_WAITING_TARGET_USER)
        user_drafts[user_key] = {}
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=(
                "✉️ **ارسال پیام مستقیم به کاربر**\n\n"
                "لطفاً **شماره تماس** مشتری (مثال: 09121112233) یا **شناسه کاربری** را ارسال فرمایید:"
            ),
            reply_markup=CANCEL_KEYBOARD,
        )
        return

    # -----------------------------------------------------------------------
    # 7. Customer Workflows & Submenus
    # -----------------------------------------------------------------------
    if text == "🛒 خدمات فروشگاه و خرید":
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text="🛒 **بخش فروشگاه و خرید قطعات:**\nلطفاً گزینه مورد نظر را انتخاب فرمایید:",
            reply_markup=SUB_CUSTOMER_SHOP,
        )
        return

    if text == "🏢 خدمات آسانسور و قراردادها":
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text="🏢 **خدمات آسانسور و قراردادهای سرویس و نگهداری:**\nلطفاً گزینه مورد نظر را انتخاب فرمایید:",
            reply_markup=SUB_CUSTOMER_CONTRACT,
        )
        return

    if text == "💬 پشتیبانی و حساب کاربری":
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text="💬 **بخش پشتیبانی و حساب کاربری:**\nلطفاً گزینه مورد نظر را انتخاب فرمایید:",
            reply_markup=SUB_CUSTOMER_SUPPORT,
        )
        return

    if text == "🛍️ کاتالوگ (سایت)":
        shop_kb = make_inline_keyboard(
            [[("ورود به کاتالوگ فروشگاه 🌐", f"{FRONTEND_BASE_URL}/products")]]
        )
        shop_msg = (
            "🛍️ **کاتالوگ جامع قطعات و پکیج‌های آسانسور آسانرو:**\n\n"
            "برای مشاهده مشخصات فنی موتورها، تابلوهای فرمان، درب‌های اتوماتیک و پکیج‌های ۶ تا ۱۰ نفره به فروشگاه ما مراجعه فرمایید."
        )
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=shop_msg,
            reply_markup=shop_kb,
        )
        return

    if text == "📦 پیگیری سفارشات من":
        my_orders_stmt = (
            select(Order)
            .where(Order.user_id == user.id)
            .order_by(Order.created_at.desc())
            .limit(5)
        )
        my_orders_res = await uow.session.execute(my_orders_stmt)
        my_orders = my_orders_res.scalars().all()

        if not my_orders:
            orders_reply = "📦 شما تاکنون هیچ سفارشی در سامانه ثبت نکرده‌اید."
        else:
            lines = ["📦 **سفارشات اخیر شما در آسانرو:**\n"]
            for o in my_orders:
                status_fa = ORDER_STATUS_FA.get(o.status, str(o.status.value))
                toman = o.total_price // 10
                tracking = f" | کد رهگیری: {o.tracking_code}" if o.tracking_code else ""
                lines.append(
                    f"• سفارش #{str(o.id)[:8]}\n"
                    f"  مبلغ: {toman:,} تومان | وضعیت: {status_fa}{tracking}\n"
                )
            orders_reply = "\n".join(lines)

        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=orders_reply,
            reply_markup=SUB_CUSTOMER_SHOP,
        )
        return

    if text == "📝 درخواست قرارداد سرویس":
        set_user_state(user_key, BotState.CONTRACT_WAITING_BUILDING_NAME)
        user_drafts[user_key] = {}
        wizard_intro = (
            "📝 **درخواست قرارداد سرویس و نگهداری آسانسور**\n\n"
            "🏢 **مرحله ۱ از ۵: نام ساختمان / مجتمع**\n"
            "لطفاً **نام مجتمع یا پروژه ساختمانی** خود را وارد فرمایید:\n"
            "(مثال: مجتمع مسکونی مهر، برج پزشکان پارس، ساختمان تجاری نگین)"
        )
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=wizard_intro,
            reply_markup=CANCEL_KEYBOARD,
        )
        return

    if text == "📋 وضعیت قراردادهای من":
        my_contracts_stmt = (
            select(ServiceContract)
            .where(ServiceContract.user_id == user.id)
            .order_by(ServiceContract.created_at.desc())
            .limit(5)
        )
        my_contracts_res = await uow.session.execute(my_contracts_stmt)
        my_contracts = my_contracts_res.scalars().all()

        if not my_contracts:
            contracts_reply = (
                "📋 شما در حال حاضر قرارداد سرویس ثبت‌شده‌ای ندارید.\n"
                "برای ثبت درخواست از دکمه «📝 درخواست قرارداد سرویس» استفاده فرمایید."
            )
        else:
            lines = ["📋 **قراردادهای سرویس آسانسور شما:**\n"]
            for c in my_contracts:
                s_fa = CONTRACT_STATUS_FA.get(c.status, str(c.status.value))
                price_str = (
                    f"{int(c.annual_price):,} تومان"
                    if c.annual_price
                    else "در انتظار برآورد کارشناسی"
                )
                lines.append(
                    f"• پروژه: {c.building_address[:30]}\n"
                    f"  سیستم: {c.elevator_type} ({c.stops_count} توقف)\n"
                    f"  هزینه سالیانه: {price_str}\n"
                    f"  وضعیت: {s_fa}\n"
                )
            contracts_reply = "\n".join(lines)

        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=contracts_reply,
            reply_markup=SUB_CUSTOMER_CONTRACT,
        )
        return

    if text == "🛠️ ثبت خرابی فوری (اپلیکیشن)":
        app_kb = make_inline_keyboard(
            [[("دانلود اپلیکیشن خدمات و امداد 📲", f"{FRONTEND_BASE_URL}")]]
        )
        emergency_msg = (
            "🚨 **واحد امداد و تعمیرات اضطراری آسانرو کرمان**\n\n"
            "در صورت توقف کابین یا بروز هرگونه نقص فنی فوری، سریعاً با خط مستقیم امداد ۲۴ ساعته تماس حاصل فرمایید:\n"
            "📞 **۰۹۱۳۳۹۸۲۶۹۵** (مدیریت شرکت - مهندس محبی)\n\n"
            "همچنین می‌توانید اپلیکیشن خدمات آسانرو را برای اعلام خرابی با یک کلیک دریافت نمایید."
        )
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=emergency_msg,
            reply_markup=app_kb,
        )
        return

    if text == "🎫 ثبت تیکت جدید":
        set_user_state(user_key, BotState.TICKET_WAITING_SUBJECT)
        user_drafts[user_key] = {}
        ticket_intro = (
            "🎫 **ثبت تیکت پشتیبانی جدید**\n\n"
            "📌 **مرحله ۱ از ۲:** لطفاً **عنوان یا موضوع تیکت** خود را وارد نمایید:\n"
            "(مثال: سوال درباره سرویس دوره‌ای، درخواست فاکتور رسمی، مشاوره فنی)"
        )
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=ticket_intro,
            reply_markup=CANCEL_KEYBOARD,
        )
        return

    if text in ["📬 پیگیری تیکتها", "📬 پیگیری تیکت‌ها"]:
        my_tickets_stmt = (
            select(Ticket)
            .where(Ticket.user_id == user.id)
            .order_by(Ticket.created_at.desc())
            .limit(5)
        )
        my_tickets_res = await uow.session.execute(my_tickets_stmt)
        my_tickets = my_tickets_res.scalars().all()

        if not my_tickets:
            tickets_reply = "📬 شما هیچ تیکت ثبت‌شده‌ای در سیستم ندارید."
        else:
            lines = ["📬 **تیکت‌های پشتیبانی شما:**\n"]
            for t in my_tickets:
                status_fa = TICKET_STATUS_FA.get(t.status, str(t.status.value))
                priority_fa = TICKET_PRIORITY_FA.get(
                    t.priority, str(t.priority.value)
                )
                lines.append(
                    f"• موضوع: {t.subject}\n  وضعیت: {status_fa} | اولویت: {priority_fa}\n"
                )
            tickets_reply = "\n".join(lines)

        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=tickets_reply,
            reply_markup=SUB_CUSTOMER_SUPPORT,
        )
        return

    if text == "💰 موجودی کیف پول":
        balance_toman = (user.wallet_balance or 0) // 10
        wallet_kb = make_inline_keyboard(
            [[("مدیریت کیف پول در سایت 💳", f"{FRONTEND_BASE_URL}/dashboard/wallet")]]
        )
        wallet_msg = (
            "💰 **کیف پول اعتباری شما:**\n\n"
            f"موجودی فعلی: **{balance_toman:,} تومان**\n\n"
            "برای افزایش موجودی یا مشاهده گردش حساب به سایت مراجعه فرمایید."
        )
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=wallet_msg,
            reply_markup=wallet_kb,
        )
        return

    if text == "⚙️ تنظیمات پروفایل":
        profile_kb = make_inline_keyboard(
            [
                [
                    (
                        "ویرایش اطلاعات در سایت ⚙️",
                        f"{FRONTEND_BASE_URL}/dashboard/settings",
                    )
                ]
            ]
        )
        profile_msg = (
            "⚙️ **مشخصات حساب کاربری:**\n\n"
            f"• نام: {user.name or 'ثبت نشده'}\n"
            f"• شماره تماس: {user.phone}\n"
            f"• نقش: مشتری محترم آسانرو\n"
            f"• وضعیت حساب: {'فعال ✅' if user.is_active else 'غیرفعال ❌'}\n\n"
            "جهت تغییر مشخصات، رمز عبور یا ثبت آدرس‌های پروژه وارد پیشخوان کاربری شوید."
        )
        await send_bot_message(
            platform=platform,
            chat_id=chat_id,
            text=profile_msg,
            reply_markup=profile_kb,
        )
        return

    # -----------------------------------------------------------------------
    # 8. Fallback for Unrecognized Text
    # -----------------------------------------------------------------------
    fallback_text = (
        "پیام دریافتی نامعتبر است. لطفاً یکی از گزینه‌های منو را انتخاب فرمایید:"
    )
    await send_bot_message(
        platform=platform,
        chat_id=chat_id,
        text=fallback_text,
        reply_markup=current_main_menu,
    )


@router.post(
    "/telegram/webhook",
    status_code=status.HTTP_200_OK,
    summary="Telegram bot webhook endpoint",
    description="Public webhook receiving updates from Telegram Bot API. Always responds with 200 OK.",
)
@router.post(
    "/telegram",
    status_code=status.HTTP_200_OK,
    summary="Telegram bot webhook endpoint alias",
    include_in_schema=False,
)
async def telegram_webhook(
    update: Dict[str, Any],
    uow: IUnitOfWork = Depends(get_uow),
) -> Dict[str, bool]:
    try:
        await process_bot_update(update, platform="telegram", uow=uow)
    except Exception as exc:
        logger.error(f"Error handling Telegram webhook: {exc}", exc_info=True)
    return {"ok": True}


@router.post(
    "/bale/webhook",
    status_code=status.HTTP_200_OK,
    summary="Bale bot webhook endpoint",
    description="Public webhook receiving updates from Bale Bot API. Always responds with 200 OK.",
)
@router.post(
    "/bale",
    status_code=status.HTTP_200_OK,
    summary="Bale bot webhook endpoint alias",
    include_in_schema=False,
)
async def bale_webhook(
    update: Dict[str, Any],
    uow: IUnitOfWork = Depends(get_uow),
) -> Dict[str, bool]:
    try:
        await process_bot_update(update, platform="bale", uow=uow)
    except Exception as exc:
        logger.error(f"Error handling Bale webhook: {exc}", exc_info=True)
    return {"ok": True}
