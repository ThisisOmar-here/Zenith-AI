import pytest

from zenith import safety


@pytest.mark.parametrize(
    "message",
    [
        "I want to kill myself",
        "sometimes i think everyone would be better off without me",
        "I've been self-harming again",
        "I don't want to wake up tomorrow",
        "I’m thinking about suicide",
        "بدي اموت",
        "أفكر في الانتحار",
        "بدي أؤذي نفسي",
    ],
)
def test_crisis_messages_are_caught(message):
    assert safety.screen(message).crisis


@pytest.mark.parametrize(
    "message",
    [
        "I'm procrastinating everything",
        "this exam is killing me lol",
        "how do I stop overthinking at night?",
        "my phone battery died",
        "أنا متوتر من الامتحان",
    ],
)
def test_everyday_messages_pass(message):
    assert not safety.screen(message).crisis


def test_crisis_reply_matches_language():
    assert "findahelpline.com" in safety.crisis_reply("I want to die")
    assert "رقم الطوارئ" in safety.crisis_reply("بدي اموت")
