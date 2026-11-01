# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from core.config import settings

# وارد کردن روت‌های ماژول‌های مختلف
from modules.building.router import router as building_router
from modules.service_report.router import router as report_router
from modules.auth.router import router as auth_router
from modules.contract.router import router as contract_router 
from modules.finance.router import router as finance_router 
from modules.analytics.router import router as analytics_router 

# 👈 اضافه شدن مسیر نوتیفیکیشن‌ها
from modules.analytics.notifications_router import router as notifications_router

app = FastAPI(
    title="سیستم مدیریت هوشمند آسانسور",
    description="API های حرفه ای برای اپلیکیشن تکنسین ها و پنل مدیریت",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# دسترسی عمومی به پوشه فایل‌های آپلود شده
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ثبت کردن مسیرهای سیستم در Swagger
app.include_router(auth_router, prefix="/api/v1/auth", tags=["🔑 Authentication"])
app.include_router(building_router, prefix="/api/v1/buildings", tags=["🏢 Buildings & Elevators"])
app.include_router(contract_router, prefix="/api/v1/contracts", tags=["📄 Contracts"]) 
app.include_router(report_router, prefix="/api/v1/reports", tags=["🛠️ Service Reports"])
app.include_router(finance_router, prefix="/api/v1/finance", tags=["💰 Financials"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["📊 Dashboard & Analytics"])

# 👈 ثبت مسیر نوتیفیکیشن‌ها در سیستم
app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["🔔 Notifications"])

@app.get("/health", tags=["🏥 Health"])
def health_check():
    return {"status": "healthy", "service": "core-api"}
