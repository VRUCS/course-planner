"""OpenRouter gateway implementing the provider boundary."""

from collections.abc import AsyncGenerator, AsyncIterator
from typing import cast

import httpx

from apps.api.application.ports import ProviderMessage, ProviderResult
from apps.api.config import Settings, get_settings
from apps.api.domain.errors import ProviderResponseError

HEADERS = {
    "HTTP-Referer": "https://github.com/entekhab-vahed",
    "X-Title": "Entekhab Vahed",
    "Content-Type": "application/json",
}


def _build_payload(
    messages: list[ProviderMessage],
    model: str,
    max_tokens: int,
    *,
    stream: bool = False,
    json_mode: bool = False,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.4,
        "stream": stream,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    return payload


def _authorization_headers(settings: Settings) -> dict[str, str]:
    return {
        **HEADERS,
        "Authorization": f"Bearer {settings.openrouter_api_key}",
    }


async def complete(
    messages: list[ProviderMessage],
    model: str | None = None,
    max_tokens: int | None = None,
    json_mode: bool = False,
    *,
    settings: Settings | None = None,
) -> ProviderResult:
    """Compatibility-friendly provider call; application code uses the gateway."""

    resolved_settings = settings or get_settings()
    payload = _build_payload(
        messages,
        model or resolved_settings.default_model,
        max_tokens or resolved_settings.max_tokens_interactive,
        json_mode=json_mode,
    )
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
        response = await client.post(
            f"{resolved_settings.openrouter_base_url.rstrip('/')}/chat/completions",
            headers=_authorization_headers(resolved_settings),
            json=payload,
        )
        response.raise_for_status()
        try:
            result = response.json()
        except ValueError:
            # Provider bodies are untrusted input; malformed JSON is a typed
            # upstream failure, never an internal stack trace for the client.
            raise ProviderResponseError from None
        if not isinstance(result, dict):
            raise ProviderResponseError()
        return cast(ProviderResult, result)


async def stream_chunks(
    messages: list[ProviderMessage],
    model: str | None = None,
    max_tokens: int | None = None,
    *,
    settings: Settings | None = None,
) -> AsyncGenerator[str, None]:
    """Yield only valid SSE data frames from the OpenRouter response."""

    resolved_settings = settings or get_settings()
    payload = _build_payload(
        messages,
        model or resolved_settings.default_model,
        max_tokens or resolved_settings.max_tokens_interactive,
        stream=True,
    )
    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
        async with client.stream(
            "POST",
            f"{resolved_settings.openrouter_base_url.rstrip('/')}/chat/completions",
            headers=_authorization_headers(resolved_settings),
            json=payload,
        ) as response:
            response.raise_for_status()
            async for raw_line in response.aiter_lines():
                line = raw_line.strip()
                if line and line != "data: [DONE]" and line.startswith("data: "):
                    yield f"{line}\n\n"


class OpenRouterGateway:
    """Adapter that keeps the application service independent of HTTPX."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def complete(
        self,
        *,
        messages: list[ProviderMessage],
        model: str,
        max_tokens: int,
        json_mode: bool,
    ) -> ProviderResult:
        return await complete(
            messages=messages,
            model=model,
            max_tokens=max_tokens,
            json_mode=json_mode,
            settings=self._settings,
        )

    def stream(
        self,
        *,
        messages: list[ProviderMessage],
        model: str,
        max_tokens: int,
    ) -> AsyncIterator[str]:
        return stream_chunks(
            messages=messages,
            model=model,
            max_tokens=max_tokens,
            settings=self._settings,
        )
