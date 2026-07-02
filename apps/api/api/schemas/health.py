"""Health endpoint response contract."""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"
    ai_interactive_enabled: bool
    model: str
    api_key_set: bool
