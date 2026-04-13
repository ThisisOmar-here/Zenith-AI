"""
Memory Passport — import conversation history from ChatGPT, Claude, Replika, or raw text.
Extracts user profile and life chronicle entries via LLM.
"""
import json
import re
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)


# ── Source parsers ─────────────────────────────────────────────────────────

def parse_chatgpt_export(raw: str) -> List[Dict[str, Any]]:
    """
    Parse ChatGPT's conversations.json export format.
    Returns a flat list of {role, content, timestamp} dicts sorted by time.
    """
    try:
        data = json.loads(raw)
    except Exception:
        logger.warning("Could not parse as JSON — treating as plain text")
        return [{"role": "user", "content": raw, "timestamp": None}]

    # Handle both single conversation object and array of conversations
    conversations = data if isinstance(data, list) else [data]
    messages = []

    for conv in conversations:
        mapping = conv.get("mapping") or {}
        for node in mapping.values():
            msg_node = node.get("message")
            if not msg_node:
                continue
            author = (msg_node.get("author") or {}).get("role", "")
            if author not in ("user", "assistant"):
                continue
            content_obj = msg_node.get("content") or {}
            parts = content_obj.get("parts") or []
            content = " ".join(str(p) for p in parts if isinstance(p, str)).strip()
            if not content:
                continue
            messages.append({
                "role": "user" if author == "user" else "assistant",
                "content": content,
                "timestamp": msg_node.get("create_time"),
            })

    messages.sort(key=lambda x: (x["timestamp"] or 0))
    return messages


def parse_claude_memory(raw: str) -> List[Dict[str, Any]]:
    """
    Parse Claude's memory export (plain text bullets or numbered list).
    Returns a list of {role: 'user', content: line} dicts.
    """
    lines = [line.strip().lstrip("-•*0123456789. ") for line in raw.split("\n") if line.strip()]
    return [{"role": "user", "content": line, "timestamp": None} for line in lines if line]


def parse_replika_export(raw: str) -> List[Dict[str, Any]]:
    """
    Parse Replika JSON export (array of {message, author, timestamp}).
    """
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            messages = []
            for item in data:
                role = "user" if item.get("author", "").lower() in ("user", "human", "me") else "assistant"
                content = item.get("message") or item.get("content") or item.get("text") or ""
                if content:
                    messages.append({
                        "role": role,
                        "content": str(content).strip(),
                        "timestamp": item.get("timestamp"),
                    })
            return messages
    except Exception:
        pass
    # Fallback: treat as plain text
    return [{"role": "user", "content": line.strip(), "timestamp": None}
            for line in raw.split("\n") if line.strip()]


def parse_manual_text(raw: str) -> List[Dict[str, Any]]:
    """Treat free-form text as a single user message block."""
    return [{"role": "user", "content": raw.strip(), "timestamp": None}]


PARSERS = {
    "chatgpt": parse_chatgpt_export,
    "claude": parse_claude_memory,
    "replika": parse_replika_export,
    "manual": parse_manual_text,
}


# ── LLM-based extraction ───────────────────────────────────────────────────

EXTRACTION_PROMPT = """
You are analyzing conversation history a user had with another AI assistant.
Your goal is to build a detailed, accurate profile of this user for a mental health companion called Zoe.

RULES:
- Only extract what was EXPLICITLY stated or very clearly implied. Never fabricate.
- Be thorough — this is a one-time import that will help Zoe know the user from day one.
- For issues and feelings, use short lowercase labels (e.g. "anxiety", "loneliness")
- For chronicle entries, capture specific events, named people, and stated goals

Return ONLY valid JSON with this structure:
{{
  "name": string or null,
  "age": integer or null,
  "role": string or null (occupation / life stage),
  "issues": [list of short issue labels, max 10],
  "feelings": [list of emotion labels, max 8],
  "notes": "2-3 sentence summary of who this person is and what they're working on",
  "tone": string or null (how they write/speak),
  "writing": string or null (brief / detailed / casual / formal),
  "chronicle": [
    {{
      "type": "event" | "person" | "goal",
      "summary": "specific 1-2 sentence description",
      "people": [list of names/relationships if type=event],
      "emotions": [list of emotions if type=event],
      "linked_issues": [list of issue labels if type=event],
      "open": true,
      "name": "person's name if type=person",
      "relationship": "relationship description if type=person",
      "context": "why significant if type=person",
      "status": "active if type=goal",
      "stated_on": "ISO date string if type=goal"
    }}
  ]
}}

Important: chronicle should only contain SPECIFIC facts (named people, concrete events, explicit goals with details).
Skip generic entries like "user feels sad" — only include "user failed their physics exam and their father was disappointed."

Conversation history (user messages only for privacy):
<<<
{transcript}
>>>

JSON:
"""


