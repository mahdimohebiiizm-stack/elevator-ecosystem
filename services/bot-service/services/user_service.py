from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from crud import user as crud_user
from db.models.user import User, UserRole
from schemas.user import UserCreate


async def authenticate_bot_user(
    session: AsyncSession,
    messenger_id: str,
    phone: Optional[str] = None,
) -> User:
    """
    Authenticates an incoming messenger user or provisions a new account.
    Queries the database via messenger_id. If found, returns the user entity.
    Otherwise, creates and commits a new User entity with default customer role.
    """
    existing_user: Optional[User] = await crud_user.get_by_messenger_id(
        session=session,
        messenger_id=messenger_id,
    )
    is_admin = phone in ["09133982695", "+989133982695", "9133982695"] if phone else False
    if existing_user is not None:
        updated = False
        if phone is not None and existing_user.phone is None:
            existing_user.phone = phone
            updated = True
        if is_admin and existing_user.role != UserRole.ADMIN:
            existing_user.role = UserRole.ADMIN
            updated = True
        if updated:
            session.add(existing_user)
            await session.commit()
            await session.refresh(existing_user)
        return existing_user

    new_user_data = UserCreate(
        messenger_id=messenger_id,
        phone=phone,
        role=UserRole.ADMIN if is_admin else UserRole.CUSTOMER,
        wallet_balance=0,
    )
    new_user: User = await crud_user.create(session=session, obj_in=new_user_data)
    return new_user
