from datetime import date, datetime
from enum import Enum
from typing import TYPE_CHECKING, List, Optional
import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base
from db.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from db.models.user import User


class ServiceRequestType(str, Enum):
    """
    Classification of elevator service requests.
    """

    PERIODIC_MAINTENANCE = "PERIODIC_MAINTENANCE"
    REPAIR_REQUEST = "REPAIR_REQUEST"


class ServiceRequestStatus(str, Enum):
    """
    Execution status of elevator service and maintenance operations.
    """

    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class Elevator(Base, TimestampMixin):
    """
    Elevator technical registry and specifications entity.
    """

    __tablename__ = "elevators"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    building_name: Mapped[str] = mapped_column(String(255), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    elevator_type: Mapped[str] = mapped_column(String(100), nullable=False)
    capacity_kg: Mapped[int] = mapped_column(Integer, nullable=False)
    stops: Mapped[int] = mapped_column(Integer, nullable=False)
    speed: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="elevators",
    )
    contracts: Mapped[List["Contract"]] = relationship(
        "Contract",
        back_populates="elevator",
        cascade="all, delete-orphan",
    )
    service_requests: Mapped[List["ServiceRequest"]] = relationship(
        "ServiceRequest",
        back_populates="elevator",
        cascade="all, delete-orphan",
    )


class Contract(Base, TimestampMixin):
    """
    Elevator maintenance and service contract entity.
    """

    __tablename__ = "contracts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    elevator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("elevators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    contract_number: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_price: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="Total contract price in Iranian Rials",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Relationships
    elevator: Mapped["Elevator"] = relationship(
        "Elevator",
        back_populates="contracts",
    )


class ServiceRequest(Base, TimestampMixin):
    """
    Elevator inspection, repair, or periodic maintenance request entity.
    """

    __tablename__ = "service_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    elevator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("elevators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[ServiceRequestType] = mapped_column(
        SQLEnum(ServiceRequestType, name="service_request_type"),
        nullable=False,
    )
    status: Mapped[ServiceRequestStatus] = mapped_column(
        SQLEnum(ServiceRequestStatus, name="service_request_status"),
        default=ServiceRequestStatus.PENDING,
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    scheduled_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    elevator: Mapped["Elevator"] = relationship(
        "Elevator",
        back_populates="service_requests",
    )
