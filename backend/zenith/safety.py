"""Crisis screening that runs before any model call.

This is a deterministic first line of defence: if a message matches a crisis
pattern, Zenith skips the model entirely and returns a fixed, reviewed reply
that points to real help. The system prompt adds a second layer for anything
the patterns miss. Neither replaces professional care.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

# English patterns (matched on a normalised, lower-case message)
_EN = [
    r"\bkill(ing)? my ?self\b",
    r"\bsuicid(e|al)\b",
    r"\bend(ing)? (my|it all|my own) li(fe|ves)\b",
    r"\bend it all\b",
    r"\b(want|wanna|going) to die\b",
    r"\bwish i (was|were) dead\b",
    r"\bbetter off (dead|without me)\b",
    r"\bno (reason|point) (to|in) (live|living|go on)\b",
    r"\bdon'?t want to (live|be alive|wake up)\b",
    r"\bself[- ]?harm(ing)?\b",
    r"\b(hurt|cut|harm)(ing)? my ?self\b",
    r"\boverdos(e|ing)\b",
    r"\b(kill|hurt) (him|her|them|someone|somebody)\b",
    r"\b(he|she|they) (hits|beats|is hurting) me\b",
    r"\bnot safe at home\b",
]

# Arabic patterns (MSA and Levantine/Gulf phrasing), matched after removing diacritics
_AR = [
    r"انتحار",
    r"انتحر",
    r"اقتل نفسي",
    r"(بدي|ابي|أبي|اريد|أريد|بغيت) (اموت|أموت)",
    r"(ما بدي|ما ابي|ما أبي|لا اريد|لا أريد) (اعيش|أعيش)",
    r"(اذي|أذي|اؤذي|أؤذي) نفسي",
    r"(اجرح|أجرح) نفسي",
]

_PATTERNS = [re.compile(p) for p in _EN + _AR]
_ARABIC = re.compile(r"[؀-ۿ]")


def _normalise(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    text = text.replace("’", "'").replace("‘", "'")
    # strip Arabic diacritics (tashkeel) and tatweel
    text = re.sub(r"[ً-ْـ]", "", text)
    return re.sub(r"\s+", " ", text)


@dataclass(frozen=True)
class Screen:
    crisis: bool
    matched: str | None = None


def screen(message: str) -> Screen:
    """Return whether ``message`` matches a crisis pattern."""
    text = _normalise(message)
    for pattern in _PATTERNS:
        m = pattern.search(text)
        if m:
            return Screen(crisis=True, matched=m.group(0))
    return Screen(crisis=False)


CRISIS_REPLY_EN = (
    "I'm really glad you told me, and I'm taking it seriously. You deserve support from a real person right now.\n\n"
    "If you might act on these thoughts or you're in danger, please call your local emergency number now.\n\n"
    "You can also talk to a trained listener for free and in confidence: find a crisis line in your country at "
    "findahelpline.com.\n\n"
    "Is there someone near you, a friend or family member, you could reach out to while we talk?"
)

CRISIS_REPLY_AR = (
    "شكراً لأنك أخبرتني، وأنا آخذ كلامك بجدية. تستحق أن يدعمك شخص حقيقي الآن.\n\n"
    "إذا كنت في خطر أو قد تؤذي نفسك، اتصل برقم الطوارئ في بلدك فوراً.\n\n"
    "ويمكنك التحدث مجاناً وبسرية مع مختص: ابحث عن خط مساعدة في بلدك على findahelpline.com.\n\n"
    "هل يوجد شخص قريب منك، صديق أو أحد من العائلة، يمكنك التواصل معه الآن؟"
)


def crisis_reply(message: str) -> str:
    """The fixed reply for a crisis message, in Arabic when the user wrote in Arabic."""
    return CRISIS_REPLY_AR if _ARABIC.search(message) else CRISIS_REPLY_EN
