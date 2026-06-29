"""
routes/ai.py — endpoint های هوش مصنوعی

دو دسته endpoint:
  /api/ai/batch/*    — همیشه فعال، یک‌بار اجرا، مصرف توکن مشخص
  /api/ai/chat/*     — فقط وقتی AI_INTERACTIVE_ENABLED=true
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Any
from backend.config import get_settings, Settings
from backend.services import openrouter

router = APIRouter(prefix="/api/ai", tags=["AI"])


# ─── Schemas ──────────────────────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class CompletionRequest(BaseModel):
    messages: list[Message]
    model: str | None = None
    json_mode: bool = False
    max_tokens: int | None = None

class BatchRulesRequest(BaseModel):
    """درخواست تولید قوانین تداخل از چارت درسی."""
    field_key: str           # مثال: "علوم ریاضی و کامپیوتر >> علوم کامپیوتر"
    courses: list[dict]      # آرایه درس‌ها از CURRICULUM_REGISTRY
    model: str | None = None


# ─── Guards ───────────────────────────────────────────────────────────────
def require_interactive(settings: Settings = Depends(get_settings)):
    if not settings.ai_interactive_enabled:
        raise HTTPException(
            status_code=503,
            detail="ویژگی‌های تعاملی AI هنوز فعال نشده‌اند."
        )
    return settings

def require_key(settings: Settings = Depends(get_settings)):
    if not settings.openrouter_api_key:
        raise HTTPException(
            status_code=500,
            detail="کلید API روی سرور تنظیم نشده."
        )
    return settings


# ═══════════════════════════════════════════════════════════════════════════
# BATCH endpoints — همیشه فعال
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/batch/generate-rules")
async def generate_conflict_rules(
    req: BatchRulesRequest,
    settings: Settings = Depends(require_key),
):
    """
    از چارت درسی یک رشته، قوانین تداخل mustNot/shouldNot تولید می‌کند.
    یک‌بار اجرا می‌شود و خروجی JSON برمی‌گرداند.
    """
    # خلاصه‌سازی درس‌ها برای کاهش توکن
    slim_courses = [
        {
            "id":       c.get("id"),
            "name":     c.get("name"),
            "semester": c.get("semester"),
            "code":     next(iter((c.get("codes") or {}).values()), None),
            "type":     c.get("type"),
        }
        for c in req.courses
        if next(iter((c.get("codes") or {}).values()), None)
    ]

    prompt = f"""چارت درسی زیر را بررسی کن و قوانین تداخل برنامه هفتگی را به JSON استخراج کن.

قوانین:
- mustNotConflict: درس‌هایی که در ترم مشابه هستند و دانشجو باید هر دو را هم‌زمان بگذراند.
- shouldNotConflict: درس‌هایی از ترم‌های هم‌تراز (هر دو فرد یا هر دو زوج) که دانشجوی عقب‌افتاده ممکن است هم‌زمان بگیرد. (نه درس + پیش‌نیاز مستقیم آن)

خروجی JSON:
{{
  "mustNotConflict": [{{"a":"کد_الف","nameA":"نام","b":"کد_ب","nameB":"نام","reason":"دلیل فارسی"}}],
  "shouldNotConflict": [{{"a":"کد_الف","nameA":"نام","b":"کد_ب","nameB":"نام","reason":"دلیل فارسی"}}]
}}

درس‌های چارت:
{slim_courses}"""

    result = await openrouter.complete(
        messages=[{"role": "user", "content": prompt}],
        model=req.model or settings.default_model,
        max_tokens=settings.max_tokens_batch,
        json_mode=True,
    )
    content = result["choices"][0]["message"]["content"]
    import json
    try:
        rules = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="پاسخ AI معتبر نبود.")

    return {
        "field_key": req.field_key,
        "rules": rules,
        "usage": result.get("usage", {}),
    }


@router.post("/batch/complete")
async def batch_complete(
    req: CompletionRequest,
    settings: Settings = Depends(require_key),
):
    """
    درخواست عمومی برای batch (ai_extract.py و ابزارهای مشابه).
    بدون streaming، پاسخ کامل برمی‌گردد.
    """
    result = await openrouter.complete(
        messages=[m.model_dump() for m in req.messages],
        model=req.model or settings.default_model,
        max_tokens=req.max_tokens or settings.max_tokens_batch,
        json_mode=req.json_mode,
    )
    return {
        "content": result["choices"][0]["message"]["content"],
        "usage":   result.get("usage", {}),
        "model":   result.get("model", ""),
    }


# ═══════════════════════════════════════════════════════════════════════════
# INTERACTIVE endpoints — فقط وقتی AI_INTERACTIVE_ENABLED=true
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/chat/stream")
async def chat_stream(
    req: CompletionRequest,
    _: Settings = Depends(require_interactive),  # guard
    settings: Settings = Depends(require_key),
):
    """
    Streaming chat برای دستیار مشاور.
    پاسخ SSE (Server-Sent Events) برمی‌گرداند.
    """
    return StreamingResponse(
        openrouter.stream_chunks(
            messages=[m.model_dump() for m in req.messages],
            model=req.model or settings.default_model,
            max_tokens=req.max_tokens or settings.max_tokens_interactive,
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
    _: Settings = Depends(require_interactive),  # guard
    settings: Settings = Depends(require_key),
):
    """Non-streaming complete برای load analyzer و path planner."""
    result = await openrouter.complete(
        messages=[m.model_dump() for m in req.messages],
        model=req.model or settings.default_model,
        max_tokens=req.max_tokens or settings.max_tokens_interactive,
        json_mode=req.json_mode,
    )
    return {
        "content": result["choices"][0]["message"]["content"],
        "usage":   result.get("usage", {}),
    }
