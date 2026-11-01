# check_users.py
from core.database import SessionLocal
from modules.auth.models import User, UserRoleEnum

def inspect_and_fix_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print("\n" + "="*50)
        print(f"📋 تعداد کل کاربران ثبت شده در دیتابیس: {len(users)}")
        print("="*50)

        for u in users:
            print(f"👤 نام: {u.full_name} | 📱 شماره: {u.phone_number} | 🛡️ نقش: {u.role.value if hasattr(u.role, 'value') else u.role}")

        print("="*50 + "\n")

        # اگر کاربری با شماره لاگین شما وجود دارد، مستقیماً به ADMIN ارتقا می‌دهیم
        # اگر شماره دیگری است، شماره‌تان را در خط زیر جایگزین کنید:
        target_phone = "09376732409"  # یا شماره‌ای که با آن لاگین کردید
        
        target_user = db.query(User).filter(User.phone_number == target_phone).first()
        if target_user:
            target_user.role = UserRoleEnum.ADMIN
            db.commit()
            print(f"✅ نقش کاربر {target_user.full_name} ({target_phone}) به ADMIN تغییر یافت.")
        else:
            # اگر کاربری که الان لاگین هستید را می‌خواهید ادمین کنید:
            current_logged_user = db.query(User).filter(User.full_name == "ئشایه").first()
            if current_logged_user:
                current_logged_user.role = UserRoleEnum.ADMIN
                db.commit()
                print(f"✅ کاربر '{current_logged_user.full_name}' با شماره {current_logged_user.phone_number} به ADMIN تبدیل شد.")

    except Exception as e:
        print(f"❌ خطا: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_and_fix_users()