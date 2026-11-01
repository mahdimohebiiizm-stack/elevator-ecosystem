# Dockerfile
# استفاده از نسخه سبک پایتون ۳.۱۱
FROM python:3.11-slim

# تنظیم متغیرهای محیطی برای جلوگیری از باگ‌های پایتون در داکر
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# تنظیم مسیر کاری داخل کانتینر
WORKDIR /app

# کپی کردن فایل نیازمندی‌ها و نصب آن‌ها
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# کپی کردن کل کدهای پروژه به داخل کانتینر
COPY . .

# باز کردن پورت 8000
EXPOSE 8000

# دستور اجرای سرور (و اجرای خودکار Alembic در صورت نیاز)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]