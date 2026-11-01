from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy declarative ORM models.
    Centralizes table metadata for Alembic discovery and migrations.
    Schema migrations must strictly rely on Alembic; metadata.create_all must not be called.
    """

    pass


# Import all models to ensure Alembic and Base.metadata discover all schemas
import db.models  # noqa: F401, E402
