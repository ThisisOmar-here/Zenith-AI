"""
memory_import.py — Import and parse conversation history from AI platform exports.

Supported formats:
  - ChatGPT  (conversations.json from OpenAI Settings → Export Data)
  - Claude   (conversations JSON from Anthropic Settings → Export Data)
  - Gemini   (Google Takeout → Gemini Apps Activity JSON)
  - Plain text (copied/pasted conversation as raw text)

Usage:
    from memory_import import parse_import, extract_profile_from_import
    messages, platform = parse_import(raw_json_data)
    profile = extract_profile_from_import(messages, llm, platform)
"""

from __future__ import annotations

import json
import re
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt used by the LLM to analyse imported conversations
# ---------------------------------------------------------------------------

IMPORT_ANALYSIS_PROMPT = """You are a compassionate mental health assistant analysing a user's imported conversation history with another AI.
Your goal is to build a rich psychological profile so that their new mental‑health companion (Zoe) can provide deeply personalised support from day one, without the user having to repeat their story.

Extract ONLY what is explicitly stated or very strongly implied. Do not guess.

Return ONLY valid JSON (no prose, no code fences) with these exact keys:

{{
  "name": string or null,
  "age": number or null,
  "role": string or null,
  "issues": ["short lowercase label", ...],          // max 12 — recurring problems / concerns
  "feelings": ["emotion word", ...],                  // max 10 — recurring or recent emotions
  "notes": "<=80 word neutral context summary",
  "triggers": ["trigger label", ...],                 // max 8 — identified emotional / situational triggers
  "coping_strategies_tried": ["strategy", ...],       // max 8 — things the user has already attempted
  "strengths": ["strength", ...],                     // max 6 — resilience factors / personal assets
  "cognitive_patterns": ["pattern", ...],             // max 6 — e.g. catastrophising, all‑or‑nothing, people‑pleasing
  "emotional_trajectory": "improving" | "declining" | "stable" | "unknown",
  "support_level": "high" | "medium" | "low" | "unknown",   // perceived social support network
  "key_themes": ["theme", ...],                       // max 5 — dominant recurring life themes
  "tone": string or null,                             // e.g. "casual", "clinical", "emotional"
  "writing": string or null,                          // e.g. "brief", "detailed", "stream-of-consciousness"
  "other": string or null                             // any therapist‑relevant insight not captured above
}}

Conversation transcript:
<<<
{transcript}
>>>

JSON:
"""

# ---------------------------------------------------------------------------
# Format detection
# ---------------------------------------------------------------------------

def detect_format(data: Any) -> str:
    """
    Detect the source platform of the imported data.
    Returns one of: 'chatgpt', 'claude', 'gemini', 'unknown'.
    """
    if isinstance(data, dict) and "conversations" in data:
        return detect_format(data["conversations"])

    if not isinstance(data, list) or len(data) == 0:
        return "unknown"

    first = data[0]
    if not isinstance(first, dict):
        return "unknown"

    # ChatGPT: top-level conversations have a 'mapping' dict of nodes
    if "mapping" in first and isinstance(first["mapping"], dict):
        return "chatgpt"

    # Claude: conversations contain a 'chat_messages' list
    if "chat_messages" in first and isinstance(first["chat_messages"], list):
        return "claude"

    # Gemini: conversations contain a 'messages' list whose items have an 'author' key
    if "messages" in first and isinstance(first["messages"], list):
        msgs = first["messages"]
        if msgs and isinstance(msgs[0], dict) and "author" in msgs[0]:
            return "gemini"
        # Alternative Gemini Takeout shape
        if msgs and isinstance(msgs[0], dict) and "role" in msgs[0]:
            return "gemini"

    return "unknown"


# ---------------------------------------------------------------------------
# Per-platform parsers
# ---------------------------------------------------------------------------

def _ts_from_epoch(epoch: Optional[float]) -> str:
    if epoch is None:
        return ""
    try:
        return datetime.utcfromtimestamp(float(epoch)).isoformat() + "Z"
    except Exception:
        return ""


def parse_chatgpt_export(data: List[Dict]) -> List[Dict[str, str]]:
    """
    Parse OpenAI ChatGPT export (conversations.json).

    Each conversation is a dict with a 'mapping' field — a flat dict of
    tree nodes keyed by UUID. We extract user + assistant messages and
    sort them by create_time.
    """
    messages: List[Dict[str, str]] = []

    for convo in data:
        if not isinstance(convo, dict):
            continue
        mapping = convo.get("mapping") or {}
        nodes: List[Dict] = []

        for node_data in mapping.values():
            if not isinstance(node_data, dict):
                continue
            msg = node_data.get("message")
            if not msg or not isinstance(msg, dict):
                continue
            role = (msg.get("author") or {}).get("role", "")
            if role not in ("user", "assistant"):
                continue
            content_obj = msg.get("content") or {}
            parts = content_obj.get("parts") or []
            text = " ".join(str(p) for p in parts if isinstance(p, str) and p.strip())
            if not text.strip():
                continue
            nodes.append({
                "role": role,
                "content": text.strip(),
                "timestamp": _ts_from_epoch(msg.get("create_time")),
            })

        nodes.sort(key=lambda n: n["timestamp"])
        messages.extend(nodes)

    return messages


