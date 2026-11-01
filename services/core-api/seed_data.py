import uuid
import jdatetime
from core.database import SessionLocal
from modules.building.models import Building, Elevator
from modules.contract.models import Contract, ContractStatusEnum
from modules.auth.models import User
from modules.service_report.models import TaskAssignment, TaskStatusEnum, ServiceReport, ServicePart, ServiceMedia
from modules.finance.models import Payment

def seed_database():
    db = SessionLocal()
    
    try:
        admin_user = db.query(User).filter(User.phone_number == "09930046324").first()
        if not admin_user:
            print("❌ کاربر ادمین با شماره 09930046324 یافت نشد!")
            return

        # ==========================================
        # رعایت ترتیب حذف (Cascade Delete) برای جلوگیری از خطای کلید خارجی
        # ==========================================
        db.query(TaskAssignment).delete()
        db.query(ServiceMedia).delete()
        db.query(ServicePart).delete()
        db.query(ServiceReport).delete()
        db.query(Payment).delete()
        db.query(Contract).delete()
        db.query(Elevator).delete()
        db.query(Building).delete()
        db.commit()

        today_shamsi = jdatetime.date.today().strftime("%Y/%m/%d")

        buildings_data = [
            {
                "name": "ساختمان مینو", "address": "کرمان، خیابان امام جمعه_کوچه ۲۰", "manager_name": "دکتر نخعی زاده", 
                "elevators": [{"type": "کششی", "stops": 9, "qr_code_hash": "MINOO-01"}],
                "contract": {"employer_name": "دکتر نخعی زاده", "employer_national_id": None, "start_date": jdatetime.date(1404, 11, 1).togregorian(), "end_date": jdatetime.date(1405, 11, 1).togregorian(), "total_amount": 348480000}
            },
            {
                "name": "ساختمان نیایش", "address": "کرمان، بلوار امام رضا (ع) امام رضا دو", "manager_name": "سید حسن موسوی", 
                "elevators": [{"type": "کششی", "stops": 8, "qr_code_hash": "NIAYESH-01"}],
                "contract": {"employer_name": "سید حسن موسوی", "employer_national_id": "3131033479", "start_date": jdatetime.date(1405, 3, 5).togregorian(), "end_date": jdatetime.date(1406, 3, 5).togregorian(), "total_amount": 242880000}
            },
            {
                "name": "ساختمان نما سنگ مشکی", "address": "کرمان، خیابان هوشنگ مرادی_کوچه ۱۱", "manager_name": "علی شریعتی", 
                "elevators": [{"type": "کششی", "stops": 10, "qr_code_hash": "SHARIATI-01"}],
                "contract": {"employer_name": "علی شریعتی", "employer_national_id": "3130984364", "start_date": jdatetime.date(1405, 3, 5).togregorian(), "end_date": jdatetime.date(1406, 3, 4).togregorian(), "total_amount": 485760000}
            },
            {
                "name": "ساختمان میثم", "address": "کرمان، خیابان میثم شمالی_میثم ۲۴", "manager_name": "مراد حاصل رمضان نژاد", 
                "elevators": [{"type": "کششی", "stops": 7, "qr_code_hash": "MEYSAM-01"}],
                "contract": {"employer_name": "مراد حاصل رمضان نژاد", "employer_national_id": "3131234121", "start_date": jdatetime.date(1405, 3, 1).togregorian(), "end_date": jdatetime.date(1406, 2, 31).togregorian(), "total_amount": 340032000}
            },
            {
                "name": "ساختمان یاقوت", "address": "کرمان، بلوار جمهوری اسلامی مقابل هتل پارس", "manager_name": "سید احمد رضا حسینی", 
                "elevators": [
                    {"type": "کششی مسافری", "stops": 10, "qr_code_hash": "YAGHOUT-01"},
                    {"type": "کششی مسافری", "stops": 10, "qr_code_hash": "YAGHOUT-02"},
                    {"type": "کششی بالابر", "stops": 10, "qr_code_hash": "YAGHOUT-03"}
                ],
                "contract": {"employer_name": "سید احمد رضا حسینی", "employer_national_id": "6339554921", "start_date": jdatetime.date(1405, 6, 1).togregorian(), "end_date": jdatetime.date(1406, 6, 1).togregorian(), "total_amount": 1235520000}
            },
            {
                "name": "ساختمان سعیدی", "address": "بلوار هوشنگ مرادی کرمانی_کوچه ۲", "manager_name": "خدابخش سعیدی", 
                "elevators": [{"type": "کششی", "stops": 5, "qr_code_hash": "SAEEDI-01"}],
                "contract": {"employer_name": "خدابخش سعیدی", "employer_national_id": "2991397306", "start_date": jdatetime.date(1404, 11, 1).togregorian(), "end_date": jdatetime.date(1405, 11, 1).togregorian(), "total_amount": 158400000}
            },
            {
                "name": "ساختمان سعید", "address": "بلوار هوانیروز_شهرک فولاد", "manager_name": "سمانه سعید", 
                "elevators": [{"type": "کششی", "stops": 7, "qr_code_hash": "SAEED-01"}],
                "contract": {"employer_name": "سمانه سعید", "employer_national_id": "2990391436", "start_date": jdatetime.date(1404, 9, 1).togregorian(), "end_date": jdatetime.date(1405, 8, 30).togregorian(), "total_amount": 166320000}
            },
            {
                "name": "مجتمع ایلیا", "address": "کرمان، خیابان آبنوس کوچه ۱۱", "manager_name": "ایمان یوسف الهی", 
                "elevators": [{"type": "کششی", "stops": 8, "qr_code_hash": "ILIA-01"}],
                "contract": {"employer_name": "ایمان یوسف الهی", "employer_national_id": "2992653950", "start_date": jdatetime.date(1404, 11, 1).togregorian(), "end_date": jdatetime.date(1405, 11, 1).togregorian(), "total_amount": 198000000}
            }
        ]

        for b_data in buildings_data:
            new_building = Building(id=uuid.uuid4(), name=b_data["name"], address=b_data["address"], manager_name=b_data["manager_name"])
            db.add(new_building)
            db.flush()

            for elev_data in b_data["elevators"]:
                new_elevator = Elevator(id=uuid.uuid4(), building_id=new_building.id, type=elev_data["type"], stops=elev_data["stops"], qr_code_hash=elev_data["qr_code_hash"])
                db.add(new_elevator)

            c_data = b_data["contract"]
            new_contract = Contract(
                id=uuid.uuid4(), building_id=new_building.id, contract_number=f"CRT-{str(uuid.uuid4())[:8]}",
                employer_name=c_data["employer_name"], employer_national_id=c_data["employer_national_id"],
                start_date=c_data["start_date"], end_date=c_data["end_date"],
                total_amount=c_data["total_amount"], monthly_fee=c_data["total_amount"] / 12,
                total_debt=c_data["total_amount"], status=ContractStatusEnum.ACTIVE
            )
            db.add(new_contract)
            db.flush()

            new_assignment = TaskAssignment(
                id=uuid.uuid4(), building_id=new_building.id, technician_id=admin_user.id,
                assigned_by=admin_user.id, task_date_shamsi=today_shamsi, status=TaskStatusEnum.PENDING
            )
            db.add(new_assignment)

        db.commit()
        print(f"✅ دیتابیس با موفقیت با تقویم شمسی ({today_shamsi}) برای کاربر {admin_user.phone_number} پر شد!")

    except Exception as e:
        db.rollback()
        print(f"❌ خطا در عملیات Seed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()