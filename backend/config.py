"""
config.py — تنظیمات سرور
تمام مقادیر حساس از environment variables خوانده می‌شوند.
"""
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(PROJECT_DIR / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ─── OpenRouter ────────────────────────────────────────────────────────
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    default_model: str = "deepseek/deepseek-chat-v3-0324"
    allowed_models: str = "deepseek/deepseek-chat-v3-0324"

    # ─── سرور ────────────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    frontend_origin: str = "http://localhost:3000"   # CORS برای frontend
    frontend_origins: str = ""

    rate_limit_requests: int = 20
    rate_limit_window_seconds: int = 60
    max_message_chars: int = 12_000
    max_messages: int = 20

    # ─── Feature flag ─────────────────────────────────────────────────────
    # تنها کلید روشن/خاموش AI: هیچ توکنی از کاربر گرفته نمی‌شود.
    # False → همه endpoint های /api/ai برای همه 503 برمی‌گردانند.
    # True  → برای همه فعال است (با rate limit و allowlist مدل).
    ai_interactive_enabled: bool = False
    # حداکثر توکن برای هر درخواست
    max_tokens_interactive: int = 1200

    @property
    def allowed_model_set(self) -> set[str]:
        return {item.strip() for item in self.allowed_models.split(",") if item.strip()}

    @property
    def cors_origins(self) -> list[str]:
        configured = [
            self.frontend_origin,
            "http://127.0.0.1:3000",
            *self.frontend_origins.split(","),
        ]
        return list(dict.fromkeys(origin.strip() for origin in configured if origin.strip()))

    @field_validator("rate_limit_requests", "rate_limit_window_seconds")
    @classmethod
    def positive_rate_limit(cls, value: int) -> int:
        if value < 1:
            raise ValueError("rate-limit values must be positive")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
