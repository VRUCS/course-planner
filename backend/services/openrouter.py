"""
services/openrouter.py — OpenRouter async client
همه درخواست‌ها به OpenRouter از اینجا عبور می‌کنند.
"""
from collections.abc import AsyncGenerator

import httpx

from backend.config import get_settings

HEADERS = {
    "HTTP-Referer": "https://github.com/entekhab-vahed",
    "X-Title":      "سامانه انتخاب واحد هوشمند",
    "Content-Type": "application/json",
}


def _build_payload(messages: list, model: str | None, max_tokens: int,
                   stream: bool = False, json_mode: bool = False) -> dict:
    payload: dict = {
        "model":      model,
        "messages":   messages,
        "max_tokens": max_tokens,
        "temperature": 0.4,
        "stream":     stream,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    return payload


# ─── یک‌بار (non-streaming) ────────────────────────────────────────────────
async def complete(
    messages: list,
    model: str | None = None,
    max_tokens: int | None = None,
    json_mode: bool = False,
) -> dict:
    """پاسخ کامل را یک‌بار برمی‌گرداند (برای batch و interactive)."""
    settings = get_settings()
    mt = max_tokens or settings.max_tokens_interactive
    payload = _build_payload(messages, model, mt, stream=False, json_mode=json_mode)

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{settings.openrouter_base_url}/chat/completions",
            headers={**HEADERS, "Authorization": f"Bearer {settings.openrouter_api_key}"},
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


# ─── streaming ────────────────────────────────────────────────────────────
async def stream_chunks(
    messages: list,
    model: str | None = None,
    max_tokens: int | None = None,
) -> AsyncGenerator[str, None]:
    """
    SSE chunks را yield می‌کند.
    هر chunk: یک خط 'data: {...}' طبق OpenAI streaming format.
    """
    settings = get_settings()
    mt = max_tokens or settings.max_tokens_interactive
    payload = _build_payload(messages, model, mt, stream=True)

    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST",
            f"{settings.openrouter_base_url}/chat/completions",
            headers={**HEADERS, "Authorization": f"Bearer {settings.openrouter_api_key}"},
            json=payload,
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                line = line.strip()
                if not line or line == "data: [DONE]":
                    continue
                if line.startswith("data: "):
                    yield line + "\n\n"   # SSE format
