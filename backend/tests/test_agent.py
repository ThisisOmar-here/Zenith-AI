from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from zenith.agent import FALLBACK_REPLY, ZenithAgent
from zenith.config import Settings
from zenith.retrieval import Retriever

from .conftest import EchoFast, FakeSearch, ScriptedChat


def make_agent(cfg, replies, docs=None):
    chat = ScriptedChat(replies=replies)
    fast = EchoFast()
    agent = ZenithAgent(chat, fast, Retriever(fast, FakeSearch(docs), cfg), cfg)
    return agent, chat


def test_direct_answer_without_tools(cfg):
    agent, chat = make_agent(cfg, [AIMessage(content="Hey! What's up? 😏")])
    reply = agent.answer("s1", "hi")
    assert reply.mode == "direct" and reply.text.startswith("Hey")
    assert len(chat.calls) == 1


def test_grounded_answer_runs_retrieval_once_and_cites(cfg, docs):
    tool_call = AIMessage(
        content="", tool_calls=[{"name": "retrieve_docs", "args": {"query": "procrastination first step"}, "id": "c1"}]
    )
    agent, chat = make_agent(cfg, [tool_call, AIMessage(content="Set a 5-minute timer. What's the task?")], docs)
    reply = agent.answer("s1", "I'm procrastinating everything")
    assert reply.mode == "grounded"
    assert reply.category == "Productivity & Habits"
    assert reply.sources[0]["source"] == "habits-guide"
    second_pass = chat.calls[1]
    tool_msgs = [m for m in second_pass if isinstance(m, ToolMessage)]
    assert len(tool_msgs) == 1 and "Technique" in tool_msgs[0].content


def test_extra_and_unknown_tool_calls_are_answered(cfg, docs):
    calls = [
        {"name": "retrieve_docs", "args": {"query": "a"}, "id": "c1"},
        {"name": "retrieve_docs", "args": {"query": "b"}, "id": "c2"},
        {"name": "retrieve_docs", "args": {"query": "c"}, "id": "c3"},
        {"name": "get_location", "args": {}, "id": "c4"},
    ]
    agent, chat = make_agent(cfg, [AIMessage(content="", tool_calls=calls), AIMessage(content="ok")], docs)
    agent.answer("s1", "help me plan my week")
    tool_msgs = [m for m in chat.calls[1] if isinstance(m, ToolMessage)]
    # every tool call id gets a reply, but only two searches run
    assert [m.tool_call_id for m in tool_msgs] == ["c1", "c2", "c3", "c4"]
    assert sum(m.content == "Skipped." for m in tool_msgs) == 2


def test_crisis_message_never_reaches_the_model(cfg):
    agent, chat = make_agent(cfg, [])
    reply = agent.answer("s1", "I want to end my life")
    assert reply.mode == "crisis"
    assert "findahelpline.com" in reply.text
    assert chat.calls == []


def test_history_is_kept_and_empty_replies_fall_back(cfg):
    agent, chat = make_agent(cfg, [AIMessage(content="First."), AIMessage(content="  ")])
    agent.answer("s1", "one")
    reply = agent.answer("s1", "two")
    assert reply.text == FALLBACK_REPLY
    humans = [m.content for m in chat.calls[1] if isinstance(m, HumanMessage)]
    assert humans == ["one", "two"]


def test_history_is_summarised_over_budget():
    cfg = Settings(max_history_tokens=50)
    agent, chat = make_agent(cfg, [AIMessage(content="a" * 200) for _ in range(4)])
    for i in range(4):
        agent.answer("s1", f"message {i} " + "x" * 200)
    convo = agent.conversation("s1")
    assert convo.summary.startswith("User is stressed")
    assert len(convo.messages) <= 6  # two kept turns plus the newest one


def test_profile_only_when_enabled(docs):
    agent, _ = make_agent(Settings(store_profiles=True), [AIMessage(content="ok")])
    agent.answer("s1", "I'm Sam, a student, and I'm stressed")
    assert agent.profiles["s1"]["name"] == "Sam"
    agent2, _ = make_agent(Settings(store_profiles=False), [AIMessage(content="ok")])
    agent2.answer("s1", "I'm Sam")
    assert agent2.profiles == {}
