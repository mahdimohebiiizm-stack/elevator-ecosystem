from datetime import datetime
from typing import Any, List, Optional

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class SiteSetting(Base):
    """
    CMS Site Settings model for global landing page configuration,
    hero banner carousels, and enterprise contact details.
    """

    __tablename__ = "site_settings"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        default="main_config",
        doc="Configuration identifier key (e.g. 'main_config')",
    )
    hero_banners: Mapped[List[Any]] = mapped_column(
        JSONB,
        default=list,
        nullable=False,
        doc="Array of banner image URLs and hero slider items",
    )
    contact_phone: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default="09133982695",
        doc="Public telephone or mobile for customer support",
    )
    contact_email: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default="etminannamirrelee@gmail.com",
        doc="Official firm contact email address",
    )
    about_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="About us summary and corporate introduction",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Last modification timestamp",
    )
