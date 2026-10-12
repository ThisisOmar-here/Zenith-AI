"""Retrieval pipeline: category routing, HyDE expansion, filtered MMR search, context packing.

Flow for one query:
1. A small, fast model routes the query to one knowledge category.
2. A hypothetical answer (HyDE) is generated to widen the semantic search.
3. The original query and the HyDE text are both searched with MMR,
   filtered to the routed category, and the results de-duplicated.
4. Chunks are packed into the prompt until the token budget is spent.
If routing fails or the search comes back thin, the HyDE text itself is
used as a fallback context block, so the model is never handed nothing.
"""

from __future__ import annotations

import logging
import math
from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Any, Protocol

from langchain_core.documents import Document
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from . import prompts
from .config import Settings
from .config import settings as default_settings

log = logging.getLogger(__name__)

CATEGORIES = [
    "Emotional & Mental Health",
    "Emotional Intelligence & Social Skills",
    "Practical Life Skills",
    "Productivity & Habits",
    "Resilience & Life Perspective",
    "Well-being & Happiness",
]

APPROX_CHARS_PER_TOKEN = 4
HYDE_SOURCE = "generated-background"


def approx_tokens(text: str) -> int:
    return math.ceil(len(text) / APPROX_CHARS_PER_TOKEN)


def match_category(raw: str) -> str | None:
    """Map a model's free-text label onto one of CATEGORIES (or None)."""
    label = (raw or "").strip().strip(".").strip('"').lower()
    if not label or label in {"none", "general", "unknown"}:
        return None
    for c in CATEGORIES:
        if label == c.lower():
            return c
    for c in CATEGORIES:
        if c.lower() in label or label in c.lower():
            return c
    return None


def query_variants(query: str, hyde_text: str) -> list[str]:
    """The search strings for one query: the query itself plus the HyDE lead paragraph."""
    variants = [query.strip()]
    lead = hyde_text.strip().split("\n", 1)[0][:500].strip() if hyde_text else ""
    if lead and lead.lower() != query.strip().lower():
        variants.append(lead)
    return variants


def dedupe(docs: Iterable[Document]) -> list[Document]:
    seen: set[tuple[Any, ...]] = set()
    unique = []
    for d in docs:
        key = (d.metadata.get("source"), d.metadata.get("page"), d.metadata.get("chunk"), d.page_content[:60])
        if key not in seen:
            seen.add(key)
            unique.append(d)
    return unique


def build_context(docs: list[Document], token_budget: int) -> str:
    """Pack documents into one context string without exceeding ``token_budget``."""
    blocks: list[str] = []
    used = 0
    for d in docs:
        header = f"[{d.metadata.get('source', 'unknown')} p.{d.metadata.get('page', '-')}]"
        block = f"{header}\n{d.page_content.strip()}"
        cost = approx_tokens(block)
        if used + cost > token_budget:
            break
        blocks.append(block)
        used += cost
    return "\n\n---\n\n".join(blocks)


class VectorSearch(Protocol):
    def search(self, query: str, category: str | None) -> list[Document]: ...


@dataclass
class RetrievalResult:
    context: str
    sources: list[dict[str, Any]] = field(default_factory=list)
    category: str | None = None

    @property
    def empty(self) -> bool:
        return not self.context


class Retriever:
    """Runs the full retrieval pipeline for one query."""

    def __init__(self, fast_llm: BaseChatModel, search: VectorSearch | None, cfg: Settings = default_settings):
        self.fast_llm = fast_llm
        self.search = search
        self.cfg = cfg

    def classify(self, query: str) -> str | None:
        system = prompts.load("classify").format(categories="\n".join(CATEGORIES))
        try:
            resp = self.fast_llm.invoke([SystemMessage(content=system), HumanMessage(content=query)])
            return match_category(str(resp.content))
        except Exception as exc:  # routing is best-effort
            log.warning("category routing failed: %s", exc)
            return None

    def hyde(self, query: str) -> str:
        try:
            resp = self.fast_llm.invoke([HumanMessage(content=prompts.load("hyde").format(user_query=query))])
            return str(resp.content).strip()[:1800]
        except Exception as exc:
            log.warning("HyDE generation failed: %s", exc)
            return ""

    def run(self, query: str) -> RetrievalResult:
        category = self.classify(query)
        hyde_text = self.hyde(query)

        docs: list[Document] = []
        if self.search is not None and category is not None:
            for variant in query_variants(query, hyde_text):
                try:
                    docs.extend(self.search.search(variant, category))
                except Exception as exc:
                    log.warning("vector search failed: %s", exc)
            docs = dedupe(docs)[: self.cfg.retrieve_k]

        if len(docs) < self.cfg.min_docs and hyde_text:
            docs.append(Document(page_content=hyde_text, metadata={"source": HYDE_SOURCE, "category": category}))

        context = build_context(docs, self.cfg.max_context_tokens)
        sources = [
            {"source": d.metadata.get("source"), "page": d.metadata.get("page"), "category": d.metadata.get("category")}
            for d in docs
            if d.metadata.get("source") != HYDE_SOURCE
        ]
        return RetrievalResult(context=context, sources=sources, category=category)


class QdrantSearch:
    """MMR search over a Qdrant collection, filtered by the ``category`` payload field."""

    def __init__(self, cfg: Settings = default_settings, client: Any = None, embeddings: Any = None):
        from langchain_qdrant import QdrantVectorStore

        self.cfg = cfg
        self.client = client or qdrant_client(cfg)
        self.embeddings = embeddings or nvidia_embeddings(cfg)
        self.store = QdrantVectorStore(client=self.client, collection_name=cfg.collection, embedding=self.embeddings)

    def search(self, query: str, category: str | None) -> list[Document]:
        from qdrant_client import models

        flt = None
        if category:
            flt = models.Filter(
                must=[models.FieldCondition(key="metadata.category", match=models.MatchValue(value=category.lower()))]
            )
        return self.store.max_marginal_relevance_search(
            query,
            k=self.cfg.retrieve_k,
            fetch_k=self.cfg.retrieve_fetch_k,
            lambda_mult=self.cfg.mmr_lambda,
            filter=flt,
        )


def qdrant_client(cfg: Settings = default_settings) -> Any:
    from qdrant_client import QdrantClient

    return QdrantClient(url=cfg.qdrant_url, api_key=cfg.qdrant_api_key)


def nvidia_embeddings(cfg: Settings = default_settings) -> Any:
    from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings

    return NVIDIAEmbeddings(model=cfg.embed_model, api_key=cfg.nvidia_api_key, truncate="END")
