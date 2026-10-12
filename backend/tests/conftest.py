from __future__ import annotations

from typing import Any

import pytest
from langchain_core.documents import Document
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from zenith.config import Settings


class ScriptedChat(BaseChatModel):
    """A chat model that returns pre-written replies in order and records what it was sent."""

    replies: list[AIMessage]
    calls: list[list[BaseMessage]] = []

    def model_post_init(self, __context: Any) -> None:
        self.calls = []

    @property
    def _llm_type(self) -> str:
        return "scripted"

    def bind_tools(self, tools: Any, **kwargs: Any) -> ScriptedChat:
        return self

    def _generate(self, messages: list[BaseMessage], stop=None, run_manager=None, **kwargs: Any) -> ChatResult:
        self.calls.append(list(messages))
        if not self.replies:
            raise AssertionError("ScriptedChat ran out of replies")
        return ChatResult(generations=[ChatGeneration(message=self.replies.pop(0))])


class EchoFast(BaseChatModel):
    """Fast model stand-in: routes everything to one category and echoes a HyDE text."""

    category: str = "Productivity & Habits"

    @property
    def _llm_type(self) -> str:
        return "echo"

    def _generate(self, messages: list[BaseMessage], stop=None, run_manager=None, **kwargs: Any) -> ChatResult:
        text = str(messages[-1].content)
        if any("Classify" in str(m.content) for m in messages):
            reply = self.category
        elif "Hypothetical answer" in text:
            reply = "Start with a five minute timer and commit only to starting."
        elif "Summarize" in text or "Summarise" in text:
            reply = "User is stressed about exams; suggested a 5-minute start."
        else:
            reply = '{"name": "Sam", "role": "student", "concerns": ["procrastination"], "feelings": ["stressed"], "notes": "exam stress"}'
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=reply))])


class FakeSearch:
    def __init__(self, docs: list[Document] | None = None):
        self.docs = docs or []
        self.queries: list[tuple[str, str | None]] = []

    def search(self, query: str, category: str | None) -> list[Document]:
        self.queries.append((query, category))
        return list(self.docs)


@pytest.fixture
def cfg() -> Settings:
    return Settings(max_history_tokens=4400, max_context_tokens=5500, store_profiles=False)


@pytest.fixture
def docs() -> list[Document]:
    return [
        Document(
            page_content=f"Technique {i}: break the task into a tiny first step.",
            metadata={"source": "habits-guide", "page": i, "chunk": 0, "category": "productivity & habits"},
        )
        for i in range(1, 6)
    ]
