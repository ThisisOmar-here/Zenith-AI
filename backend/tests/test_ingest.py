from zenith.config import Settings
from zenith.ingest import chunk_folder


def test_chunk_folder_uses_category_folders(tmp_path):
    (tmp_path / "Productivity & Habits").mkdir()
    (tmp_path / "Productivity & Habits" / "start.md").write_text("Start small. " * 300)
    (tmp_path / "Random").mkdir()
    (tmp_path / "Random" / "x.md").write_text("ignored")
    (tmp_path / "README.md").write_text("ignored")
    docs, ids = chunk_folder(tmp_path, Settings(chunk_size=500, chunk_overlap=50))
    assert docs and len(docs) == len(ids)
    assert {d.metadata["category"] for d in docs} == {"productivity & habits"}
    # ids are stable between runs
    assert chunk_folder(tmp_path, Settings(chunk_size=500, chunk_overlap=50))[1] == ids


def test_ingest_then_filtered_search_in_memory(tmp_path):
    """End to end against an in-memory Qdrant with deterministic fake embeddings."""
    from langchain_core.embeddings import DeterministicFakeEmbedding
    from qdrant_client import QdrantClient

    from zenith.ingest import ingest
    from zenith.retrieval import QdrantSearch

    for folder, text in [
        ("Productivity & Habits", "Use a five minute timer to start. "),
        ("Well-being & Happiness", "Write three good things each night. "),
    ]:
        (tmp_path / folder).mkdir()
        (tmp_path / folder / "note.md").write_text(text * 40)

    cfg = Settings(collection="test", embed_dim=64, chunk_size=300, chunk_overlap=0)
    client, emb = QdrantClient(":memory:"), DeterministicFakeEmbedding(size=64)
    assert ingest(tmp_path, cfg, client=client, embeddings=emb) > 0
    again = ingest(tmp_path, cfg, client=client, embeddings=emb)
    assert client.count("test").count == again  # re-running does not duplicate chunks

    search = QdrantSearch(cfg, client=client, embeddings=emb)
    hits = search.search("how do I start", "Productivity & Habits")
    assert hits and {d.metadata["category"] for d in hits} == {"productivity & habits"}
