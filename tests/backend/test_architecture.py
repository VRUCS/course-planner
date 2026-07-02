"""Focused tests for service boundaries and centralized API failures."""

import asyncio
from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from apps.api.application.ai_service import AIChatService
from apps.api.application.models import ChatMessage, CompletionCommand
from apps.api.application.ports import ProviderMessage, ProviderResult
from apps.api.config import Settings
from apps.api.domain.errors import ProviderResponseError
from apps.api.infrastructure import openrouter
from apps.api.main import create_app


def enabled_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "openrouter_api_key": "secret",
        "ai_interactive_enabled": True,
        "allowed_models": "test/model",
        "default_model": "test/model",
        "rate_limit_requests": 100,
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


class RecordingProvider:
    def __init__(self, result: ProviderResult) -> None:
        self.result = result
        self.max_tokens: int | None = None

    async def complete(
        self,
        *,
        messages: list[ProviderMessage],
        model: str,
        max_tokens: int,
        json_mode: bool,
    ) -> ProviderResult:
        self.max_tokens = max_tokens
        return self.result

    async def _empty_stream(self) -> AsyncIterator[str]:
        if False:
            yield ""

    def stream(
        self,
        *,
        messages: list[ProviderMessage],
        model: str,
        max_tokens: int,
    ) -> AsyncIterator[str]:
        return self._empty_stream()


def test_service_clamps_requested_tokens_to_server_policy():
    provider = RecordingProvider(
        {"choices": [{"message": {"content": "ok"}}], "usage": {}},
    )
    service = AIChatService(
        enabled_settings(max_tokens_interactive=250),
        provider,
    )

    asyncio.run(
        service.complete(
            CompletionCommand(
                messages=[ChatMessage(role="user", content="hello")],
                max_tokens=1000,
            ),
        ),
    )

    assert provider.max_tokens == 250


def test_malformed_provider_response_is_sanitized():
    with TestClient(create_app(enabled_settings())) as client:
        with patch(
            "apps.api.api.routes.ai.openrouter.complete",
            new=AsyncMock(return_value={"choices": []}),
        ):
            response = client.post(
                "/api/ai/chat/complete",
                json={"messages": [{"role": "user", "content": "hello"}]},
            )

    assert response.status_code == 502
    assert response.json() == {"detail": "سرویس مدل پاسخ نامعتبر برگرداند."}


def test_provider_timeout_is_mapped_without_leaking_details():
    provider_error = httpx.ReadTimeout("internal provider hostname")
    with TestClient(create_app(enabled_settings())) as client:
        with patch(
            "apps.api.api.routes.ai.openrouter.complete",
            new=AsyncMock(side_effect=provider_error),
        ):
            response = client.post(
                "/api/ai/chat/complete",
                json={"messages": [{"role": "user", "content": "hello"}]},
            )

    assert response.status_code == 504
    assert "internal provider hostname" not in response.text


def test_gateway_rejects_a_non_json_provider_body():
    transport = httpx.MockTransport(
        lambda _: httpx.Response(200, text="<html>provider failure</html>"),
    )
    client = httpx.AsyncClient(transport=transport)
    with patch("apps.api.infrastructure.openrouter.httpx.AsyncClient", return_value=client):
        with pytest.raises(ProviderResponseError):
            asyncio.run(
                openrouter.complete(
                    messages=[{"role": "user", "content": "hello"}],
                    model="test/model",
                    settings=enabled_settings(),
                ),
            )


def test_rate_limit_response_includes_retry_after():
    settings = enabled_settings(rate_limit_requests=1)
    provider_result = {"choices": [{"message": {"content": "ok"}}], "usage": {}}
    with TestClient(create_app(settings)) as client:
        with patch(
            "apps.api.api.routes.ai.openrouter.complete",
            new=AsyncMock(return_value=provider_result),
        ):
            payload = {"messages": [{"role": "user", "content": "hello"}]}
            assert client.post("/api/ai/chat/complete", json=payload).status_code == 200
            response = client.post("/api/ai/chat/complete", json=payload)

    assert response.status_code == 429
    assert int(response.headers["retry-after"]) >= 1
