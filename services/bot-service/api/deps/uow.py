from typing import AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from infrastructure.db.uow import IUnitOfWork, SqlAlchemyUnitOfWork


async def get_uow(
    session: AsyncSession = Depends(get_db),
) -> AsyncGenerator[IUnitOfWork, None]:
    """
    FastAPI dependency yielding an active Unit of Work managing database transaction boundaries.
    """
    uow: IUnitOfWork = SqlAlchemyUnitOfWork(session)
    yield uow
