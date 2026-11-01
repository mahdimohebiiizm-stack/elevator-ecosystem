import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.user import User, UserRole
from services.user_service import authenticate_bot_user


@pytest.mark.asyncio
async def test_authenticate_bot_user_provisions_new_user(
    db_session: AsyncSession,
) -> None:
    """
    Verify authenticate_bot_user automatically provisions and persists a new user entity.
    """
    messenger_id = f"tg_{uuid.uuid4().hex[:12]}"
    user: User = await authenticate_bot_user(
        session=db_session,
        messenger_id=messenger_id,
        phone="+989121112233",
    )

    assert user.id is not None
    assert user.messenger_id == messenger_id
    assert user.phone == "+989121112233"
    assert user.role == UserRole.CUSTOMER
    assert user.wallet_balance == 0


@pytest.mark.asyncio
async def test_authenticate_bot_user_returns_existing_user(
    db_session: AsyncSession,
) -> None:
    """
    Verify authenticate_bot_user retrieves an existing user without duplicating accounts.
    """
    messenger_id = f"bale_{uuid.uuid4().hex[:12]}"
    user1: User = await authenticate_bot_user(
        session=db_session,
        messenger_id=messenger_id,
        phone="+989351112233",
    )

    # Re-authenticate with same messenger_id
    user2: User = await authenticate_bot_user(
        session=db_session,
        messenger_id=messenger_id,
    )

    assert user1.id == user2.id
    assert user2.messenger_id == messenger_id
    assert user2.phone == "+989351112233"


@pytest.mark.asyncio
async def test_authenticate_bot_user_updates_phone_if_previously_unset(
    db_session: AsyncSession,
) -> None:
    """
    Verify authenticate_bot_user updates phone when provided on a subsequent call.
    """
    messenger_id = f"tg_{uuid.uuid4().hex[:12]}"
    initial_user: User = await authenticate_bot_user(
        session=db_session,
        messenger_id=messenger_id,
        phone=None,
    )
    assert initial_user.phone is None

    # Subsequent authentication providing phone
    updated_user: User = await authenticate_bot_user(
        session=db_session,
        messenger_id=messenger_id,
        phone="+989129998877",
    )

    assert updated_user.id == initial_user.id
    assert updated_user.phone == "+989129998877"
