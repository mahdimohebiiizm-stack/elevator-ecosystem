# shared/storage.py
import os
import uuid
from fastapi import UploadFile
from pathlib import Path

# ساخت پوشه اصلی و زیرپوشه‌ها در کنار پروژه
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "images").mkdir(exist_ok=True)
(UPLOAD_DIR / "audio").mkdir(exist_ok=True)

async def save_file(file: UploadFile, folder: str) -> str:
    """ذخیره فایل در سرور و برگرداندن مسیر آن"""
    # استخراج پسوند فایل (مثل jpg یا mp3)
    ext = file.filename.split('.')[-1]
    # ساخت یک نام یکتا برای جلوگیری از تداخل اسم‌ها
    new_filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = UPLOAD_DIR / folder / new_filename
    
    # ذخیره فایل در هارد سرور
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    # برگرداندن مسیر نسبی برای ذخیره در دیتابیس
    return str(file_path)