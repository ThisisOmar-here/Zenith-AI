from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from zenith.agent import ZenithAgent
from zenith.api import app, get_agent
from zenith.retrieval import Retriever

from .conftest import EchoFast, FakeSearch, ScriptedChat


def client_with(replies, cfg):
    fast = EchoFast()
    agent = ZenithAgent(ScriptedChat(replies=replies), fast, Retriever(fast, FakeSearch(), cfg), cfg)
    app.dependency_overrides[get_agent] = lambda: agent
    return TestClient(app), agent


def test_health():
    assert TestClient(app).get("/api/health").json()["status"] == "ok"


def test_chat_round_trip_keeps_session(cfg):
    client, agent = client_with([AIMessage(content="Hi there."), AIMessage(content="Still here.")], cfg)
    first = client.post("/api/chat", json={"message": "hello"}).json()
    assert first["reply"] == "Hi there." and first["mode"] == "direct"
    second = client.post("/api/chat", json={"message": "again", "session_id": first["session_id"]}).json()
    assert second["session_id"] == first["session_id"]
    assert len(agent.conversation(first["session_id"]).messages) == 4
    assert client.delete(f"/api/session/{first['session_id']}").status_code == 204
    app.dependency_overrides.clear()


def test_chat_validates_input(cfg):
    client, _ = client_with([], cfg)
    assert client.post("/api/chat", json={"message": ""}).status_code == 422
    assert client.post("/api/chat", json={"message": "x" * 4001}).status_code == 422
    app.dependency_overrides.clear()
