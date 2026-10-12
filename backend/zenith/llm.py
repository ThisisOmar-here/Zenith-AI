"""Model factories. Swap providers here without touching the pipeline."""

from __future__ import annotations

from langchain_core.language_models import BaseChatModel

from .config import Settings
from .config import settings as default_settings


def chat_model(cfg: Settings = default_settings) -> BaseChatModel:
    """The main conversational model (tool calling enabled)."""
    from langchain_groq import ChatGroq

    return ChatGroq(model=cfg.chat_model, temperature=0.8, max_tokens=2048, api_key=cfg.groq_api_key)


def fast_model(cfg: Settings = default_settings) -> BaseChatModel:
    """A small, cheap model for routing, HyDE and summaries."""
    from langchain_groq import ChatGroq

    return ChatGroq(model=cfg.fast_model, temperature=0, max_tokens=600, api_key=cfg.groq_api_key)