def extract_profile_from_export(raw_content: str, source: str, llm) -> Dict[str, Any]:
    """
    Parse raw exported content, then use LLM to extract structured profile.
    Returns {"profile": {...}, "chronicle": [...]}
    """
    parser = PARSERS.get(source.lower(), parse_manual_text)
    messages = parser(raw_content)

    # Extract user messages only (to protect assistant's data)
    user_messages = [m["content"] for m in messages if m["role"] == "user"]

    if not user_messages:
        return {"profile": {}, "chronicle": []}

    # Chunk to avoid token limits — take last 100 user messages max
    transcript_lines = user_messages[-100:]
    transcript = "\n---\n".join(transcript_lines)

    # Truncate if still too long (~40k chars ≈ 10k tokens)
    if len(transcript) > 40000:
        transcript = transcript[-40000:]

    today = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    prompt = EXTRACTION_PROMPT.format(transcript=transcript, today=today)

    try:
        resp = llm.invoke([
            SystemMessage(content="You output strictly JSON. No prose. No markdown code fences."),
            HumanMessage(content=prompt)
        ])
        raw = resp.content if hasattr(resp, "content") else str(resp)
    except Exception as exc:
        logger.error("LLM extraction failed: %s", exc)
        return {"profile": {}, "chronicle": []}

    # Strip markdown fences
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
    m = re.search(r'\{.*\}', raw, re.DOTALL)
    if m:
        raw = m.group(0)

    try:
        data = json.loads(raw)
    except Exception:
        logger.warning("Extraction JSON parse failed. Raw: %s", raw[:300])
        return {"profile": {}, "chronicle": []}

    # Split out chronicle from profile
    chronicle_raw = data.pop("chronicle", []) or []

    # Enrich chronicle entries with IDs and timestamps
    chronicle = []
    for entry in chronicle_raw:
        if not isinstance(entry, dict) or not entry.get("summary"):
            continue
        entry["id"] = "imp_" + uuid.uuid4().hex[:8]
        entry.setdefault("open", True)
        if entry.get("type") == "goal":
            entry.setdefault("status", "active")
            entry.setdefault("stated_on", today)
        chronicle.append(entry)

    # Clean the profile
    profile = {
        "name": data.get("name") if isinstance(data.get("name"), str) and data.get("name").strip() else None,
        "age": data.get("age") if isinstance(data.get("age"), int) else None,
        "role": data.get("role") if isinstance(data.get("role"), str) and data.get("role").strip() else None,
        "issues": [i.strip().lower() for i in (data.get("issues") or []) if isinstance(i, str) and i.strip()][:10],
        "feelings": [f.strip().lower() for f in (data.get("feelings") or []) if isinstance(f, str) and f.strip()][:8],
        "notes": (data.get("notes") or "").strip()[:400],
        "tone": data.get("tone") if isinstance(data.get("tone"), str) else None,
        "writing": data.get("writing") if isinstance(data.get("writing"), str) else None,
        "import_source": source,
        "import_date": today,
        "last_updated": today,
    }

    logger.info(
        "Import extraction complete: %d profile fields, %d chronicle entries from %s",
        sum(1 for v in profile.values() if v),
        len(chronicle),
        source,
    )
    return {"profile": profile, "chronicle": chronicle}
