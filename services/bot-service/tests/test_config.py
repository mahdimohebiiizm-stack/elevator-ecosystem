from core.config import Settings, get_settings


def test_settings_loaded_correctly() -> None:
    """
    Ensure Settings loads configuration from .env without hardcoded defaults for sensitive keys.
    """
    settings: Settings = get_settings()
    assert settings.PROJECT_NAME == "ShopBot Backend"
    assert settings.API_V1_STR == "/api/v1"
    assert isinstance(settings.SECRET_KEY, str)
    assert len(settings.SECRET_KEY) > 0
    assert isinstance(settings.DATABASE_URL, str)
    assert settings.DATABASE_URL.startswith("postgresql+asyncpg://")


def test_sync_database_url_conversion() -> None:
    """
    Ensure sync_database_url properly converts postgresql+asyncpg:// to postgresql://.
    """
    settings: Settings = get_settings()
    sync_url: str = settings.sync_database_url
    assert sync_url.startswith("postgresql://")
    assert not sync_url.startswith("postgresql+asyncpg://")


def test_cors_origins_parsing() -> None:
    """
    Ensure CORS origins accept string comma-separated input and list input.
    """
    parsed_comma = Settings.assemble_cors_origins(
        "http://localhost:3000, http://localhost:8080"
    )
    assert parsed_comma == ["http://localhost:3000", "http://localhost:8080"]

    parsed_json = Settings.assemble_cors_origins(
        '["http://localhost:3000", "http://localhost:8080"]'
    )
    assert parsed_json == ["http://localhost:3000", "http://localhost:8080"]

    parsed_list = Settings.assemble_cors_origins(["http://localhost:3000"])
    assert parsed_list == ["http://localhost:3000"]
