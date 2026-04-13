"""
UserProfile.py — Extract, merge, and persist the user's psychological profile.

Fields captured (v2 — enhanced emotional intelligence):
  Core:       name, age, role
  Emotional:  issues, feelings, triggers, emotional_trajectory, emotional_intensity
  Cognitive:  cognitive_patterns  (e.g. catastrophising, all-or-nothing thinking)
  Context:    notes, key_themes, support_level
  Coping:     coping_strategies_tried, strengths
  Style:      tone, writing
  Meta:       other, last_updated, session_count, emotional_history
"""

from __future__ import annotations

import json
import re
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Extraction prompt (v2 — enhanced)
# ---------------------------------------------------------------------------

_EXTRACT_PROMPT = """You are a precise psychological profiling assistant.
Infer ONLY explicitly stated or very strongly implied attributes from the user messages below.
Do NOT guess. Leave fields null / empty when genuinely uncertain.

Return ONLY valid JSON with these exact keys:

{{
  "name": string or null,
  "age": number or null,
  "role": string or null,
  "issues": ["short lowercase label", ...],          // max 8 — recurring problems/concerns
  "feelings": ["emotion word", ...],                  // max 6 — recurring or recent emotions
  "triggers": ["trigger", ...],                       // max 6 — situations/events that cause distress
  "emotional_trajectory": "improving"|"declining"|"stable"|"unknown",
  "emotional_intensity": 1-10 or null,               // overall distress level (1=low, 10=crisis)
  "cognitive_patterns": ["pattern", ...],             // max 5 — e.g. "catastrophising", "people-pleasing"
  "support_level": "high"|"medium"|"low"|"unknown",  // perceived social support
  "coping_strategies_tried": ["strategy", ...],       // max 6 — what the user has already attempted
  "strengths": ["strength", ...],                     // max 5 — resilience factors
  "key_themes": ["theme", ...],                       // max 4 — dominant life themes
  "notes": "<=50 word neutral summary",
  "tone": string or null,
  "writing": string or null,
  "other": string or null
}}

Conversation messages:
<<<
{transcript}
>>>

JSON:
"""

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_user_profile(conversation_history: List, llm) -> Dict[str, Any]:
    """
    Extract an enhanced user profile from recent HumanMessages using the LLM.
    Returns a normalised dict. Unknowns default to None / [].
    """
    human_msgs = [m.content for m in conversation_history if isinstance(m, HumanMessage)]
    if not human_msgs:
        return _empty_profile()

    # Limit scope to last 20 human turns to keep prompt tight
    transcript = "\n---\n".join(human_msgs[-20:])

    prompt = _EXTRACT_PROMPT.format(transcript=transcript)

    resp = llm.invoke([
        SystemMessage(content="You output strictly valid JSON. No prose. No markdown code fences."),
        HumanMessage(content=prompt),
    ])
    raw = resp.content if hasattr(resp, "content") else str(resp)

    # Strip accidental markdown fences
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw.strip(), flags=re.MULTILINE)

    # Extract first JSON object
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if m:
        raw = m.group(0)

    try:
        data: Dict = json.loads(raw)
    except Exception:
        logger.warning("Profile JSON parse failed. Raw: %.300s", raw)
        data = {}

    def _str_list(key: str, cap: int) -> List[str]:
        return [
            s.strip().lower() for s in (data.get(key) or [])
            if isinstance(s, str) and s.strip()
        ][:cap]

    def _str_list_preserve(key: str, cap: int) -> List[str]:
        return [
            s.strip() for s in (data.get(key) or [])
            if isinstance(s, str) and s.strip()
        ][:cap]

    # Parse emotional_intensity as int 1-10
    raw_intensity = data.get("emotional_intensity")
    try:
        intensity = max(1, min(10, int(raw_intensity))) if raw_intensity is not None else None
    except (TypeError, ValueError):
        intensity = None

    profile: Dict[str, Any] = {
        "name": data.get("name") if isinstance(data.get("name"), str) and str(data.get("name", "")).strip() else None,
        "age": data.get("age") if isinstance(data.get("age"), (int, float)) else None,
        "role": data.get("role") if isinstance(data.get("role"), str) and str(data.get("role", "")).strip() else None,
        "issues": _str_list("issues", 8),
        "feelings": _str_list("feelings", 6),
        "triggers": _str_list("triggers", 6),
        "emotional_trajectory": data.get("emotional_trajectory", "unknown"),
        "emotional_intensity": intensity,
        "cognitive_patterns": _str_list("cognitive_patterns", 5),
        "support_level": data.get("support_level", "unknown"),
        "coping_strategies_tried": _str_list_preserve("coping_strategies_tried", 6),
        "strengths": _str_list_preserve("strengths", 5),
        "key_themes": _str_list("key_themes", 4),
        "notes": (data.get("notes") or "").strip()[:300],
        "tone": data.get("tone") if isinstance(data.get("tone"), str) and str(data.get("tone", "")).strip() else None,
        "writing": data.get("writing") if isinstance(data.get("writing"), str) and str(data.get("writing", "")).strip() else None,
        "other": (data.get("other") or "").strip() or None,
        "last_updated": datetime.utcnow().isoformat() + "Z",
    }
    return profile


