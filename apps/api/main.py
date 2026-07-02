"""FastAPI application composition root."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.api.exception_handlers import register_exception_handlers
from apps.api.api.routes import ai, health
from apps.api.config import Settings, get_settings
from apps.api.dependencies import get_rate_limiter
from apps.api.infrastructure.rate_limiter import InMemoryRateLimiter

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    settings: Settings = application.state.settings
    logger.info(
        "API started (model=%s, ai_enabled=%s, provider_configured=%s)",
        settings.default_model,
        settings.ai_interactive_enabled,
        bool(settings.openrouter_api_key),
    )
    yield


def create_app(settings: Settings | None = None) -> FastAPI:
    """Application factory keeps assembly explicit and integration tests isolated."""

    resolved_settings = settings or get_settings()
    application = FastAPI(
        title="سامانه انتخاب واحد — API",
        description="backend برای فیچرهای هوش مصنوعی",
        version="1.0.0",
        lifespan=lifespan,
    )
    application.state.settings = resolved_settings
    application.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    register_exception_handlers(application)
    application.include_router(health.router)
    application.include_router(ai.router)
    if settings is not None:
        # Explicit settings make factory-created apps deterministic in tests.
        isolated_limiter = InMemoryRateLimiter()
        application.dependency_overrides[get_settings] = lambda: resolved_settings
        application.dependency_overrides[get_rate_limiter] = lambda: isolated_limiter
    return application


app = create_app()


if __name__ == "__main__":
    import uvicorn

    server_settings = get_settings()
    uvicorn.run(
        "apps.api.main:app",
        host=server_settings.host,
        port=server_settings.port,
        reload=True,
    )
