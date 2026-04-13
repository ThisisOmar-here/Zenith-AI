"""
Emotion detection layer — three channels that give Zoe a read on the user's
emotional state beyond what they explicitly say.

Channel 1 — Text emotion: keyword + pattern heuristics (no model download required).
            Optional: swap with a fine-tuned BERT model for higher accuracy.

Channel 2 — Voice emotion: wraps SenseVoice (Alibaba, open-source) if installed.
            Falls back gracefully if not available.

Channel 3 — Behavioral signals: session time, message length, gap since last session.

Usage:
    from emotion_detector import detect_emotion
    signals = detect_emotion(text="I'm fine I guess", session=session)
    # signals.suggested_mode, signals.system_note
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List

logger = logging.getLogger(__name__)


# ── Emotion signal dataclass ───────────────────────────────────────────────

@dataclass
class EmotionSignals:
    text_emotion: str = "neutral"        # neutral | hopeful | anxious | depressed | hopeless | frustrated | content | masked_distress
    text_confidence: float = 0.5
    voice_emotion: Optional[str] = None  # populated if audio was provided
    voice_confidence: float = 0.0
    behavioral_flags: List[str] = field(default_factory=list)  # late_night | short_replies | long_gap_Xd
    suggested_mode: str = "SUPPORT"      # CASUAL | SUPPORT | ADVICE | URGENT
    system_note: Optional[str] = None    # injected silently into prompts_organizer


# ── Text emotion (heuristic, zero model dependencies) ─────────────────────

# Ordered from most severe to least — first match wins
_TEXT_PATTERNS = [
    ("hopeless", [
        "no point", "what's the point", "nothing matters", "can't go on",
        "no reason to live", "want to disappear", "don't want to be here",
        "hopeless", "worthless", "it never gets better",
    ]),
    ("depressed", [
        "can't get out of bed", "empty inside", "numb", "don't feel anything",
        "crying for no reason", "everything is heavy", "exhausted all the time",
        "can't enjoy", "lost interest", "depressed", "depression",
    ]),
    ("anxious", [
        "panic", "anxiety", "anxious", "worried", "overthinking", "can't stop thinking",
        "heart racing", "can't breathe", "nervous", "scared", "terrified", "dread",
        "what if", "worst case",
    ]),
    ("frustrated", [
        "so frustrated", "fed up", "done with", "can't take it", "sick of",
        "nothing works", "keeps happening", "why does this always", "so annoyed",
    ]),
    ("masked_distress", [
        "i'm fine", "im fine", "i'm okay", "im okay", "don't worry about me",
        "it's nothing", "never mind", "forget it", "just tired", "just stressed",
    ]),
    ("hopeful", [
        "feeling better", "making progress", "excited about", "looking forward",
        "things are improving", "getting better", "motivated", "grateful",
    ]),
    ("content", [
        "happy", "great", "wonderful", "love it", "doing well", "good day",
        "feeling good", "at peace",
    ]),
]


def _classify_text_emotion(text: str):
    """Returns (emotion_label, confidence) via keyword matching."""
    text_lower = text.lower()
    for label, patterns in _TEXT_PATTERNS:
        matches = sum(1 for p in patterns if p in text_lower)
        if matches > 0:
            confidence = min(0.5 + matches * 0.15, 0.95)
            return label, confidence
    return "neutral", 0.5


# ── Voice emotion via SenseVoice (optional, graceful fallback) ────────────

def _classify_voice_emotion(audio_bytes: bytes):
    """
    Attempt SenseVoice (Alibaba FunAudioLLM) emotion classification.
    Returns (emotion_label, confidence) or (None, 0) if not available.
    """
    try:
        from funasr import AutoModel  # type: ignore
        import tempfile, os

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            model = AutoModel(model="iic/SenseVoiceSmall", trust_remote_code=True)
            result = model.generate(input=tmp_path, language="auto", use_itn=True)
            if result and isinstance(result, list):
                r = result[0]
                emotion = r.get("emotion", "neutral")
                confidence = float(r.get("emotion_confidence", 0.7))
                return emotion, confidence
        finally:
            os.unlink(tmp_path)
    except ImportError:
        logger.debug("SenseVoice (funasr) not installed — skipping voice emotion detection")
    except Exception as exc:
        logger.warning("Voice emotion classification failed: %s", exc)
    return None, 0.0


# ── Behavioral signals ────────────────────────────────────────────────────

def _behavioral_flags(session) -> List[str]:
    """Derive behavioral flags from session metadata."""
    flags = []

    # Late-night session (11pm – 5am local UTC)
    hour = datetime.now(timezone.utc).hour
    if hour >= 23 or hour < 5:
        flags.append("late_night")

    # Short replies — last human message ≤ 5 words
    try:
        from langchain_core.messages import HumanMessage
        human_msgs = [m for m in session.conversation_history if isinstance(m, HumanMessage)]
        if human_msgs:
            last_words = len(human_msgs[-1].content.split())
            if last_words <= 5:
                flags.append("short_replies")
    except Exception:
        pass

    # Long gap since last session (3+ days)
    try:
        last_active = datetime.fromisoformat(session.last_active.replace("Z", "+00:00"))
        days_gap = (datetime.now(timezone.utc) - last_active).days
        if days_gap >= 3:
            flags.append(f"long_gap_{days_gap}d")
    except Exception:
        pass

    return flags


# ── Mode inference ────────────────────────────────────────────────────────

def _infer_mode(text_emotion: str, voice_emotion: Optional[str], flags: List[str]) -> str:
    if text_emotion in ("hopeless", "depressed"):
        return "SUPPORT"
    if voice_emotion in ("sad", "fearful", "crying"):
        return "SUPPORT"
    if text_emotion == "masked_distress" or "late_night" in flags:
        return "SUPPORT"
    if text_emotion == "frustrated":
        return "ADVICE"
    if text_emotion in ("content", "hopeful") and not flags:
        return "CASUAL"
    return "SUPPORT"


def _build_system_note(signals: EmotionSignals) -> Optional[str]:
    """Build a silent note to inject into prompts_organizer."""
    parts = []
    if signals.text_emotion != "neutral" and signals.text_confidence >= 0.6:
        parts.append(f"Text emotion: {signals.text_emotion} ({signals.text_confidence:.0%} confidence)")
    if signals.voice_emotion:
        parts.append(f"Voice emotion: {signals.voice_emotion} ({signals.voice_confidence:.0%} confidence)")
    if signals.behavioral_flags:
        parts.append(f"Behavioral: {', '.join(signals.behavioral_flags)}")

    if not parts:
        return None

    guidance_map = {
        "hopeless": "User may be in a much darker place than their words suggest. Mirror first. Do NOT jump to advice or positivity.",
        "depressed": "User sounds flat/withdrawn. Be warm and slow. No high-energy responses.",
        "masked_distress": "User appears to be minimizing their pain ('I'm fine'). Gently probe with one soft question.",
        "anxious": "User is activated. Ground first (acknowledge the feeling), then advise.",
        "frustrated": "Validate the frustration explicitly before offering any direction.",
    }
    guidance = guidance_map.get(signals.text_emotion, "")
    if not guidance and "late_night" in signals.behavioral_flags:
        guidance = "Late-night session — user may be struggling to sleep or emotionally raw. Be especially gentle."

    note = "[SYSTEM NOTE — DO NOT DISPLAY TO USER]\n" + "\n".join(parts)
    if guidance:
        note += f"\n→ {guidance}"
    return note


# ── Public API ────────────────────────────────────────────────────────────

def detect_emotion(text: str, session, audio_bytes: Optional[bytes] = None) -> EmotionSignals:
    """
    Run all available emotion detection channels and return consolidated signals.
    """
    text_emotion, text_confidence = _classify_text_emotion(text)

    voice_emotion, voice_confidence = None, 0.0
    if audio_bytes:
        voice_emotion, voice_confidence = _classify_voice_emotion(audio_bytes)

    flags = _behavioral_flags(session)
    mode = _infer_mode(text_emotion, voice_emotion, flags)

    signals = EmotionSignals(
        text_emotion=text_emotion,
        text_confidence=text_confidence,
        voice_emotion=voice_emotion,
        voice_confidence=voice_confidence,
        behavioral_flags=flags,
        suggested_mode=mode,
    )
    signals.system_note = _build_system_note(signals)
    return signals
