"""Thin HTTP transport for interactive AI use cases."""

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from apps.api.api.schemas.ai import CompletionRequest, CompletionResponse
from apps.api.application.ai_service import AIChatService
from apps.api.config import Settings
from apps.api.dependencies import require_ai_access
from apps.api.infrastructure import openrouter

router = APIRouter(prefix="/api/ai", tags=["AI"])


def get_chat_service(
    settings: Annotated[Settings, Depends(require_ai_access)],
) -> AIChatService:
    # Constructing at the composition boundary makes provider replacement testable.
    return AIChatService(settings, openrouter.OpenRouterGateway(settings))


@router.post("/chat/stream")
async def chat_stream(
    request: CompletionRequest,
    service: Annotated[AIChatService, Depends(get_chat_service)],
) -> StreamingResponse:
    """Stream OpenAI-compatible SSE frames to the browser."""

    return StreamingResponse(
        service.stream(request.to_command()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat/complete", response_model=CompletionResponse)
async def chat_complete(
    request: CompletionRequest,
    service: Annotated[AIChatService, Depends(get_chat_service)],
) -> CompletionResponse:
    """Return one validated completion for planners and analyzers."""

    result = await service.complete(request.to_command())
    return CompletionResponse.from_result(result)