def _empty_profile() -> Dict[str, Any]:
    return {
        "name": None, "age": None, "role": None,
        "issues": [], "feelings": [], "triggers": [],
        "emotional_trajectory": "unknown", "emotional_intensity": None,
        "cognitive_patterns": [], "support_level": "unknown",
        "coping_strategies_tried": [], "strengths": [], "key_themes": [],
        "notes": "", "tone": None, "writing": None, "other": None,
        "last_updated": datetime.utcnow().isoformat() + "Z",
    }


def _union_list(a: List, b: List, cap: int) -> List:
    """Merge two lists, deduplicate (case-insensitive), cap at `cap`."""
    seen: set = set()
    out: List = []
    for item in (a or []) + (b or []):
        if not isinstance(item, str):
            continue
        key = item.strip().lower()
        if key not in seen:
            out.append(item.strip())
            seen.add(key)
        if len(out) >= cap:
            break
    return out


def _merge_profiles(old: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge old and new profiles.

    Rules:
    - Stable scalars (name, age, role): keep existing unless new provides a value.
    - List fields: union with deduplication, capped.
    - notes: replace only if the new version is meaningfully longer (>60 % of old length).
    - emotional_trajectory / emotional_intensity: always take the newest value (current state matters most).
    - emotional_history: append a snapshot of the new state, keep the last 10 entries.
    - support_level, tone, writing: take newest non-null value.
    - imported_from / import_date / messages_imported: preserve from old if already set.
    - session_count: increment by 1 on each merge.
    """
    if not old:
        new["session_count"] = 1
        new["emotional_history"] = _build_history_entry(new)
        return new

    merged: Dict[str, Any] = {}

    # --- Stable scalars ---
    merged["name"] = old.get("name") or new.get("name")
    merged["age"] = old.get("age") or new.get("age")
    merged["role"] = old.get("role") or new.get("role")

    # --- List fields (union + cap) ---
    merged["issues"] = _union_list(old.get("issues"), new.get("issues"), 12)
    merged["feelings"] = _union_list(old.get("feelings"), new.get("feelings"), 10)
    merged["triggers"] = _union_list(old.get("triggers"), new.get("triggers"), 8)
    merged["cognitive_patterns"] = _union_list(old.get("cognitive_patterns"), new.get("cognitive_patterns"), 6)
    merged["coping_strategies_tried"] = _union_list(old.get("coping_strategies_tried"), new.get("coping_strategies_tried"), 8)
    merged["strengths"] = _union_list(old.get("strengths"), new.get("strengths"), 6)
    merged["key_themes"] = _union_list(old.get("key_themes"), new.get("key_themes"), 5)

    # --- Notes (replace only if meaningfully longer) ---
    old_notes = old.get("notes") or ""
    new_notes = new.get("notes") or ""
    if new_notes and (not old_notes or len(new_notes) > len(old_notes) * 0.60):
        merged["notes"] = new_notes
    else:
        merged["notes"] = old_notes

    # --- Current-state fields (always use latest non-null value) ---
    merged["emotional_trajectory"] = new.get("emotional_trajectory") or old.get("emotional_trajectory", "unknown")
    merged["emotional_intensity"] = new.get("emotional_intensity") if new.get("emotional_intensity") is not None else old.get("emotional_intensity")
    merged["support_level"] = new.get("support_level") or old.get("support_level", "unknown")
    merged["tone"] = new.get("tone") or old.get("tone")
    merged["writing"] = new.get("writing") or old.get("writing")
    merged["other"] = new.get("other") or old.get("other")

    # --- Import metadata (preserve existing) ---
    if old.get("imported_from"):
        merged["imported_from"] = old["imported_from"]
        merged["import_date"] = old.get("import_date")
        merged["messages_imported"] = old.get("messages_imported")

    # --- Session counter ---
    merged["session_count"] = (old.get("session_count") or 0) + 1

    # --- Emotional history (rolling last 10 snapshots) ---
    history: List = list(old.get("emotional_history") or [])
    entry = _build_history_entry(new)
    if entry:
        history.append(entry)
    merged["emotional_history"] = history[-10:]

    merged["last_updated"] = new.get("last_updated") or datetime.utcnow().isoformat() + "Z"
    return merged


def _build_history_entry(profile: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Build a compact snapshot for the emotional_history list."""
    feelings = profile.get("feelings") or []
    trajectory = profile.get("emotional_trajectory")
    intensity = profile.get("emotional_intensity")
    if not feelings and not trajectory and intensity is None:
        return None
    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "feelings": feelings[:4],
        "trajectory": trajectory,
        "intensity": intensity,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def update_user_profile(
    conversation_history: List,
    llm,
    profile_path: str = "user_profile.json",
    min_turns: int = 2,
    update_every: int = 2,
) -> Optional[Dict[str, Any]]:
    """
    Periodically extract and persist the user profile from conversation history.

    Parameters
    ----------
    conversation_history : list of HumanMessage / AIMessage objects
    llm                  : LangChain-compatible LLM with .invoke()
    profile_path         : path to the JSON file
    min_turns            : minimum human turns before first extraction
    update_every         : run extraction every N human turns

    Returns
    -------
    Updated profile dict, or None if not updated this call.
    """
    human_turns = sum(1 for m in conversation_history if isinstance(m, HumanMessage))
    if human_turns < min_turns:
        return None
    if human_turns % update_every != 0:
        return None

    new_profile = _extract_user_profile(conversation_history, llm)

    path = Path(profile_path)
    if path.exists():
        try:
            old_profile = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            old_profile = {}
        merged = _merge_profiles(old_profile, new_profile)
    else:
        new_profile["session_count"] = 1
        new_profile["emotional_history"] = _build_history_entry(new_profile)
        merged = new_profile

    path.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info("User profile updated → %s (session #%s)", path.resolve(), merged.get("session_count"))
    return merged


def merge_imported_profile(
    imported: Dict[str, Any],
    profile_path: str = "user_profile.json",
) -> Dict[str, Any]:
    """
    Merge an imported profile (from memory_import.extract_profile_from_import)
    into the existing user_profile.json.

    The imported profile is treated as the 'old' side so that any existing
    conversational data from the current session takes precedence.
    If no existing profile is found, the imported profile becomes the base.

    Returns the merged profile dict.
    """
    path = Path(profile_path)
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            existing = {}
    else:
        existing = {}

    # If there is already a rich existing profile, keep it dominant;
    # otherwise let the imported data seed everything.
    if existing:
        merged = _merge_profiles(imported, existing)
    else:
        imported.setdefault("session_count", 0)
        history_entry = _build_history_entry(imported)
        imported["emotional_history"] = [history_entry] if history_entry else []
        merged = imported

    path.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info("Imported profile merged → %s", path.resolve())
    return merged


def load_user_profile(profile_path: str = "user_profile.json") -> Optional[Dict[str, Any]]:
    """Load user profile from JSON. Returns None if missing or unreadable."""
    path = Path(profile_path)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("Failed to load user profile: %s", exc)
        return None


def save_user_profile(profile_data: Dict[str, Any], profile_path: str = "user_profile.json") -> bool:
    """Persist profile dict to JSON. Returns True on success."""
    try:
        path = Path(profile_path)
        profile_data["last_updated"] = datetime.utcnow().isoformat() + "Z"
        path.write_text(json.dumps(profile_data, indent=2, ensure_ascii=False), encoding="utf-8")
        logger.info("User profile saved → %s", path.resolve())
        return True
    except Exception as exc:
        logger.error("Failed to save user profile: %s", exc)
        return False
