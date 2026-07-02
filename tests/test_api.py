from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from backend import security
from backend.config import get_settings
from backend.main import app


def make_client(monkeypatch, **env):
    security._requests.clear()
    defaults = {
        "OPENROUTER_API_KEY": "provider-secret",
        "AI_INTERACTIVE_ENABLED": "true",
        "ALLOWED_MODELS": "test/model",
        "DEFAULT_MODEL": "test/model",
        "RATE_LIMIT_REQUESTS": "100",
    }
    for key, value in {**defaults, **env}.items():
        monkeypatch.setenv(key, value)
    get_settings.cache_clear()
    return TestClient(app)


@pytest.fixture()
def client(monkeypatch):
    with make_client(monkeypatch) as test_client:
        yield test_client
    get_settings.cache_clear()


def test_health_does_not_disclose_secrets(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["api_key_set"] is True
    assert response.json()["ai_interactive_enabled"] is True
    assert "provider-secret" not in response.text


def test_ai_disabled_server_side_returns_503(monkeypatch):
    with make_client(monkeypatch, AI_INTERACTIVE_ENABLED="false") as test_client:
        response = test_client.post(
            "/api/ai/chat/complete",
            json={"messages": [{"role": "user", "content": "hello"}]},
        )
    get_settings.cache_clear()
    assert response.status_code == 503


def test_ai_without_provider_key_returns_503(monkeypatch):
    with make_client(monkeypatch, OPENROUTER_API_KEY="") as test_client:
        response = test_client.post(
            "/api/ai/chat/complete",
            json={"messages": [{"role": "user", "content": "hello"}]},
        )
    get_settings.cache_clear()
    assert response.status_code == 503


def test_enabled_ai_works_without_any_token(client):
    provider_result = {
        "choices": [{"message": {"content": "ok"}}],
        "usage": {"total_tokens": 2},
        "model": "test/model",
    }
    with patch("backend.routes.ai.openrouter.complete", new=AsyncMock(return_value=provider_result)):
        response = client.post(
            "/api/ai/chat/complete",
            json={"messages": [{"role": "user", "content": "hello"}]},
        )
    assert response.status_code == 200
    assert response.json()["content"] == "ok"


def test_model_allowlist(client):
    response = client.post(
        "/api/ai/chat/complete",
        json={"model": "expensive/unapproved", "messages": [{"role": "user", "content": "hello"}]},
    )
    assert response.status_code == 400


def test_rejects_oversized_and_unknown_fields(client):
    oversized = client.post(
        "/api/ai/chat/complete",
        json={"messages": [{"role": "user", "content": "x" * 12_001}]},
    )
    assert oversized.status_code == 422
    unknown = client.post(
        "/api/ai/chat/complete",
        json={"messages": [{"role": "user", "content": "ok"}], "surprise": True},
    )
    assert unknown.status_code == 422


def test_rate_limit_kicks_in(monkeypatch):
    with make_client(monkeypatch, RATE_LIMIT_REQUESTS="2") as test_client:
        provider_result = {"choices": [{"message": {"content": "ok"}}], "usage": {}}
        with patch(
            "backend.routes.ai.openrouter.complete",
            new=AsyncMock(return_value=provider_result),
        ):
            payload = {"messages": [{"role": "user", "content": "hello"}]}
            statuses = [
                test_client.post("/api/ai/chat/complete", json=payload).status_code
                for _ in range(3)
            ]
    get_settings.cache_clear()
    assert statuses[:2] == [200, 200]
    assert statuses[2] == 429