def parse_claude_export(data: List[Dict]) -> List[Dict[str, str]]:
    """
    Parse Anthropic Claude export (array of conversations).

    Each conversation has a 'chat_messages' list with 'sender' and 'text' fields.
    """
    messages: List[Dict[str, str]] = []

    for convo in data:
        if not isinstance(convo, dict):
            continue
        for msg in convo.get("chat_messages") or []:
            if not isinstance(msg, dict):
                continue
            sender = msg.get("sender", "")
            role = "user" if sender == "human" else "assistant"
            text = (msg.get("text") or "").strip()
            if not text:
                continue
            messages.append({
                "role": role,
                "content": text,
                "timestamp": msg.get("created_at", ""),
            })

    return messages


def parse_gemini_export(data: List[Dict]) -> List[Dict[str, str]]:
    """
    Parse Google Takeout / Gemini export.

    Handles two common shapes:
      1. conversations[].messages[].{author, content/parts, createTime}
      2. conversations[].messages[].{role, content/parts, timestamp}
    """
    messages: List[Dict[str, str]] = []

    for convo in data:
        if not isinstance(convo, dict):
            continue
        for msg in convo.get("messages") or []:
            if not isinstance(msg, dict):
                continue

            # Normalise role
            author = msg.get("author") or msg.get("role") or ""
            role = "user" if str(author).lower() in ("user", "human") else "assistant"

            # Extract text — might be a string, a list of parts, or nested
            raw_content = msg.get("content") or msg.get("parts") or ""
            if isinstance(raw_content, str):
                text = raw_content.strip()
            elif isinstance(raw_content, list):
                text = " ".join(
                    p.get("text", "") if isinstance(p, dict) else str(p)
                    for p in raw_content
                ).strip()
            else:
                text = ""

            if not text:
                continue

            ts = (
                msg.get("createTime")
                or msg.get("timestamp")
                or msg.get("create_time")
                or ""
            )
            messages.append({"role": role, "content": text, "timestamp": str(ts)})

    return messages


def _generic_parse(data: Any) -> List[Dict[str, str]]:
    """
    Fallback: attempt to extract messages from an unrecognised structure by
    looking for common field names.
    """
    messages: List[Dict[str, str]] = []

    if not isinstance(data, list):
        return messages

    for item in data:
        if not isinstance(item, dict):
            continue
        role = (
            item.get("role")
            or item.get("sender")
            or item.get("author")
            or ""
        )
        content = (
            item.get("content")
            or item.get("text")
            or item.get("message")
            or ""
        )
        if isinstance(content, list):
            content = " ".join(
                p.get("text", "") if isinstance(p, dict) else str(p) for p in content
            )
        content = str(content).strip()
        if not role or not content:
            continue
        normalised_role = "user" if str(role).lower() in ("user", "human") else "assistant"
        messages.append({
            "role": normalised_role,
            "content": content,
            "timestamp": item.get("timestamp") or item.get("created_at") or "",
        })

    return messages


# ---------------------------------------------------------------------------
# Plain-text parser (pasted conversations)
# ---------------------------------------------------------------------------

_TEXT_ROLE_RE = re.compile(
    r"^\s*(?P<role>you|user|human|me|i|assistant|ai|chatgpt|claude|gemini|bard|bot)\s*[:\-]\s*",
    re.IGNORECASE,
)


def parse_plain_text(text: str) -> List[Dict[str, str]]:
    """
    Parse a plain-text pasted conversation.

    Recognises common role prefixes such as "You:", "User:", "Assistant:",
    "ChatGPT:", "Claude:", "Gemini:", etc.
    """
    messages: List[Dict[str, str]] = []
    current_role: Optional[str] = None
    current_lines: List[str] = []

    user_roles = {"you", "user", "human", "me", "i"}

    def flush():
        if current_role and current_lines:
            content = " ".join(current_lines).strip()
            if content:
                messages.append({"role": current_role, "content": content, "timestamp": ""})

    for line in text.splitlines():
        m = _TEXT_ROLE_RE.match(line)
        if m:
            flush()
            current_lines = []
            detected = m.group("role").lower()
            current_role = "user" if detected in user_roles else "assistant"
            remainder = line[m.end():].strip()
            if remainder:
                current_lines.append(remainder)
        else:
            stripped = line.strip()
            if stripped:
                current_lines.append(stripped)

    flush()
    return messages


# ---------------------------------------------------------------------------
# Unified entry point
# ---------------------------------------------------------------------------

