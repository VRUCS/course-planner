"""Central registration of safe, consistent API error responses."""

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from apps.api.domain.errors import (
    AIServiceUnavailableError,
    ApplicationError,
    ModelNotAllowedError,
    ProviderResponseError,
    RateLimitExceededError,
    RequestLimitError,
)


def _response(status_code: int, detail: str, headers: dict[str, str] | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"detail": detail},
        headers=headers,
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Keep provider details and credentials out of client-visible errors."""

    @app.exception_handler(ApplicationError)
    async def application_error(_: Request, exc: ApplicationError) -> JSONResponse:
        status_codes = {
            AIServiceUnavailableError: 503,
            ModelNotAllowedError: 400,
            RequestLimitError: 422,
            RateLimitExceededError: 429,
            ProviderResponseError: 502,
        }
        headers = (
            {"Retry-After": str(exc.retry_after)}
            if isinstance(exc, RateLimitExceededError)
            else None
        )
        return _response(status_codes[type(exc)], exc.detail, headers)

    @app.exception_handler(httpx.TimeoutException)
    async def provider_timeout(_: Request, __: httpx.TimeoutException) -> JSONResponse:
        return _response(504, "سرویس مدل در مهلت مقرر پاسخ نداد.")

    @app.exception_handler(httpx.HTTPStatusError)
    async def provider_http_error(_: Request, __: httpx.HTTPStatusError) -> JSONResponse:
        return _response(502, "سرویس مدل پاسخ نامعتبر برگرداند.")

    @app.exception_handler(httpx.RequestError)
    async def provider_connection_error(_: Request, __: httpx.RequestError) -> JSONResponse:
        return _response(502, "ارتباط با سرویس مدل برقرار نشد.")
