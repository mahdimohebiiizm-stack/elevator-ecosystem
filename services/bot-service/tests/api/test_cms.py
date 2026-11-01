import uuid
from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import create_access_token
from db.models.user import User, UserRole
from main import app


@pytest.mark.asyncio
async def test_cms_endpoints_unauthenticated() -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res1 = await client.get("/api/v1/cms/admin/settings")
        assert res1.status_code == 401

        res2 = await client.patch("/api/v1/cms/admin/settings", json={"hero_banners": []})
        assert res2.status_code == 401

        res3 = await client.post(
            "/api/v1/cms/admin/banners/upload",
            files={"file": ("banner.jpg", b"\xff\xd8\xff\xe0dummy", "image/jpeg")},
        )
        assert res3.status_code == 401


@pytest.mark.asyncio
async def test_cms_endpoints_forbidden_for_customer(db_session: AsyncSession) -> None:
    user = User(
        messenger_id=f"cust_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.CUSTOMER,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    user_token = create_access_token(subject=str(user.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res1 = await client.get(
            "/api/v1/cms/admin/settings",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res1.status_code == 403

        res2 = await client.patch(
            "/api/v1/cms/admin/settings",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"contact_phone": "09130000000"},
        )
        assert res2.status_code == 403


@pytest.mark.asyncio
async def test_cms_get_and_patch_settings_success(db_session: AsyncSession) -> None:
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)

    admin_token = create_access_token(subject=str(admin.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. GET Settings
        res_get = await client.get(
            "/api/v1/cms/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_get.status_code == 200
        data_get = res_get.json()
        assert data_get["id"] == "main_config"
        assert isinstance(data_get["hero_banners"], list)

        # 2. PATCH Settings
        res_patch = await client.patch(
            "/api/v1/cms/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "hero_banners": ["/uploads/banners/sample1.jpg", "https://example.com/banner2.png"],
                "contact_phone": "09133982695",
                "contact_email": "info@asanro-kerman.ir",
                "about_text": "درباره شرکت مهندسی آسانرو کرمان...",
            },
        )
        assert res_patch.status_code == 200
        data_patch = res_patch.json()
        assert len(data_patch["hero_banners"]) == 2
        assert data_patch["contact_phone"] == "09133982695"
        assert data_patch["contact_email"] == "info@asanro-kerman.ir"
        assert data_patch["about_text"] == "درباره شرکت مهندسی آسانرو کرمان..."


@pytest.mark.asyncio
async def test_cms_upload_banner_success(db_session: AsyncSession) -> None:
    admin = User(
        messenger_id=f"admin_{uuid.uuid4().hex[:8]}",
        phone=f"+98913{uuid.uuid4().int % 10000000:07d}",
        role=UserRole.ADMIN,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)

    admin_token = create_access_token(subject=str(admin.id))

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/cms/admin/banners/upload",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("hero_slider.webp", b"RIFF....WEBPVP8 ...dummy", "image/webp")},
        )
        assert response.status_code == 201
        data = response.json()
        assert "url" in data
        assert data["url"].startswith("/uploads/banners/")
        assert data["url"].endswith(".webp")


@pytest.mark.asyncio
async def test_get_public_site_settings_unauthenticated() -> None:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/cms/settings")
        assert response.status_code == 200
        data = response.json()
        assert "hero_banners" in data
        assert "contact_phone" in data
        assert "contact_email" in data

