import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator, Dict

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.v1.router import api_v1_router
from core.config import settings
from db.session import engine
from infrastructure.web.correlation import CorrelationIdMiddleware
from infrastructure.web.error_handlers import register_error_handlers

# Logging configuration
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger: logging.Logger = logging.getLogger("shopbot_backend")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager for startup and shutdown routines.
    Schema changes must strictly rely on Alembic migrations rather than metadata.create_all.
    """
    logger.info("Initializing ShopBot Backend application...")
    yield
    logger.info(
        "Shutting down ShopBot Backend application, disposing database engine..."
    )
    await engine.dispose()


def create_application() -> FastAPI:
    """
    Factory function initializing the FastAPI application instance with
    lifespan lifecycle, Correlation ID tracing, CORS middleware, centralized
    RFC 7807 global exception handling, and API version 1 routers.
    """
    application: FastAPI = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
        lifespan=lifespan,
    )

    # Middleware: Correlation ID for distributed request tracing
    application.add_middleware(CorrelationIdMiddleware)

    # Middleware: CORS (Explicit localhost:3000 origin support with credentials for Next.js PWA)
    cors_origins = list(
        dict.fromkeys(
            [
                "http://localhost:3000",
                *[str(origin) for origin in (settings.BACKEND_CORS_ORIGINS or [])],
            ]
        )
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Centralized RFC 7807 Error Handling Mapper (Enables Zero Try-Catch in Routers)
    register_error_handlers(application)

    # Ensure uploads directories exist (receipts, banners)
    uploads_dir = Path("uploads")
    receipts_dir = uploads_dir / "receipts"
    receipts_dir.mkdir(parents=True, exist_ok=True)
    banners_dir = uploads_dir / "banners"
    banners_dir.mkdir(parents=True, exist_ok=True)

    # Mount static files for public receipt and asset delivery
    application.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

    # Include Presentation Routers
    application.include_router(api_v1_router, prefix=settings.API_V1_STR)

    # Health check probe endpoint
    @application.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
    async def health_check() -> Dict[str, str]:
        """
        Readiness and liveness probe endpoint returning application status and metadata.
        """
        return {
            "status": "healthy",
            "environment": settings.ENVIRONMENT,
            "project": settings.PROJECT_NAME,
        }

    return application


app: FastAPI = create_application()
