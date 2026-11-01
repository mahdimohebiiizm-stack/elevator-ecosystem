import logging
from pathlib import Path
import shutil
import uuid
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select

from api.deps.security import get_current_admin_user
from api.deps.uow import get_uow
from db.models.cms import SiteSetting
from db.models.user import User
from infrastructure.db.uow import IUnitOfWork
from schemas.cms import (
    BannerUploadResponse,
    SiteSettingResponse,
    SiteSettingUpdateRequest,
)

logger = logging.getLogger("shopbot_backend.routers.cms")

router = APIRouter(prefix="/cms", tags=["CMS & Site Settings"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


@router.post(
    "/admin/banners/upload",
    response_model=BannerUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload hero banner image for landing page slider",
    description="Secured by RBAC (Admin only). Accepts multipart/form-data image, generates a collision-free UUID filename, and saves to uploads/banners.",
)
async def upload_banner_image(
    file: UploadFile = File(...),
    current_admin: User = Depends(get_current_admin_user),
) -> BannerUploadResponse:
    """
    Handles secure banner image upload with MIME validation and directory traversal prevention.
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="فرمت فایل نامعتبر است. تنها تصاویر با پسوند JPEG، PNG، WebP یا GIF مجاز می‌باشند.",
        )

    ext = ALLOWED_IMAGE_TYPES[file.content_type]
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    banners_dir = Path("uploads/banners")
    banners_dir.mkdir(parents=True, exist_ok=True)
    destination = banners_dir / safe_filename

    try:
        with open(destination, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    public_url = f"/uploads/banners/{safe_filename}"
    return BannerUploadResponse(url=public_url, filename=safe_filename)


@router.get(
    "/settings",
    response_model=SiteSettingResponse,
    status_code=status.HTTP_200_OK,
    summary="Get public CMS site settings and hero banners",
    description="Public endpoint (no auth required). Retrieves banners, contacts, and about text for public storefront.",
)
async def get_public_site_settings(
    uow: IUnitOfWork = Depends(get_uow),
) -> SiteSettingResponse:
    """
    Public endpoint providing hero banners, phone, email, and about information for public landing page.
    """
    stmt = select(SiteSetting).where(SiteSetting.id == "main_config")
    result = await uow.session.execute(stmt)
    setting = result.scalar_one_or_none()

    if not setting:
        setting = SiteSetting(
            id="main_config",
            hero_banners=[],
            contact_phone="09133982695",
            contact_email="etminannamirrelee@gmail.com",
            about_text="شرکت آسانرو اطمینان امیر کرمان - خدمات تخصصی نصب، استانداردسازی، سرویس و نگهداری آسانسور در کرمان.",
        )
        uow.session.add(setting)
        await uow.commit()
        await uow.session.refresh(setting)

    return setting


@router.get(
    "/admin/settings",
    response_model=SiteSettingResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve site configuration and hero banners",
    description="Secured by RBAC (Admin only). Fetches global site settings and banner list.",
)
async def get_site_settings(
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> SiteSettingResponse:
    """
    Retrieves global CMS settings, initializing defaults if absent.
    """
    stmt = select(SiteSetting).where(SiteSetting.id == "main_config")
    result = await uow.session.execute(stmt)
    setting = result.scalar_one_or_none()

    if not setting:
        setting = SiteSetting(
            id="main_config",
            hero_banners=[],
            contact_phone="09133982695",
            contact_email="etminannamirrelee@gmail.com",
            about_text="شرکت آسانرو اطمینان امیر کرمان - خدمات تخصصی نصب، استانداردسازی، سرویس و نگهداری آسانسور در کرمان.",
        )
        uow.session.add(setting)
        await uow.commit()
        await uow.session.refresh(setting)

    return setting


@router.patch(
    "/admin/settings",
    response_model=SiteSettingResponse,
    status_code=status.HTTP_200_OK,
    summary="Update site configuration and hero banners",
    description="Secured by RBAC (Admin only). Modifies hero banners array, contact info, and about text.",
)
async def update_site_settings(
    payload: SiteSettingUpdateRequest,
    current_admin: User = Depends(get_current_admin_user),
    uow: IUnitOfWork = Depends(get_uow),
) -> SiteSettingResponse:
    """
    Updates CMS configuration with support for hybrid banner management.
    """
    stmt = select(SiteSetting).where(SiteSetting.id == "main_config")
    result = await uow.session.execute(stmt)
    setting = result.scalar_one_or_none()

    if not setting:
        setting = SiteSetting(
            id="main_config",
            hero_banners=[],
            contact_phone="09133982695",
            contact_email="etminannamirrelee@gmail.com",
        )
        uow.session.add(setting)

    if payload.hero_banners is not None:
        setting.hero_banners = payload.hero_banners
    if payload.contact_phone is not None:
        setting.contact_phone = payload.contact_phone.strip()
    if payload.contact_email is not None:
        setting.contact_email = payload.contact_email.strip()
    if payload.about_text is not None:
        setting.about_text = payload.about_text.strip()

    await uow.commit()
    await uow.session.refresh(setting)
    return setting
