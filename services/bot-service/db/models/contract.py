from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional
import uuid

from sqlalchemy import (
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


class ContractStatus(str, Enum):
    """
    Status of elevator maintenance and service contracts.
    """
    PENDING = "PENDING"
    QUOTED = "QUOTED"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class ServiceContract(Base, TimestampMixin):
    """
    Elevator service and maintenance contract requested by customer and managed by admin.
    """

    __tablename__ = "service_contracts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    building_address: Mapped[str] = mapped_column(Text, nullable=False)
    building_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    registration_plate: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    employer_national_id: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    elevator_type: Mapped[str] = mapped_column(String(100), nullable=False)
    stops_count: Mapped[int] = mapped_column(Integer, nullable=False)
    capacity_kg: Mapped[int] = mapped_column(Integer, nullable=False, default=600)
    speed_ms: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0 m/s")
    usage_type: Mapped[Optional[str]] = mapped_column(String(50), default="مسافری", nullable=True)
    qr_code_hash: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default=lambda: f"ELV-{uuid.uuid4().hex[:8].upper()}",
    )

    annual_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    monthly_fee: Mapped[Optional[float]] = mapped_column(Float, default=0.0, nullable=True)
    total_debt: Mapped[Optional[float]] = mapped_column(Float, default=0.0, nullable=True)
    payment_frequency: Mapped[Optional[str]] = mapped_column(String(50), default="FLEXIBLE", nullable=True)
    tax_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[ContractStatus] = mapped_column(
        SQLEnum(ContractStatus, name="contract_status"),
        default=ContractStatus.PENDING,
        nullable=False,
        index=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="contracts",
    )
