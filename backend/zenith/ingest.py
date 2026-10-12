"""Index your own documents into Qdrant.

    python -m zenith.ingest ../knowledge

Each top-level folder is a category, named like the ones in retrieval.CATEGORIES
(for example "knowledge/Productivity & Habits/"). Supports .pdf, .md and .txt.
Chunk ids are deterministic, so re-running updates chunks instead of duplicating them.
Only index material you have the right to use.
"""

from __future__ import annotations

import argparse
import logging
import uuid
from pathlib import Path
from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import Settings
from .config import settings as default_settings
from .retrieval import CATEGORIES, match_category

log = logging.getLogger(__name__)
SUPPORTED = {".pdf", ".md", ".txt"}


def load_file(path: Path) -> list[tuple[str, int]]:
    """Return (text, page_number) pairs for one file."""
    if path.suffix.lower() == ".pdf":
        import pymupdf

        with pymupdf.open(path) as pdf:
            return [(page.get_text(), i + 1) for i, page in enumerate(pdf)]
    return [(path.read_text(encoding="utf-8"), 1)]


def chunk_folder(root: Path, cfg: Settings = default_settings) -> tuple[list[Document], list[str]]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=cfg.chunk_size,
        chunk_overlap=cfg.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    docs: list[Document] = []
    ids: list[str] = []
    for path in sorted(root.rglob("*")):
        if path.suffix.lower() not in SUPPORTED or path.name.lower() == "readme.md":
            continue
        top = path.relative_to(root).parts[0]
        category = match_category(top)
        if category is None:
            log.warning("skipping %s: folder '%s' is not one of %s", path, top, CATEGORIES)
            continue
        for text, page in load_file(path):
            for i, chunk in enumerate(splitter.split_text(text)):
                if not chunk.strip():
                    continue
                key = f"{path.relative_to(root)}|{page}|{i}"
                ids.append(str(uuid.uuid5(uuid.NAMESPACE_URL, key)))
                docs.append(
                    Document(
                        page_content=chunk,
                        metadata={"source": path.stem, "page": page, "chunk": i, "category": category.lower()},
                    )
                )
    return docs, ids


def ingest(root: Path, cfg: Settings = default_settings, client: Any = None, embeddings: Any = None) -> int:
    from langchain_qdrant import QdrantVectorStore
    from qdrant_client import models

    from .retrieval import nvidia_embeddings, qdrant_client

    docs, ids = chunk_folder(root, cfg)
    if not docs:
        log.warning("nothing to index in %s", root)
        return 0

    client = client or qdrant_client(cfg)
    embeddings = embeddings or nvidia_embeddings(cfg)
    if not client.collection_exists(cfg.collection):
        client.create_collection(
            cfg.collection,
            vectors_config=models.VectorParams(size=cfg.embed_dim, distance=models.Distance.COSINE),
        )
        client.create_payload_index(cfg.collection, field_name="metadata.category", field_schema="keyword")

    store = QdrantVectorStore(client=client, collection_name=cfg.collection, embedding=embeddings)
    store.add_documents(docs, ids=ids, batch_size=50)
    return len(docs)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Index documents into the Zenith knowledge base.")
    parser.add_argument("folder", type=Path, help="folder whose sub-folders are categories")
    args = parser.parse_args()
    count = ingest(args.folder)
    print(f"Indexed {count} chunks from {args.folder}")


if __name__ == "__main__":
    main()
