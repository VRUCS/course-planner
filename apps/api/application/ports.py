"""Outbound interfaces owned by the application layer."""

from collections.abc import AsyncIterator
from typing import Literal, NotRequired, Protocol, TypedDict


class ProviderMessage(TypedDict):
    role: Literal["system", "user", "assistant"]
    content: str


class ProviderMessageResult(TypedDict):
    content: str


class ProviderChoice(TypedDict):
    message: ProviderMessageResult


class ProviderResult(TypedDict):
    choices: list[ProviderChoice]
    usage: NotRequired[dict[str, object]]


class ChatProvider(Protocol):
    """Dependency-inversion boundary for any chat-completion provider."""

    async def complete(
        self,
        *,
        messages: list[ProviderMessage],
        model: str,
        max_tokens: int,
        json_mode: bool,
    ) -> ProviderResult: ...

    def stream(
        self,
        *,
        messages: list[ProviderMessage],
        model: str,
        max_tokens: int,
    ) -> AsyncIterator[str]: ...
