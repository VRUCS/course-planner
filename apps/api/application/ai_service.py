"""Use-case orchestration for interactive AI requests."""

from collections.abc import AsyncIterator
from dataclasses import dataclass

from apps.api.application.models import CompletionCommand, CompletionResult
from apps.api.application.ports import ChatProvider, ProviderMessage
from apps.api.config import Settings
from apps.api.domain.errors import (
    ModelNotAllowedError,
    ProviderResponseError,
    RequestLimitError,
)


@dataclass(frozen=True, slots=True)
class PreparedCompletion:
    messages: list[ProviderMessage]
    model: str
    max_tokens: int
    json_mode: bool


class AIChatService:
    """Validates policy once, then delegates transport concerns to a gateway."""

    def __init__(self, settings: Settings, provider: ChatProvider) -> None:
        self._settings = settings
        self._provider = provider

    def prepare(self, command: CompletionCommand) -> PreparedCompletion:
        if len(command.messages) > self._settings.max_messages:
            raise RequestLimitError("تعداد پیام‌ها بیش از حد مجاز است.")
        if any(
            len(message.content) > self._settings.max_message_chars
            for message in command.messages
        ):
            raise RequestLimitError("طول پیام بیش از حد مجاز است.")

        model = command.model or self._settings.default_model
        if model not in self._settings.allowed_model_set:
            raise ModelNotAllowedError()

        return PreparedCompletion(
            messages=[
                ProviderMessage(role=message.role, content=message.content)
                for message in command.messages
            ],
            model=model,
            max_tokens=min(
                command.max_tokens or self._settings.max_tokens_interactive,
                self._settings.max_tokens_interactive,
            ),
            json_mode=command.json_mode,
        )

    async def complete(self, command: CompletionCommand) -> CompletionResult:
        prepared = self.prepare(command)
        result = await self._provider.complete(
            messages=prepared.messages,
            model=prepared.model,
            max_tokens=prepared.max_tokens,
            json_mode=prepared.json_mode,
        )
        try:
            content = result["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise ProviderResponseError from None
        if not isinstance(content, str):
            raise ProviderResponseError()
        usage = result.get("usage", {})
        return CompletionResult(
            content=content,
            usage=usage if isinstance(usage, dict) else {},
        )

    def stream(self, command: CompletionCommand) -> AsyncIterator[str]:
        prepared = self.prepare(command)
        return self._provider.stream(
            messages=prepared.messages,
            model=prepared.model,
            max_tokens=prepared.max_tokens,
        )
