from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SiteSettingResponse(BaseModel):
    """
    Presentation DTO for Site Settings & CMS configuration.
    """

    id: str = "main_config"
    hero_banners: List[str] = Field(default_factory=list)
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    about_text: Optional[str] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SiteSettingUpdateRequest(BaseModel):
    """
    Contract for Admin modifying CMS site settings and hero banners.
    """

    hero_banners: Optional[List[str]] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    about_text: Optional[str] = None


class BannerUploadResponse(BaseModel):
    """
    Response schema for uploaded banner image.
    """

    url: str
    filename: str
