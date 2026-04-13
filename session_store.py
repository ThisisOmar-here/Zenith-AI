"""
Per-user session state with SQLite persistence.
Replaces the global conversation_history and USERPROFILE singletons.
"""
import json
import sqlite3
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent / "sessions.db"


@dataclass
class SessionState:
    session_id: str
    conversation_history: List = field(default_factory=list)
    user_profile: Dict[str, Any] = field(default_factory=dict)
    chronicle: List[Dict[str, Any]] = field(default_factory=list)
    ip_location: Optional[Dict[str, Any]] = None
    last_active: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SessionStore:
    def __init__(self, db_path: Path = DB_PATH):
        self._sessions: Dict[str, SessionState] = {}
        self._db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self._db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id      TEXT PRIMARY KEY,
                    conversation_json TEXT NOT NULL DEFAULT '[]',
                    profile_json    TEXT NOT NULL DEFAULT '{}',
                    chronicle_json  TEXT NOT NULL DEFAULT '[]',
                    ip_location_json TEXT,
                    last_active     TEXT NOT NULL
                )
            """)
            conn.commit()

    def get(self, session_id: str) -> SessionState:
        if session_id in self._sessions:
            return self._sessions[session_id]
        session = self._load_from_db(session_id)
        self._sessions[session_id] = session
        return session

    def _load_from_db(self, session_id: str) -> SessionState:
        from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

        with sqlite3.connect(self._db_path) as conn:
            row = conn.execute(
                "SELECT conversation_json, profile_json, chronicle_json, ip_location_json, last_active "
                "FROM sessions WHERE session_id = ?",
                (session_id,),
            ).fetchone()

        if not row:
            return SessionState(session_id=session_id)

        conv_raw, profile_raw, chronicle_raw, ip_raw, last_active = row
        history: List = []
        try:
            for msg in json.loads(conv_raw or "[]"):
                role = msg.get("role")
                content = msg.get("content", "")
                if role == "human":
                    history.append(HumanMessage(content=content))
                elif role == "ai":
                    history.append(AIMessage(content=content))
                elif role == "system":
                    history.append(SystemMessage(content=content))
        except Exception as exc:
            logger.warning("Failed to deserialize history for %s: %s", session_id, exc)

        profile: Dict[str, Any] = {}
        try:
            profile = json.loads(profile_raw or "{}")
        except Exception:
            pass

        chronicle: List = []
        try:
            chronicle = json.loads(chronicle_raw or "[]")
        except Exception:
            pass

        ip_location = None
        try:
            if ip_raw:
                ip_location = json.loads(ip_raw)
        except Exception:
            pass

        return SessionState(
            session_id=session_id,
            conversation_history=history,
            user_profile=profile,
            chronicle=chronicle,
            ip_location=ip_location,
            last_active=last_active or datetime.now(timezone.utc).isoformat(),
        )

    def save(self, session: SessionState):
        from langchain_core.messages import HumanMessage, AIMessage

        conv_list = []
        for msg in session.conversation_history:
            if isinstance(msg, HumanMessage):
                conv_list.append({"role": "human", "content": msg.content})
            elif isinstance(msg, AIMessage):
                conv_list.append({"role": "ai", "content": msg.content})
            else:
                conv_list.append({"role": "system", "content": getattr(msg, "content", "")})

        session.last_active = datetime.now(timezone.utc).isoformat()

        with sqlite3.connect(self._db_path) as conn:
            conn.execute(
                """
                INSERT INTO sessions
                  (session_id, conversation_json, profile_json, chronicle_json, ip_location_json, last_active)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                  conversation_json = excluded.conversation_json,
                  profile_json      = excluded.profile_json,
                  chronicle_json    = excluded.chronicle_json,
                  ip_location_json  = excluded.ip_location_json,
                  last_active       = excluded.last_active
                """,
                (
                    session.session_id,
                    json.dumps(conv_list, ensure_ascii=False),
                    json.dumps(session.user_profile, ensure_ascii=False),
                    json.dumps(session.chronicle, ensure_ascii=False),
                    json.dumps(session.ip_location, ensure_ascii=False) if session.ip_location else None,
                    session.last_active,
                ),
            )
            conn.commit()

        self._sessions[session.session_id] = session

    def delete(self, session_id: str):
        self._sessions.pop(session_id, None)
        with sqlite3.connect(self._db_path) as conn:
            conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
            conn.commit()


# Module-level singleton — import and use this everywhere
store = SessionStore()