def parse_import(data: Any) -> Tuple[List[Dict[str, str]], str]:
    """
    Auto-detect format and parse import data.

    Parameters
    ----------
    data : Any
        Parsed JSON (list or dict) from the platform export,
        OR a raw string (plain-text pasted conversation).

    Returns
    -------
    (messages, platform)
        messages : list of {'role', 'content', 'timestamp'} dicts
        platform : detected platform name string
    """
    # Handle plain-text paste
    if isinstance(data, str):
        return parse_plain_text(data), "Plain Text"

    # Unwrap a dict wrapper e.g. {"conversations": [...]}
    if isinstance(data, dict) and "conversations" in data:
        data = data["conversations"]

    fmt = detect_format(data)
    logger.info("Detected import format: %s", fmt)

    if fmt == "chatgpt":
        return parse_chatgpt_export(data), "ChatGPT"
    elif fmt == "claude":
        return parse_claude_export(data), "Claude"
    elif fmt == "gemini":
        return parse_gemini_export(data), "Gemini"
    else:
        return _generic_parse(data), "Unknown"


# ---------------------------------------------------------------------------
# LLM-powered profile extraction
# ---------------------------------------------------------------------------

def _sample_messages(messages: List[Dict[str, str]], max_chars: int = 14000) -> str:
    """
    Build a representative transcript sample that fits within max_chars.

    Strategy: take the first 20 %, a strided middle sample, and the last 30 %.
    This captures early context (who the user is) and recent context (current state).
    """
    if not messages:
        return ""

    n = len(messages)
    if n <= 80:
        sample = messages
    else:
        head = messages[: max(1, int(n * 0.20))]
        tail = messages[int(n * 0.70):]
        mid_start = int(n * 0.30)
        mid_end = int(n * 0.70)
        stride = max(1, (mid_end - mid_start) // 25)
        middle = messages[mid_start:mid_end:stride]
        sample = head + middle + tail

    lines: List[str] = []
    total = 0
    for msg in sample:
        label = "User" if msg["role"] == "user" else "Assistant"
        line = f"{label}: {msg['content'][:600]}"
        if total + len(line) > max_chars:
            break
        lines.append(line)
        total += len(line)

    return "\n\n".join(lines)


def extract_profile_from_import(
    messages: List[Dict[str, str]],
    llm,
    source_platform: str = "Unknown",
) -> Dict[str, Any]:
    """
    Use the LLM to extract a comprehensive user profile from imported messages.

    Parameters
    ----------
    messages       : list of parsed message dicts
    llm            : LangChain-compatible LLM with .invoke()
    source_platform: human-readable name of the source ('ChatGPT', 'Claude', etc.)

    Returns
    -------
    Validated profile dict ready to be merged into user_profile.json
    """
    if not messages:
        return {}

    transcript = _sample_messages(messages)
    prompt = IMPORT_ANALYSIS_PROMPT.format(transcript=transcript)

    try:
        resp = llm.invoke([
            SystemMessage(content="You output strictly valid JSON only. No prose. No markdown code fences."),
            HumanMessage(content=prompt),
        ])
        raw = resp.content if hasattr(resp, "content") else str(resp)

        # Strip accidental markdown code fences
        raw = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
        raw = re.sub(r"\s*```$", "", raw.strip(), flags=re.MULTILINE)

        # Extract the first JSON object
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            raw = m.group(0)

        data: Dict = json.loads(raw)

    except Exception as exc:
        logger.warning("Import profile extraction failed: %s", exc)
        data = {}

    def _str_list(key: str, cap: int) -> List[str]:
        return [
            s.strip().lower() for s in (data.get(key) or [])
            if isinstance(s, str) and s.strip()
        ][:cap]

    def _str_list_preserve_case(key: str, cap: int) -> List[str]:
        return [
            s.strip() for s in (data.get(key) or [])
            if isinstance(s, str) and s.strip()
        ][:cap]

    profile: Dict[str, Any] = {
        "name": data.get("name") if isinstance(data.get("name"), str) and str(data.get("name", "")).strip() else None,
        "age": data.get("age") if isinstance(data.get("age"), (int, float)) else None,
        "role": data.get("role") if isinstance(data.get("role"), str) and str(data.get("role", "")).strip() else None,
        "issues": _str_list("issues", 12),
        "feelings": _str_list("feelings", 10),
        "notes": (data.get("notes") or "").strip()[:400],
        "triggers": _str_list("triggers", 8),
        "coping_strategies_tried": _str_list_preserve_case("coping_strategies_tried", 8),
        "strengths": _str_list_preserve_case("strengths", 6),
        "cognitive_patterns": _str_list("cognitive_patterns", 6),
        "emotional_trajectory": data.get("emotional_trajectory", "unknown"),
        "support_level": data.get("support_level", "unknown"),
        "key_themes": _str_list("key_themes", 5),
        "tone": data.get("tone") if isinstance(data.get("tone"), str) and str(data.get("tone", "")).strip() else None,
        "writing": data.get("writing") if isinstance(data.get("writing"), str) and str(data.get("writing", "")).strip() else None,
        "other": (data.get("other") or "").strip() or None,
        # Import metadata
        "imported_from": source_platform,
        "import_date": datetime.utcnow().isoformat() + "Z",
        "messages_imported": len(messages),
        "last_updated": datetime.utcnow().isoformat() + "Z",
    }

    logger.info(
        "Import profile extracted from %s: %d issues, %d feelings, %d triggers",
        source_platform, len(profile["issues"]), len(profile["feelings"]), len(profile.get("triggers", [])),
    )
    return profile
