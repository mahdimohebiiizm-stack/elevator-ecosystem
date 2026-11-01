# setup_admin.py
from core.database import SessionLocal
from core.security import get_password_hash

# ایمپورت تمام مدل‌ها برای ثبت کامل روابط و نگاشت‌های SQLAlchemy
from modules.contract.models import Contract
from modules.building.models import Building, Elevator
from modules.finance.models import Payment
from modules.service_report.models import TaskAssignment, ServiceReport, ServicePart, ServiceMedia
from modules.auth.models import User, UserRoleEnum

def reset_and_create_admin():
    db = SessionLocal()
    try:
        # ۱. حذف وابستگی‌ها و کاربر قبلی
        old_user = db.query(User).filter(User.phone_number == "09376732409").first()
        if old_user:
            db.query(TaskAssignment).filter(
                (TaskAssignment.technician_id == old_user.id) | 
                (TaskAssignment.assigned_by == old_user.id)
            ).delete(synchronize_session=False)
            
            db.query(ServiceReport).filter(ServiceReport.technician_id == old_user.id).delete(synchronize_session=False)
            db.delete(old_user)
            db.commit()
            print("🗑️ کاربر قبلی با موفقیت حذف شد.")

        # ۲. ایجاد یا بروزرسانی کاربر جدید mahdi
        target_phone = "09930046324"
        existing_new_user = db.query(User).filter(User.phone_number == target_phone).first()

        hashed_pw = get_password_hash("123456")

        if existing_new_user:
            existing_new_user.full_name = "mahdi"
            existing_new_user.hashed_password = hashed_pw
            existing_new_user.role = UserRoleEnum.ADMIN
            existing_new_user.is_active = True
            print("🔄 مشخصات کاربر mahdi بروزرسانی و به ADMIN ارتقا یافت.")
        else:
            new_admin = User(
                full_name="mahdi",
                phone_number=target_phone,
                hashed_password=hashed_pw,
                role=UserRoleEnum.ADMIN,
                is_active=True
            )
            db.add(new_admin)
            print("✨ کاربر جدید mahdi با نقش ADMIN و رمز 123456 ساخته شد.")

        db.commit()

        # نمایش لیست کاربران
        users = db.query(User).all()
        print("\n" + "="*50)
        print("📋 لیست کاربران فعال سیستم:")
        for u in users:
            print(f"👤 {u.full_name} | 📱 {u.phone_number} | 🛡️ {u.role.value if hasattr(u.role, 'value') else u.role}")
        print("="*50 + "\n")

    except Exception as e:
        db.rollback()
        print(f"❌ خطا: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_create_admin()