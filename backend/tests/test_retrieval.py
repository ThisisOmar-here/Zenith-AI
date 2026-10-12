from langchain_core.documents import Document

from zenith.retrieval import HYDE_SOURCE, Retriever, build_context, dedupe, match_category, query_variants

from .conftest import EchoFast, FakeSearch


def test_match_category_is_forgiving():
    assert match_category("productivity & habits") == "Productivity & Habits"
    assert match_category('"Well-being & Happiness".') == "Well-being & Happiness"
    assert match_category("Resilience") == "Resilience & Life Perspective"
    assert match_category("None") is None
    assert match_category("cooking") is None


def test_query_variants_skip_duplicates():
    assert query_variants("sleep", "") == ["sleep"]
    assert query_variants("sleep", "Sleep") == ["sleep"]
    assert query_variants("sleep", "Keep a fixed wake time.\nMore text") == ["sleep", "Keep a fixed wake time."]


def test_dedupe_and_budget():
    d = Document(page_content="x" * 400, metadata={"source": "a", "page": 1, "chunk": 0})
    assert len(dedupe([d, d])) == 1
    many = [Document(page_content="x" * 400, metadata={"source": "a", "page": i}) for i in range(10)]
    context = build_context(many, token_budget=300)
    assert context.count("[a p.") == 2  # each block is ~103 tokens


def test_pipeline_searches_routed_category(cfg, docs):
    search = FakeSearch(docs)
    result = Retriever(EchoFast(), search, cfg).run("I keep procrastinating")
    assert result.category == "Productivity & Habits"
    assert {c for _, c in search.queries} == {"Productivity & Habits"}
    assert len(search.queries) == 2  # the query and the HyDE lead
    assert result.sources and result.sources[0]["source"] == "habits-guide"
    assert "Technique 1" in result.context


def test_pipeline_falls_back_to_hyde_without_a_store(cfg):
    result = Retriever(EchoFast(), None, cfg).run("I keep procrastinating")
    assert "five minute timer" in result.context
    assert result.sources == []  # generated background is never shown as a source
    assert HYDE_SOURCE in result.context
