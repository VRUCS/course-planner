"""Operational health API."""

from typing import Annotated

from fastapi import APIRouter, Depends

from apps.api.api.schemas.health import HealthResponse
from apps.api.config import Settings, get_settings

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health(
    settings: Annotated[Settings, Depends(get_settings)],
) -> HealthResponse:
    # Report readiness metadata without ever exposing the provider credential.
    return HealthResponse(
        ai_interactive_enabled=settings.ai_interactive_enabled,
        model=settings.default_model,
        api_key_set=bool(settings.openrouter_api_key),
    )
