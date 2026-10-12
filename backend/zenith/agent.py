"""The conversation loop: safety screen, tool-calling model, grounded second pass."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool

from . import prompts, safety
from .config import Settings
from .config import settings as default_settings
from .memory import Conversation
from .profile import extract_profile
from .retrieval import Retriever

log = logging.getLogger(__name__)

MAX_TOOL_CALLS = 2
FALLBACK_REPLY = "Sorry, I lost my train of thought there. Could you say that again?"


@tool
def retrieve_docs(query: str) -> str:
    """Find passages from the well-being knowledge base (psychology, habits, resilience,
    social skills, practical life skills). Use before recommending any named technique,
    coping skill or habit change. Input: 3-6 compact keywords. Output: excerpts, or NO_RESULTS."""
    raise NotImplementedError("executed by ZenithAgent, not by the model runtime")


@dataclass
class Reply:
    text: str
    mode: str  # "crisis" | "grounded" | "direct"
    sources: list[dict[str, Any]] = field(default_factory=list)
    category: str | None = None


class ZenithAgent:
    def __init__(
        self,
        chat_llm: BaseChatModel,
        fast_llm: BaseChatModel,
        retriever: Retriever,
        cfg: Settings = default_settings,
    ):
        self.chat_llm = chat_llm
        self.fast_llm = fast_llm
        self.retriever = retriever
        self.cfg = cfg
        self.sessions: dict[str, Conversation] = {}
        self.profiles: dict[str, dict[str, Any]] = {}

    def conversation(self, session_id: str) -> Conversation:
        return self.sessions.setdefault(session_id, Conversation())

    def reset(self, session_id: str) -> None:
        self.sessions.pop(session_id, None)
        self.profiles.pop(session_id, None)

    def _base_messages(self, session_id: str) -> list[BaseMessage]:
        messages: list[BaseMessage] = [
            SystemMessage(content=prompts.load("system")),
            SystemMessage(content=prompts.load("examples")),
        ]
        profile = self.profiles.get(session_id)
        if profile and (profile.get("concerns") or profile.get("name")):
            facts = {k: v for k, v in profile.items() if k != "updated_at" and v}
            messages.append(SystemMessage(content=f"What the user has told you about themselves: {facts}"))
        return messages

    def answer(self, session_id: str, message: str) -> Reply:
        message = message.strip()
        convo = self.conversation(session_id)

        # 1. Deterministic crisis screen, before any model sees the message.
        if safety.screen(message).crisis:
            text = safety.crisis_reply(message)
            convo.add_turn(message, text)
            return Reply(text=text, mode="crisis")

        # 2. Keep the history inside its budget.
        convo.compress(self.fast_llm, self.cfg.max_history_tokens)

        messages = [*self._base_messages(session_id), *convo.context_messages(), HumanMessage(content=message)]

        # 3. First pass: the model decides whether it needs the knowledge base.
        first = self.chat_llm.bind_tools([retrieve_docs]).invoke(messages)
        calls = list(getattr(first, "tool_calls", None) or [])

        sources: list[dict[str, Any]] = []
        category: str | None = None
        if not calls:
            text, mode = str(first.content), "direct"
        else:
            # 4. Run the requested searches, then a grounded second pass.
            tool_messages = []
            for i, call in enumerate(calls):
                if call.get("name") != "retrieve_docs" or i >= MAX_TOOL_CALLS:
                    tool_messages.append(ToolMessage(content="Skipped.", tool_call_id=call["id"]))
                    continue
                query = (call.get("args") or {}).get("query") or message
                result = self.retriever.run(query)
                category = category or result.category
                sources.extend(result.sources)
                tool_messages.append(ToolMessage(content=result.context or "NO_RESULTS", tool_call_id=call["id"]))
            final = self.chat_llm.invoke([*messages, first, *tool_messages])
            text, mode = str(final.content), "grounded"

        text = text.strip() or FALLBACK_REPLY
        convo.add_turn(message, text)

        # 5. Optional profile, only when the deployment opts in.
        if self.cfg.store_profiles:
            self.profiles[session_id] = extract_profile(convo.messages, self.fast_llm)

        return Reply(text=text, mode=mode, sources=_unique_sources(sources), category=category)


def _unique_sources(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = set()
    out = []
    for s in sources:
        key = (s.get("source"), s.get("page"))
        if key not in seen:
            seen.add(key)
            out.append(s)
    return out[:6]


def build_agent(cfg: Settings = default_settings) -> ZenithAgent:
    """Wire the real models and vector store."""
    from .llm import chat_model, fast_model
    from .retrieval import QdrantSearch

    fast = fast_model(cfg)
    try:
        search = QdrantSearch(cfg)
    except Exception as exc:  # run without retrieval rather than not at all
        log.warning("vector store unavailable, continuing without retrieval: %s", exc)
        search = None
    return ZenithAgent(chat_model(cfg), fast, Retriever(fast, search, cfg), cfg)
