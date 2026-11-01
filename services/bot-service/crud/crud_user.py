from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.base import CRUDBase
from db.models.user import User
from schemas.user import UserCreate, UserUpdate


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    """
    User repository extending CRUDBase with bot and messenger authentication methods.
    """

    async def get_by_messenger_id(
        self,
        session: AsyncSession,
        messenger_id: str,
    ) -> Optional[User]:
        """
        Locate a user record by their unique messaging platform identifier.
        Crucial for instant Telegram/Bale bot authentication and routing.
        """
        statement = select(User).where(User.messenger_id == messenger_id)
        result = await session.execute(statement)
        return result.scalar_one_or_none()


user: CRUDUser = CRUDUser(User)
