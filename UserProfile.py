import json
import re
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional

from langchain_core.messages import HumanMessage, SystemMessage

# -------- Internal Helpers -------- #

def _extract_user_profile(conversation_history: List, llm) -> Dict[str, Any]:
    """
    Extract a lightweight user profile from recent HumanMessages using the provided LLM.
    Returns dict with stable keys. Unknowns are None / [].
    """
    human_msgs = [m.content for m in conversation_history if isinstance(m, HumanMessage)]
    if not human_msgs:
        return {
            "name": None,
            "age": None,
            "role": None,
            "issues": [],
            "feelings": [],
            "notes": "",
            "last_updated": datetime.now(timezone.utc).isoformat() + "Z"
        }

    transcript = "\n---\n".join(human_msgs[-18:])  # limit scope
    prompt = f"""
You are a precise information extraction assistant.
Infer only explicitly stated or strongly implied stable attributes from the user's messages.

Return ONLY valid JSON with keys:
role: string or null (occupation / life role if stated)
issues: array of distinct short lowercase problem/concern labels (max 8)
feelings: array of recurring or recent emotions (max 6)
notes: short (<=40 words) neutral summary (no advice)
tone: string or null (e.g. friendly, formal, casual, etc. if clearly indicated)
writing: string or null (e.g. short, long, detailed, brief, etc. if clearly indicated) the way user prefers to write to match their style.

other from your choice:
Keys which help a therapist understand the user better, needs and way of thinking. e.g "The user is a single parent working in retail and feels anxious about money."
Avoid guessing. Leave fields null/empty if uncertain.

Conversation:
<<<
{transcript}
>>>

JSON:
""".strip()

    resp = llm.invoke([
        SystemMessage(content="You output strictly JSON. No prose."),
        HumanMessage(content=prompt)
    ])
    raw = resp.content if hasattr(resp, "content") else str(resp)

    # Extract first JSON object
    m = re.search(r'\{.*\}', raw, re.DOTALL)
    if m:
        raw = m.group(0)

    try:
        data = json.loads(raw)
    except Exception:
        logging.warning("Profile JSON parse failed. Raw: %s", raw[:300])
        data = {}

    profile = {
        "name": data.get("name") if isinstance(data.get("name"), str) and data.get("name").strip() else None,
        "age": data.get("age") if isinstance(data.get("age"), int) else None,
        "role": data.get("role") if isinstance(data.get("role"), str) and data.get("role").strip() else None,
        "issues": [i.strip().lower() for i in (data.get("issues") or []) if isinstance(i, str) and i.strip()][:8],
        "feelings": [f.strip().lower() for f in (data.get("feelings") or []) if isinstance(f, str) and f.strip()][:6],
        "notes": (data.get("notes") or "").strip()[:300],
        "last_updated": datetime.now(timezone.utc).isoformat() + "Z"
    }
    return profile


