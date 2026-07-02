"""FastAPI dependency composition for access policy and infrastructure."""

from typing import Annotated

from fastapi import Depends, Request

from apps.api.config import Settings, get_settings
from apps.api.domain.errors import AIServiceUnavailableError
from apps.api.infrastructure.rate_limiter import InMemoryRateLimiter

rate_limiter = InMemoryRateLimiter()


def get_rate_limiter() -> InMemoryRateLimiter:
    return rate_limiter


def require_ai_access(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    limiter: Annotated[InMemoryRateLimiter, Depends(get_rate_limiter)],
) -> Settings:
    if not settings.ai_interactive_enabled:
        raise AIServiceUnavailableError("سرویس AI روی این سرور فعال نیست.")
    if not settings.openrouter_api_key:
        raise AIServiceUnavailableError("سرویس AI روی سرور پیکربندی نشده است.")

    # Socket peers are trustworthy here; forwarding headers require trusted-proxy setup.
    client = request.client.host if request.client else "unknown"
    limiter.check(
        client,
        limit=settings.rate_limit_requests,
        window_seconds=settings.rate_limit_window_seconds,
    )
    return settings
