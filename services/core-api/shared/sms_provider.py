# shared/sms_provider.py
import requests
import logging

# تنظیمات لاگر برای ثبت خطاهای احتمالی در ترمینال سرور
logger = logging.getLogger(__name__)

# کلید API کاوه‌نگار خود را اینجا قرار دهید (در محیط پروداکشن بهتر است از فایل .env خوانده شود)
KAVENEGAR_API_KEY = "YOUR_KAVENEGAR_API_KEY_HERE"

def send_sms_background(phone_number: str, message: str):
    """
    تابع ارسال پیامک که توسط BackgroundTasks در FastAPI اجرا می‌شود.
    بدون معطل کردن کاربر، پیامک را در پس‌زمینه ارسال می‌کند.
    """
    if not phone_number or len(phone_number) < 10:
        logger.warning(f"شماره موبایل نامعتبر است: {phone_number}")
        return

    try:
        url = f"https://api.kavenegar.com/v1/{KAVENEGAR_API_KEY}/sms/send.json"
        payload = {
            "receptor": phone_number,
            "message": message
        }
        # تایم‌اوت ۵ ثانیه تا اگر سرور کاوه‌نگار قطع بود، منابع سرور ما درگیر نشود
        response = requests.post(url, data=payload, timeout=5)
        
        if response.status_code == 200:
            logger.info(f"✅ پیامک با موفقیت به {phone_number} ارسال شد.")
        else:
            logger.error(f"❌ خطا در ارسال پیامک به {phone_number}: {response.text}")
            
    except Exception as e:
        logger.error(f"❌ خطای سیستمی هنگام اتصال به سرویس پیامک: {e}")