# reset_db.py
from core.database import engine, Base

# ایمپورت کردن تمام مدل‌ها الزامی است تا SQLAlchemy بداند چه جداولی را باید حذف و ایجاد کند
from modules.auth.models import User
from modules.building.models import Building, Elevator
from modules.contract.models import Contract
from modules.finance.models import Payment
from modules.service_report.models import ServiceReport, ServicePart, ServiceMedia, TaskAssignment

def reset_database():
    print("⚠️ در حال پاک کردن تمام جداول دیتابیس...")
    Base.metadata.drop_all(bind=engine)
    print("✅ جداول قدیمی پاک شدند.")

    print("🏗️ در حال ساخت مجدد جداول با ساختار جدید...")
    Base.metadata.create_all(bind=engine)
    print("✅ جداول جدید (شامل فیلد نحوه پرداخت) با موفقیت ساخته شدند.")

if __name__ == "__main__":
    confirm = input("آیا مطمئن هستید که می‌خواهید کل دیتابیس را پاک کنید؟ (y/n): ")
    if confirm.lower() == 'y':
        reset_database()
    else:
        print("عملیات لغو شد.")