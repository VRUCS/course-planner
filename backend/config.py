"""
config.py — تنظیمات سرور
تمام مقادیر حساس از environment variables خوانده می‌شوند.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ─── OpenRouter ────────────────────────────────────────────────────────
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    default_model: str = "deepseek/deepseek-chat-v3-0324"

    # ─── سرور ────────────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    frontend_origin: str = "http://localhost:3000"   # CORS برای frontend

    # ─── Feature flags ────────────────────────────────────────────────────
    # وقتی False است، endpoint های interactive (chat، analyze) غیرفعالند
    ai_interactive_enabled: bool = False
    # حداکثر توکن برای هر درخواست interactive
    max_tokens_interactive: int = 1200
    # حداکثر توکن برای batch (ai_extract.py)
    max_tokens_batch: int = 4096

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
