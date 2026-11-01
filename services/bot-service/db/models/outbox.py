from datetime import datetime
from typing import Any, Dict, Optional
import uuid

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base
from db.models.mixins import TimestampMixin


class OutboxEvent(Base, TimestampMixin):
    """
    Transactional Outbox Pattern entity.
    Stores domain events atomically within the originating transaction,
    guaranteeing reliable, at-least-once asynchronous event delivery.
    """

    __tablename__ = "outbox_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    aggregate_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Name of the aggregate root (e.g. Order, User, Product)",
    )
    aggregate_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Identifier of the aggregate root instance",
    )
    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Categorical name of the emitted domain event",
    )
    payload: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        comment="Event payload data serialized in JSONB",
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        comment="Timestamp when outbox dispatcher successfully published the event",
    )
