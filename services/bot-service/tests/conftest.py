from typing import AsyncGenerator
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from core.config import settings
from db.session import get_db, engine as global_engine
from main import app


@pytest_asyncio.fixture(autouse=True)
async def cleanup_connections():
    yield
    await global_engine.dispose()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Asynchronous database session fixture using NullPool.
    Overrides FastAPI's get_db dependency so endpoints use the clean test session.
    """
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    test_sessionmaker = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    async with test_sessionmaker() as session:

        async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
            yield session

        app.dependency_overrides[get_db] = override_get_db
        try:
            yield session
        finally:
            app.dependency_overrides.pop(get_db, None)
            try:
                from sqlalchemy import select, delete
                from db.models.user import User, UserRole
                from db.models.notification import Notification

                # Auto-cleanup any ephemeral test users (admins or customers) to preserve database integrity
                real_phones = {
                    "09133982695",
                    "09137681873",
                    "09132223344",
                    "09137778899",
                    "09930046324",
                    "09121112233",
                    "09359876543",
                }
                test_users_res = await session.execute(
                    select(User.id).where(User.phone.not_in(real_phones))
                )
                test_user_ids = test_users_res.scalars().all()
                if test_user_ids:
                    await session.execute(
                        delete(Notification).where(Notification.user_id.in_(test_user_ids))
                    )
                    await session.execute(
                        delete(User).where(User.id.in_(test_user_ids))
                    )
                    await session.commit()
            except Exception:
                pass

    await test_engine.dispose()


@pytest_asyncio.fixture
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Asynchronous HTTP test client for invoking application endpoints with test database session bound.
    """
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
