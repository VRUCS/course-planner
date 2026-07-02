"""Typed application errors shared across transport and service layers."""

from dataclasses import dataclass


@dataclass(slots=True)
class ApplicationError(Exception):
    """Base error that carries no transport-specific status semantics."""

    detail: str


class AIServiceUnavailableError(ApplicationError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail=detail)


class ModelNotAllowedError(ApplicationError):
    def __init__(self) -> None:
        super().__init__(detail="مدل در فهرست مجاز سرور نیست.")


class RequestLimitError(ApplicationError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail=detail)


class RateLimitExceededError(ApplicationError):
    def __init__(self, retry_after: int) -> None:
        super().__init__(detail="تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد تلاش کنید.")
        self.retry_after = retry_after


class ProviderResponseError(ApplicationError):
    def __init__(self) -> None:
        super().__init__(detail="سرویس مدل پاسخ نامعتبر برگرداند.")
