"""Runtime settings, read from environment variables (see .env.example)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    # Model providers
    groq_api_key: str | None = field(default_factory=lambda: os.getenv("GROQ_API_KEY"))
    nvidia_api_key: str | None = field(default_factory=lambda: os.getenv("NVIDIA_API_KEY"))
    chat_model: str = field(default_factory=lambda: os.getenv("ZENITH_CHAT_MODEL", "openai/gpt-oss-120b"))
    fast_model: str = field(default_factory=lambda: os.getenv("ZENITH_FAST_MODEL", "openai/gpt-oss-20b"))
    embed_model: str = field(default_factory=lambda: os.getenv("ZENITH_EMBED_MODEL", "nvidia/nv-embedqa-e5-v5"))
    embed_dim: int = field(default_factory=lambda: _int("ZENITH_EMBED_DIM", 1024))

    # Vector store
    qdrant_url: str = field(default_factory=lambda: os.getenv("QDRANT_URL", "http://localhost:6333"))
    qdrant_api_key: str | None = field(default_factory=lambda: os.getenv("QDRANT_API_KEY"))
    collection: str = field(default_factory=lambda: os.getenv("QDRANT_COLLECTION", "zenith-knowledge"))

    # Budgets (tokens are estimated at ~4 characters per token)
    max_history_tokens: int = field(default_factory=lambda: _int("ZENITH_MAX_HISTORY_TOKENS", 4400))
    max_context_tokens: int = field(default_factory=lambda: _int("ZENITH_MAX_CONTEXT_TOKENS", 5500))
    retrieve_k: int = 20
    retrieve_fetch_k: int = 40
    mmr_lambda: float = 0.35
    min_docs: int = 3

    # Ingestion
    chunk_size: int = field(default_factory=lambda: _int("ZENITH_CHUNK_SIZE", 1200))
    chunk_overlap: int = field(default_factory=lambda: _int("ZENITH_CHUNK_OVERLAP", 200))

    # API
    cors_origins: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            o.strip() for o in os.getenv("ZENITH_CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()
        )
    )
    store_profiles: bool = field(default_factory=lambda: os.getenv("ZENITH_STORE_PROFILES", "false").lower() == "true")


settings = Settings()
