"""
main.py — FastAPI application entry point

راه‌اندازی:
    pip install -r backend/requirements.txt
    cp backend/.env.example backend/.env   # سپس .env را پر کنید
    uvicorn backend.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.config import get_settings
from backend.routes import ai, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    print(f"\n🚀 سرور شروع به کار کرد")
    print(f"   مدل: {s.default_model}")
    print(f"   API key: {'✓ تنظیم شده' if s.openrouter_api_key else '✗ تنظیم نشده!'}")
    print(f"   Interactive AI: {'فعال ✓' if s.ai_interactive_enabled else 'غیرفعال (batch-only)'}")
    yield


app = FastAPI(
    title="سامانه انتخاب واحد — API",
    description="backend برای فیچرهای هوش مصنوعی",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — فقط frontend مجاز است
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:3000",
                   "http://127.0.0.1:3000", "http://localhost:8080"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router)
app.include_router(ai.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.host, port=settings.port, reload=True)
