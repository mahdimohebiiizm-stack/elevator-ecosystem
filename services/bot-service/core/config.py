from functools import lru_cache
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration settings loaded strictly from environment
    variables and .env files using Pydantic BaseSettings.
    Sensitive credentials have no hardcoded fallback values.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "ShopBot Backend"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Security sensitive variables (loaded strictly from environment / .env)
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days in minutes

    # Database sensitive connection string (loaded strictly from environment / .env)
    DATABASE_URL: str

    # Redis configuration
    REDIS_URL: str = "redis://localhost:6379/0"

    # Payment Gateway Configuration (ZarinPal)
    ZARINPAL_MERCHANT_ID: str = "00000000-0000-0000-0000-000000000000"
    ZARINPAL_SANDBOX: bool = True
    PAYMENT_CALLBACK_URL: str = "http://localhost:8000/api/v1/payment/verify"

    # S3 / MinIO Object Storage Configuration
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "shopbot-media"
    S3_REGION: str = "us-east-1"

    # Messengers & Bots Webhook Configuration (Telegram & Bale)
    TELEGRAM_BOT_TOKEN: str = ""
    BALE_BOT_TOKEN: str = ""
    BASE_WEBHOOK_URL: str = "https://stegosaur-raffle-ivory.ngrok-free.dev"

    # CORS configuration
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, value: Union[str, List[str]]) -> List[str]:
        if isinstance(value, str):
            if value.startswith("[") and value.endswith("]"):
                # Handle stringified list representation if passed
                items = [item.strip(" '\"") for item in value[1:-1].split(",")]
                return [item for item in items if item]
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return [str(origin) for origin in value]
        raise ValueError("Invalid format for CORS origins")

    @property
    def sync_database_url(self) -> str:
        """
        Derives a synchronous database URL from the async connection string,
        suitable for tools requiring a synchronous driver.
        """
        if self.DATABASE_URL.startswith("postgresql+asyncpg://"):
            return self.DATABASE_URL.replace(
                "postgresql+asyncpg://", "postgresql://", 1
            )
        return self.DATABASE_URL


@lru_cache
def get_settings() -> Settings:
    """
    Cached accessor for application settings.
    Guarantees single load while allowing test overrides.
    """
    return Settings()


settings: Settings = get_settings()
