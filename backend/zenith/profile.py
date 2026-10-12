"""Optional, opt-in user profile extracted from the user's own messages.

Off by default (ZENITH_STORE_PROFILES=false). When enabled, the profile is
kept in memory for the session and only written to disk if a path is given.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from . import prompts

log = logging.getLogger(__name__)

EMPTY: dict[str, Any] = {"name": None, "role": None, "concerns": [], "feelings": [], "notes": ""}


def parse_profile(raw: str) -> dict[str, Any]:
    """Pull the first JSON object out of a model reply and coerce it to the profile shape."""
    match = re.search(r"\{.*\}", raw or "", re.DOTALL)
    if not match:
        return dict(EMPTY)
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return dict(EMPTY)
    profile = dict(EMPTY)
    for key in ("name", "role"):
        if isinstance(data.get(key), str) and data[key].strip():
            profile[key] = data[key].strip()[:200]
    if isinstance(data.get("notes"), str):
        profile["notes"] = data["notes"].strip()[:300]
    for key, limit in (("concerns", 8), ("feelings", 6)):
        values = data.get(key)
        if isinstance(values, list):
            profile[key] = [str(v).strip().lower() for v in values if str(v).strip()][:limit]
    return profile


def extract_profile(messages: list[BaseMessage], llm: BaseChatModel) -> dict[str, Any]:
    user_lines = [str(m.content) for m in messages if isinstance(m, HumanMessage)][-18:]
    if not user_lines:
        return dict(EMPTY)
    prompt = prompts.load("profile").format(transcript="\n---\n".join(user_lines))
    try:
        resp = llm.invoke([SystemMessage(content="You output strictly JSON. No prose."), HumanMessage(content=prompt)])
    except Exception as exc:
        log.warning("profile extraction failed: %s", exc)
        return dict(EMPTY)
    profile = parse_profile(str(resp.content))
    profile["updated_at"] = datetime.now(timezone.utc).isoformat()
    return profile


def save_profile(profile: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")
