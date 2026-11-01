import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from crud import user as crud_user
from db.models.user import UserRole
from schemas.user import UserCreate, UserResponse, UserUpdate


@pytest.mark.asyncio
async def test_crud_user_create_and_get_by_messenger_id(
    db_session: AsyncSession,
) -> None:
    """
    Verify creating a user and retrieving them by messenger_id for bot authentication.
    """
    messenger_id = f"tg_{uuid.uuid4().hex[:12]}"
    user_in = UserCreate(
        messenger_id=messenger_id,
        phone="+989123456789",
        role=UserRole.CUSTOMER,
        wallet_balance=100_000_000,  # 100 million Rials
    )

    created_user = await crud_user.create(session=db_session, obj_in=user_in)
    assert created_user.id is not None
    assert created_user.messenger_id == messenger_id
    assert created_user.wallet_balance == 100_000_000
    assert created_user.role == UserRole.CUSTOMER

    # Test get_by_messenger_id
    found_user = await crud_user.get_by_messenger_id(
        session=db_session,
        messenger_id=messenger_id,
    )
    assert found_user is not None
    assert found_user.id == created_user.id
    assert found_user.messenger_id == messenger_id

    # Verify mapping to Pydantic UserResponse DTO
    response_dto = UserResponse.model_validate(found_user)
    assert response_dto.id == created_user.id
    assert response_dto.wallet_balance == 100_000_000
    assert response_dto.role == UserRole.CUSTOMER


@pytest.mark.asyncio
async def test_crud_user_get_by_non_existent_messenger_id(
    db_session: AsyncSession,
) -> None:
    """
    Verify get_by_messenger_id returns None when user does not exist.
    """
    random_id = f"non_existent_{uuid.uuid4().hex}"
    found_user = await crud_user.get_by_messenger_id(
        session=db_session,
        messenger_id=random_id,
    )
    assert found_user is None


@pytest.mark.asyncio
async def test_crud_user_update_wallet_and_role(
    db_session: AsyncSession,
) -> None:
    """
    Verify updating financial balance and role via crud.user.
    """
    messenger_id = f"tg_{uuid.uuid4().hex[:12]}"
    user_in = UserCreate(
        messenger_id=messenger_id,
        role=UserRole.CUSTOMER,
        wallet_balance=0,
    )
    created_user = await crud_user.create(session=db_session, obj_in=user_in)

    # Update wallet balance and promote to ADMIN
    update_in = UserUpdate(
        wallet_balance=75_000_000,  # 75 million Rials
        role=UserRole.ADMIN,
        phone="+989350000000",
    )
    updated_user = await crud_user.update(
        session=db_session,
        db_obj=created_user,
        obj_in=update_in,
    )

    assert updated_user.wallet_balance == 75_000_000
    assert updated_user.role == UserRole.ADMIN
    assert updated_user.phone == "+989350000000"


@pytest.mark.asyncio
async def test_crud_user_remove(
    db_session: AsyncSession,
) -> None:
    """
    Verify deleting a user by primary key.
    """
    messenger_id = f"tg_{uuid.uuid4().hex[:12]}"
    user = await crud_user.create(
        session=db_session,
        obj_in=UserCreate(messenger_id=messenger_id),
    )

    deleted = await crud_user.remove(session=db_session, id=user.id)
    assert deleted is not None
    assert deleted.id == user.id

    # Verify user is gone
    found = await crud_user.get_by_messenger_id(
        session=db_session,
        messenger_id=messenger_id,
    )
    assert found is None
