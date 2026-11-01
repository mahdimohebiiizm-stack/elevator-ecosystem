import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from crud.base import CRUDBase
from db.models.product import Category
from schemas.product import CategoryCreate, CategoryUpdate

crud_category: CRUDBase[Category, CategoryCreate, CategoryUpdate] = CRUDBase(Category)


@pytest.mark.asyncio
async def test_crud_base_create_with_pydantic_schema(
    db_session: AsyncSession,
) -> None:
    """
    Verify CRUDBase.create accepts a Pydantic schema and returns a persisted entity.
    """
    schema = CategoryCreate(
        name="Electronics Test",
        slug=f"electronics-{uuid.uuid4().hex[:8]}",
        icon_url="https://example.com/icon.png",
        is_active=True,
    )
    created_cat = await crud_category.create(session=db_session, obj_in=schema)

    assert created_cat.id is not None
    assert created_cat.name == "Electronics Test"
    assert created_cat.slug == schema.slug
    assert created_cat.is_active is True

    # Verify get
    fetched_cat = await crud_category.get(session=db_session, id=created_cat.id)
    assert fetched_cat is not None
    assert fetched_cat.id == created_cat.id
    assert fetched_cat.slug == created_cat.slug


@pytest.mark.asyncio
async def test_crud_base_create_with_raw_dict(
    db_session: AsyncSession,
) -> None:
    """
    Verify CRUDBase.create accepts a raw dictionary (Strict Rule 2).
    """
    slug = f"clothing-{uuid.uuid4().hex[:8]}"
    raw_data = {
        "name": "Clothing Test",
        "slug": slug,
        "is_active": True,
    }
    created_cat = await crud_category.create(session=db_session, obj_in=raw_data)

    assert created_cat.id is not None
    assert created_cat.name == "Clothing Test"
    assert created_cat.slug == slug


@pytest.mark.asyncio
async def test_crud_base_get_multi_pagination(
    db_session: AsyncSession,
) -> None:
    """
    Verify CRUDBase.get_multi retrieves records with skip and limit offsets.
    """
    # Create multiple categories
    for i in range(5):
        await crud_category.create(
            session=db_session,
            obj_in={
                "name": f"Paging Test {i}",
                "slug": f"paging-{uuid.uuid4().hex[:8]}",
                "is_active": True,
            },
        )

    items = await crud_category.get_multi(session=db_session, skip=0, limit=3)
    assert len(items) <= 3


@pytest.mark.asyncio
async def test_crud_base_update_with_pydantic_and_dict(
    db_session: AsyncSession,
) -> None:
    """
    Verify CRUDBase.update updates fields using both Pydantic schemas and raw dictionaries.
    """
    initial = await crud_category.create(
        session=db_session,
        obj_in=CategoryCreate(
            name="Initial Name",
            slug=f"update-{uuid.uuid4().hex[:8]}",
            is_active=True,
        ),
    )

    # Update via Pydantic schema
    update_schema = CategoryUpdate(name="Updated Name via Schema")
    updated_1 = await crud_category.update(
        session=db_session,
        db_obj=initial,
        obj_in=update_schema,
    )
    assert updated_1.name == "Updated Name via Schema"

    # Update via raw dictionary
    updated_2 = await crud_category.update(
        session=db_session,
        db_obj=updated_1,
        obj_in={"name": "Updated Name via Dict", "is_active": False},
    )
    assert updated_2.name == "Updated Name via Dict"
    assert updated_2.is_active is False


@pytest.mark.asyncio
async def test_crud_base_remove(
    db_session: AsyncSession,
) -> None:
    """
    Verify CRUDBase.remove deletes the record from database and returns the deleted entity.
    """
    category = await crud_category.create(
        session=db_session,
        obj_in=CategoryCreate(
            name="To Be Deleted",
            slug=f"delete-{uuid.uuid4().hex[:8]}",
            is_active=True,
        ),
    )
    cat_id = category.id

    deleted = await crud_category.remove(session=db_session, id=cat_id)
    assert deleted is not None
    assert deleted.id == cat_id

    # Verify record no longer exists
    non_existent = await crud_category.get(session=db_session, id=cat_id)
    assert non_existent is None
