"""
routes/ai.py — endpoint های هوش مصنوعی

همه endpoint ها فقط وقتی AI_INTERACTIVE_ENABLED=true فعال‌اند و هیچ
توکنی از مرورگر گرفته نمی‌شود؛ کنترل دسترسی کاملاً سمت سرور است
(feature flag + rate limit + allowlist مدل).
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from backend.config import Settings
from backend.security import require_ai_access, validate_model
from backend.services import openrouter

router = APIRouter(prefix="/api/ai", tags=["AI"])


# ─── Schemas ──────────────────────────────────────────────────────────────
class Message(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: str = Field(pattern=r"^(system|user|assistant)$")
    content: str = Field(min_length=1, max_length=12_000)

class CompletionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[Message] = Field(min_length=1, max_length=20)
    model: str | None = Field(default=None, max_length=200)
    json_mode: bool = False
    max_tokens: int | None = Field(default=None, ge=1, le=4096)


def clamp_max_tokens(requested: int | None, ceiling: int) -> int:
    return min(requested or ceiling, ceiling)


def enforce_runtime_limits(req: CompletionRequest, settings: Settings) -> None:
    if len(req.messages) > settings.max_messages:
        raise HTTPException(status_code=422, detail="تعداد پیام‌ها بیش از حد مجاز است.")
    if any(len(message.content) > settings.max_message_chars for message in req.messages):
        raise HTTPException(status_code=422, detail="طول پیام بیش از حد مجاز است.")


@router.post("/chat/stream")
async def chat_stream(
    req: CompletionRequest,
    settings: Settings = Depends(require_ai_access),
):
    """
    Streaming chat برای دستیار مشاور.
    پاسخ SSE (Server-Sent Events) برمی‌گرداند.
    """
    enforce_runtime_limits(req, settings)
    return StreamingResponse(
        openrouter.stream_chunks(
            messages=[m.model_dump() for m in req.messages],
            model=validate_model(req.model, settings),
            max_tokens=clamp_max_tokens(req.max_tokens, settings.max_tokens_interactive),
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat/complete")
async def chat_complete(
    req: CompletionRequest,
    settings: Settings = Depends(require_ai_access),
):
    """Non-streaming complete برای load analyzer و path planner."""
    enforce_runtime_limits(req, settings)
    result = await openrouter.complete(
        messages=[m.model_dump() for m in req.messages],
        model=validate_model(req.model, settings),
        max_tokens=clamp_max_tokens(req.max_tokens, settings.max_tokens_interactive),
        json_mode=req.json_mode,
    )
    return {
        "content": result["choices"][0]["message"]["content"],
        "usage":   result.get("usage", {}),
    }
