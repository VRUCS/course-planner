"""Access guards for the AI API.

There is no client-side credential by design: whether AI is available is
decided entirely on the server. AI_INTERACTIVE_ENABLED=true opens the
endpoints to everyone (per-IP rate-limited); false disables them for all.
"""
from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import Depends, HTTPException, Request, status

from backend.config import Settings, get_settings

_requests: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()


def require_ai_access(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> Settings:
    if not settings.ai_interactive_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="سرویس AI روی این سرور فعال نیست.",
        )
    if not settings.openrouter_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="سرویس AI روی سرور پیکربندی نشده است.",
        )

    client = request.client.host if request.client else "unknown"
    now = monotonic()
    threshold = now - settings.rate_limit_window_seconds
    with _lock:
        bucket = _requests[client]
        while bucket and bucket[0] <= threshold:
            bucket.popleft()
        if len(bucket) >= settings.rate_limit_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد تلاش کنید.",
            )
        bucket.append(now)
    return settings


def validate_model(model: str | None, settings: Settings) -> str:
    selected = model or settings.default_model
    if selected not in settings.allowed_model_set:
        raise HTTPException(status_code=400, detail="مدل در فهرست مجاز سرور نیست.")
    return selected
