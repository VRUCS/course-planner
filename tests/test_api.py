from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.config import get_settings
from backend.main import app


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "provider-secret")
    monkeypatch.setenv("AI_API_TOKEN", "browser-access-token")
    monkeypatch.setenv("ALLOW_ANONYMOUS_AI", "false")
    monkeypatch.setenv("ALLOWED_MODELS", "test/model")
    monkeypatch.setenv("DEFAULT_MODEL", "test/model")
    monkeypatch.setenv("RATE_LIMIT_REQUESTS", "100")
    get_settings.cache_clear()
    with TestClient(app) as test_client:
        yield test_client
    get_settings.cache_clear()


def test_health_does_not_disclose_secrets(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["api_key_set"] is True
    assert "provider-secret" not in response.text


def test_ai_requires_access_token(client):
    response = client.post(
        "/api/ai/batch/complete",
        json={"messages": [{"role": "user", "content": "hello"}]},
    )
    assert response.status_code == 401


def test_model_allowlist_and_success(client):
    headers = {"X-API-Token": "browser-access-token"}
    invalid = client.post(
        "/api/ai/batch/complete",
        headers=headers,
        json={"model": "expensive/unapproved", "messages": [{"role": "user", "content": "hello"}]},
    )
    assert invalid.status_code == 400

    provider_result = {
        "choices": [{"message": {"content": "ok"}}],
        "usage": {"total_tokens": 2},
        "model": "test/model",
    }
    with patch("backend.routes.ai.openrouter.complete", new=AsyncMock(return_value=provider_result)):
        response = client.post(
            "/api/ai/batch/complete",
            headers=headers,
            json={"messages": [{"role": "user", "content": "hello"}]},
        )
    assert response.status_code == 200
    assert response.json()["content"] == "ok"


def test_rejects_oversized_and_unknown_fields(client):
    headers = {"X-API-Token": "browser-access-token"}
    oversized = client.post(
        "/api/ai/batch/complete",
        headers=headers,
        json={"messages": [{"role": "user", "content": "x" * 12_001}]},
    )
    assert oversized.status_code == 422
    unknown = client.post(
        "/api/ai/batch/complete",
        headers=headers,
        json={"messages": [{"role": "user", "content": "ok"}], "surprise": True},
    )
    assert unknown.status_code == 422
