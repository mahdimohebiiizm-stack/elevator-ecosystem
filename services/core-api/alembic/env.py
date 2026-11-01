# alembic/env.py
import sys
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# اضافه کردن مسیر اصلی پروژه به پایتون
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# فراخوانی Base و URL دیتابیس
from core.database import Base, SQLALCHEMY_DATABASE_URL

# فراخوانی تک‌تک مدل‌ها برای اینکه Alembic آن‌ها را اسکن کند
import modules.auth.models
import modules.building.models
import modules.contract.models
import modules.finance.models
import modules.service_report.models

# این شیء کانفیگ اصلی Alembic است
config = context.config

# بازنویسی آدرس دیتابیس از فایل تنظیمات خودمان
config.set_main_option("sqlalchemy.url", SQLALCHEMY_DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# متصل کردن متادیتا به Alembic
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()