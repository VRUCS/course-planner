"""Small authentication and rate-limit guards for the optional AI API."""
from collections import defaultdict, deque
from secrets import compare_digest
from threading import Lock
from time import monotonic

from fastapi import Depends, Header, HTTPException, Request, status

from backend.config import Settings, get_settings

_requests: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()


def require_ai_access(
    request: Request,
    x_api_token: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> Settings:
    if not settings.openrouter_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="سرویس AI روی سرور پیکربندی نشده است.",
        )

    if not settings.allow_anonymous_ai:
        if not settings.ai_api_token:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI_API_TOKEN روی سرور تنظیم نشده است.",
            )
        if not x_api_token or not compare_digest(x_api_token, settings.ai_api_token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="توکن دسترسی AI نامعتبر است.",
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
