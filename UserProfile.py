import json
import re
import logging
from datetime import datetime
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
            "last_updated": datetime.utcnow().isoformat() + "Z"
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
        "last_updated": datetime.utcnow().isoformat() + "Z"
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

    merged["last_updated"] = new.get("last_updated") or datetime.utcnow().isoformat() + "Z"
    return merged

# -------- Public API -------- #

def update_user_profile(conversation_history: List,
                        llm,
                        profile_path: str = "user_profile.json",
                        min_turns: int = 2,
                        update_every: int = 2) -> Optional[Dict[str, Any]]:
    """
    Periodically extracts and persists user profile JSON.
    Returns updated profile dict or None if not updated this call.

    Parameters:
        conversation_history: list of HumanMessage / AIMessage objects.
        llm: an LLM with .invoke(messages) interface.
        profile_path: output JSON file path.
        min_turns: minimum human turns before first extraction.
        update_every: run extraction every N human turns.

    Usage example (after appending new messages):
        from UserProfile import update_user_profile
        update_user_profile(conversation_history, LLM)

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
        merged = new_profile

    path.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    logging.info("User profile updated: %s", path.resolve())
    return merged

def load_user_profile(profile_path: str = "user_profile.json") -> Optional[Dict[str, Any]]:
    """
    Load user profile from JSON file.
    Returns profile dict or None if file doesn't exist or can't be parsed.
    """
    path = Path(profile_path)
    if not path.exists():
        return None
    
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        logging.warning(f"Failed to load user profile: {e}")
        return None

def save_user_profile(profile_data: Dict[str, Any], profile_path: str = "user_profile.json") -> bool:
    """
    Save user profile to JSON file.
    Returns True if successful, False otherwise.
    """
    try:
        path = Path(profile_path)
        profile_data["last_updated"] = datetime.utcnow().isoformat() + "Z"
        path.write_text(json.dumps(profile_data, indent=2, ensure_ascii=False), encoding="utf-8")
        logging.info("User profile saved: %s", path.resolve())
        return True
    except Exception as e:
        logging.error(f"Failed to save user profile: {e}")
        return False