def _merge_profiles(old: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge old and new profiles.
    Keeps existing stable fields unless new supplies them.
    Unions list fields (capped). Replaces notes only if new is meaningfully longer.
    """
    if not old:
        return new

    merged = {
        "name": old.get("name") or new.get("name"),
        "age": old.get("age") or new.get("age"),
        "role": old.get("role") or new.get("role")
    }

    def union_list(a, b, cap):
        seen = set()
        out = []
        for item in (a or []) + (b or []):
            if not isinstance(item, str):
                continue
            if item not in seen:
                out.append(item)
                seen.add(item)
            if len(out) >= cap:
                break
        return out

    merged["issues"] = union_list(old.get("issues"), new.get("issues"), 12)
    merged["feelings"] = union_list(old.get("feelings"), new.get("feelings"), 10)

    old_notes = old.get("notes") or ""
    new_notes = new.get("notes") or ""
    if new_notes and (not old_notes or len(new_notes) > len(old_notes) * 0.6):
        merged["notes"] = new_notes
    else:
        merged["notes"] = old_notes

    # Preserve the chronicle — never overwrite it in profile merges
    if "chronicle" in old:
        merged["chronicle"] = old["chronicle"]

    merged["last_updated"] = new.get("last_updated") or datetime.now(timezone.utc).isoformat() + "Z"
    return merged


# -------- Chronicle Extractor -------- #

class ChronicleExtractor:
    """
    Extracts specific life events, named people, and stated goals from conversation history.
    Appends new entries to an existing chronicle (never replaces).
    """

    EXTRACT_PROMPT = """
You are extracting specific, concrete facts from a conversation to build a life chronicle for a mental health companion.

RULES:
- Only extract what was EXPLICITLY stated. Never infer or fabricate.
- Focus on: specific events with emotional weight, named people and their relationship to the user, stated goals with timelines.
- Skip generic statements ("I feel anxious") — only capture specific situations ("Failed my exam on Friday, mom was angry").
- Each entry must have a "summary" that is 1-2 sentences, factual, and specific.

Return ONLY a JSON array. Each item must have:
- type: "event" | "person" | "goal"
- summary: string (1-2 sentences, specific and factual)

For "event" type, also include if available:
- people: array of first names or relationships mentioned
- emotions: array of emotions expressed
- linked_issues: array of issue labels
- open: true (events are open until the user mentions resolution)

For "person" type, also include:
- name: string
- relationship: string (e.g. "mom", "friend", "colleague named Sarah")
- context: string (why this person is significant)

For "goal" type, also include:
- status: "active"
- stated_on: ISO date string (today's date: {today})

Conversation excerpt:
<<<
{transcript}
>>>

JSON array (empty array [] if nothing concrete found):
"""

    def extract(self, conversation_history: List, llm, existing_chronicle: List) -> List[Dict[str, Any]]:
        """
        Returns new chronicle entries to append (does not include existing ones).
        Skips entries that are already captured (simple summary dedup).
        """
        human_msgs = [m.content for m in conversation_history if isinstance(m, HumanMessage)]
        # Only look at recent messages to avoid redundant extraction
        recent = human_msgs[-10:]
        if not recent:
            return []

        transcript = "\n---\n".join(recent)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        prompt = self.EXTRACT_PROMPT.format(transcript=transcript, today=today)
        try:
            resp = llm.invoke([
                SystemMessage(content="You output strictly a JSON array. No prose. No markdown code fences."),
                HumanMessage(content=prompt)
            ])
            raw = resp.content if hasattr(resp, "content") else str(resp)
        except Exception as exc:
            logging.warning("ChronicleExtractor LLM call failed: %s", exc)
            return []

        # Strip markdown code fences if present
        raw = re.sub(r"```(?:json)?", "", raw).strip()
        m = re.search(r'\[.*\]', raw, re.DOTALL)
        if m:
            raw = m.group(0)

        try:
            entries = json.loads(raw)
            if not isinstance(entries, list):
                return []
        except Exception:
            logging.warning("ChronicleExtractor JSON parse failed. Raw: %s", raw[:300])
            return []

        # Build existing summary set for dedup
        existing_summaries = {e.get("summary", "").lower()[:60] for e in existing_chronicle}

        new_entries = []
        for entry in entries:
            if not isinstance(entry, dict) or not entry.get("summary"):
                continue
            summary_key = entry["summary"].lower()[:60]
            if summary_key in existing_summaries:
                continue

            # Enrich with metadata
            entry["id"] = "evt_" + uuid.uuid4().hex[:8]
            entry.setdefault("open", True)

            # Set follow_up_at to 7 days from now for events
            if entry.get("type") == "event":
                from datetime import timedelta
                follow_up = datetime.now(timezone.utc) + timedelta(days=7)
                entry.setdefault("follow_up_at", follow_up.strftime("%Y-%m-%dT%H:%M:%SZ"))

            new_entries.append(entry)
            existing_summaries.add(summary_key)

        return new_entries


# -------- Public API -------- #

def update_user_profile(conversation_history: List,
                        llm,
                        session=None,
                        profile_path: str = "user_profile.json",
                        min_turns: int = 2,
                        update_every: int = 2) -> Optional[Dict[str, Any]]:
    """
    Periodically extracts and persists user profile.
    If session is provided, updates session.user_profile and session.chronicle in place.
    Otherwise falls back to file-based persistence (backward compat).

    Returns updated profile dict or None if not updated this call.
    """
    human_turns = sum(1 for m in conversation_history if isinstance(m, HumanMessage))
    if human_turns < min_turns:
        return None
    if human_turns % update_every != 0:
        return None

    new_profile = _extract_user_profile(conversation_history, llm)

    if session is not None:
        # Session-aware path
        old_profile = session.user_profile or {}
        merged = _merge_profiles(old_profile, new_profile)
        session.user_profile = merged

        # Extract chronicle entries
        extractor = ChronicleExtractor()
        new_entries = extractor.extract(conversation_history, llm, session.chronicle)
        if new_entries:
            # Cap chronicle at 50 entries
            session.chronicle = (session.chronicle + new_entries)[-50:]
            logging.info("Chronicle updated: +%d entries (total %d)", len(new_entries), len(session.chronicle))

        logging.info("User profile updated in session %s", session.session_id)
        return merged

    # File-based fallback
    path = Path(profile_path)
    if path.exists():
        try:
            old_profile = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            old_profile = {}
        merged = _merge_profiles(old_profile, new_profile)
    else:
        merged = new_profile

    path.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    logging.info("User profile updated: %s", path.resolve())
    return merged


def load_user_profile(profile_path: str = "user_profile.json") -> Optional[Dict[str, Any]]:
    path = Path(profile_path)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        logging.warning(f"Failed to load user profile: {e}")
        return None


def save_user_profile(profile_data: Dict[str, Any], profile_path: str = "user_profile.json") -> bool:
    try:
        path = Path(profile_path)
        profile_data["last_updated"] = datetime.now(timezone.utc).isoformat() + "Z"
        path.write_text(json.dumps(profile_data, indent=2, ensure_ascii=False), encoding="utf-8")
        logging.info("User profile saved: %s", path.resolve())
        return True
    except Exception as e:
        logging.error(f"Failed to save user profile: {e}")
        return False
