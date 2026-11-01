from typing import Any, Dict, Generic, Optional, Sequence, Type, TypeVar, Union
import uuid

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    CRUD object with default asynchronous methods to Create, Read, Update, Delete (CRUD).
    Enforces clean separation between raw data representations and database entities.
    """

    def __init__(self, model: Type[ModelType]) -> None:
        self.model: Type[ModelType] = model

    async def get(
        self,
        session: AsyncSession,
        id: Union[uuid.UUID, Any],
    ) -> Optional[ModelType]:
        """
        Retrieve a single database record by primary key.
        """
        statement = select(self.model).where(getattr(self.model, "id") == id)
        result = await session.execute(statement)
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        session: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[ModelType]:
        """
        Retrieve a paginated sequence of database records.
        """
        statement = select(self.model).offset(skip).limit(limit)
        result = await session.execute(statement)
        return result.scalars().all()

    async def create(
        self,
        session: AsyncSession,
        *,
        obj_in: Union[CreateSchemaType, Dict[str, Any]],
    ) -> ModelType:
        """
        Create and persist a new database record from a Pydantic schema or dictionary.
        """
        if isinstance(obj_in, dict):
            create_data = obj_in.copy()
        else:
            create_data = obj_in.model_dump(exclude_unset=True)

        db_obj: ModelType = self.model(**create_data)
        session.add(db_obj)
        await session.commit()
        await session.refresh(db_obj)
        return db_obj

    async def update(
        self,
        session: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]],
    ) -> ModelType:
        """
        Update an existing database record from a Pydantic schema or dictionary.
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        session.add(db_obj)
        await session.commit()
        await session.refresh(db_obj)
        return db_obj

    async def remove(
        self,
        session: AsyncSession,
        *,
        id: Union[uuid.UUID, Any],
    ) -> Optional[ModelType]:
        """
        Delete a database record by primary key and return the deleted instance.
        """
        statement = select(self.model).where(getattr(self.model, "id") == id)
        result = await session.execute(statement)
        db_obj = result.scalar_one_or_none()
        if db_obj is not None:
            await session.delete(db_obj)
            await session.commit()
        return db_obj
