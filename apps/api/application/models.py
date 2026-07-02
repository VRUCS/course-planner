"""Transport-independent commands and results for AI use cases."""

from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True, slots=True)
class ChatMessage:
    role: Literal["system", "user", "assistant"]
    content: str


@dataclass(frozen=True, slots=True)
class CompletionCommand:
    messages: list[ChatMessage]
    model: str | None = None
    json_mode: bool = False
    max_tokens: int | None = None


@dataclass(frozen=True, slots=True)
class CompletionResult:
    content: str
    usage: dict[str, object] = field(default_factory=dict)
