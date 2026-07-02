from fastapi import APIRouter

from backend.config import get_settings

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health():
    s = get_settings()
    return {
        "status": "ok",
        "ai_interactive_enabled": s.ai_interactive_enabled,
        "model": s.default_model,
        "api_key_set": bool(s.openrouter_api_key),
    }
