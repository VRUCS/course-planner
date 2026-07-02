"""Typed request and response contracts for interactive AI endpoints."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from apps.api.application.models import ChatMessage, CompletionCommand, CompletionResult


class Message(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=12_000)


class CompletionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    messages: list[Message] = Field(min_length=1, max_length=20)
    model: str | None = Field(default=None, max_length=200)
    json_mode: bool = False
    max_tokens: int | None = Field(default=None, ge=1, le=4096)

    def to_command(self) -> CompletionCommand:
        return CompletionCommand(
            messages=[
                ChatMessage(role=message.role, content=message.content)
                for message in self.messages
            ],
            model=self.model,
            json_mode=self.json_mode,
            max_tokens=self.max_tokens,
        )


class CompletionResponse(BaseModel):
    content: str
    usage: dict[str, object] = Field(default_factory=dict)

    @classmethod
    def from_result(cls, result: CompletionResult) -> "CompletionResponse":
        return cls(content=result.content, usage=result.usage)
