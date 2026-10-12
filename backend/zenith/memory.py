"""Per-session conversation memory with rolling summarisation."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from . import prompts
from .retrieval import approx_tokens

log = logging.getLogger(__name__)


@dataclass
class Conversation:
    messages: list[BaseMessage] = field(default_factory=list)
    summary: str = ""

    def add_turn(self, user: str, assistant: str) -> None:
        self.messages.extend([HumanMessage(content=user), AIMessage(content=assistant)])

    def tokens(self) -> int:
        return approx_tokens(self.summary) + sum(approx_tokens(str(m.content)) for m in self.messages)

    def context_messages(self) -> list[BaseMessage]:
        """Messages to send to the model: an optional summary note, then recent turns."""
        out: list[BaseMessage] = []
        if self.summary:
            out.append(SystemMessage(content=f"Notes from earlier in this conversation:\n{self.summary}"))
        out.extend(self.messages)
        return out

    def compress(self, llm: BaseChatModel, budget: int, keep_turns: int = 2) -> bool:
        """Summarise older turns once the history exceeds ``budget`` tokens.

        The last ``keep_turns`` exchanges stay verbatim. Returns True if it compressed.
        """
        if self.tokens() <= budget or len(self.messages) <= keep_turns * 2:
            return False
        older, recent = self.messages[: -keep_turns * 2], self.messages[-keep_turns * 2 :]
        transcript = "\n".join(f"{'User' if isinstance(m, HumanMessage) else 'Zoe'}: {m.content}" for m in older)
        if self.summary:
            transcript = f"Earlier notes: {self.summary}\n{transcript}"
        try:
            resp = llm.invoke([HumanMessage(content=prompts.load("summary").format(content=transcript))])
        except Exception as exc:
            log.warning("history summary failed: %s", exc)
            return False
        self.summary = str(resp.content).strip()
        self.messages = recent
        return True
