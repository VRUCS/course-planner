"""
main.py — FastAPI application entry point

راه‌اندازی:
    pip install -r backend/requirements.txt
    cp backend/.env.example backend/.env   # سپس .env را پر کنید
    uvicorn backend.main:app --reload --port 8000
"""
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import get_settings
from backend.routes import ai, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    print("\n🚀 سرور شروع به کار کرد")
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


@app.exception_handler(httpx.TimeoutException)
async def provider_timeout(_: Request, __: httpx.TimeoutException):
    return JSONResponse(
        status_code=504,
        content={"detail": "سرویس مدل در مهلت مقرر پاسخ نداد."},
    )


@app.exception_handler(httpx.HTTPStatusError)
async def provider_http_error(_: Request, __: httpx.HTTPStatusError):
    return JSONResponse(
        status_code=502,
        content={"detail": "سرویس مدل پاسخ نامعتبر برگرداند."},
    )


@app.exception_handler(httpx.RequestError)
async def provider_connection_error(_: Request, __: httpx.RequestError):
    return JSONResponse(
        status_code=502,
        content={"detail": "ارتباط با سرویس مدل برقرار نشد."},
    )

# CORS — فقط frontend مجاز است
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Token"],
)

app.include_router(health.router)
app.include_router(ai.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.host, port=settings.port, reload=True)
