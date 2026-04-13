"""FastAPI service exposing LLM QA + User Profile endpoints."""
from __future__ import annotations

import os
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import Main  # noqa: E402
import UserProfile as UserProfileModule  # noqa: E402
import memory_import as MemoryImport  # noqa: E402

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

app = FastAPI(title="Zenith AI Knowledge API", version="1.2.0")

# Explicit profile file path (same directory as this api module)
PROFILE_PATH = os.path.join(os.path.dirname(__file__), "user_profile.json")

allow_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if os.getenv("FRONTEND_ORIGIN"):
    allow_origins.append(os.getenv("FRONTEND_ORIGIN"))
if os.getenv("ALLOW_ALL_ORIGINS", "").lower() == "true":
    allow_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1)

class ChatResponse(BaseModel):
    answer: str
    used_retrieval: bool
    sources: List[dict] = []

class HistoryTurn(BaseModel):
    role: str
    content: str

class HistoryResponse(BaseModel):
    history: List[HistoryTurn]

class AssessmentPayload(BaseModel):
    assessment: Dict[str, Any]

class AssessmentResponse(BaseModel):
    status: str
    profile: Dict[str, Any]

class MemoryImportPayload(BaseModel):
    """
    JSON body for /import/memory.

    `data` can be:
      - A list/dict — parsed JSON from a ChatGPT / Claude / Gemini export file.
      - A string    — plain-text pasted conversation.

    `source_hint` is optional: 'chatgpt' | 'claude' | 'gemini' | 'text'.
    When omitted the format is auto-detected.
    """
    data: Union[List, Dict, str]
    source_hint: Optional[str] = None

class MemoryImportResponse(BaseModel):
    status: str
    source_detected: str
    messages_processed: int
    fields_extracted: Dict[str, Any]
    profile: Dict[str, Any]

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/chat/query", response_model=ChatResponse)
async def chat_query(payload: ChatRequest):
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query text required")
    try:
        answer_text = Main.AnswerQes(payload.query.strip())
        _context, docs = Main.run_retrieval_pipeline(payload.query.strip())
        used_retrieval = len(docs) > 0
        sources = []
        for d in docs[:10]:
            sources.append({
                "source": d.metadata.get("source"),
                "page": d.metadata.get("page_number"),
                "chunk": d.metadata.get("chunk"),
                "category": d.metadata.get("category"),
            })
        return ChatResponse(answer=answer_text, used_retrieval=used_retrieval, sources=sources)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Chat query failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/history", response_model=HistoryResponse)
async def get_history():
    turns = []
    for m in Main.conversation_history[-50:]:
        role = "system"
        if hasattr(m, "type"):
            t = getattr(m, "type")
            if "human" in t.lower():
                role = "user"
            elif "ai" in t.lower():
                role = "assistant"
            elif "system" in t.lower():
                role = "system"
        turns.append(HistoryTurn(role=role, content=m.content))
    return HistoryResponse(history=turns)

def _merge_assessment_into_profile(existing: Optional[Dict[str, Any]], assessment: Dict[str, Any]) -> Dict[str, Any]:
    """Overwrite profile with latest assessment (no assessment_history retention).

    Rationale: Avoid confusing the LLM with stale / duplicated historical
    assessment snapshots. Only the freshest answers remain. We still preserve
    previously inferred conversational fields like `issues`, `notes`, and
    existing `feelings` (union with current mood) if they exist.
    """
    existing = existing or {}

    # Remove any legacy history key if present
    if "assessment_history" in existing:
        existing.pop("assessment_history", None)

    # Preserve conversational extraction artifacts (issues, notes, feelings)
    preserved_issues = existing.get("issues") or []
    preserved_notes = existing.get("notes") or ""
    preserved_feelings = existing.get("feelings") or []

    # Start a clean base profile then re-add preserved fields
    new_profile: Dict[str, Any] = {}

    # Carry over preserved conversation-derived fields
    if preserved_issues:
        new_profile["issues"] = preserved_issues
    if preserved_notes:
        new_profile["notes"] = preserved_notes
    if preserved_feelings:
        new_profile["feelings"] = preserved_feelings

    # Copy all assessment keys directly
    for k, v in assessment.items():
        if v not in (None, ""):
            new_profile[k] = v

    # Normalize / map dailyRole -> role
    if isinstance(new_profile.get("dailyRole"), str) and new_profile["dailyRole"].strip():
        new_profile["role"] = new_profile["dailyRole"].strip()

    # Integrate generalMood into feelings (dedup)
    if isinstance(new_profile.get("generalMood"), str) and new_profile["generalMood"].strip():
        mood_token = new_profile["generalMood"].strip().lower()
        feelings = new_profile.get("feelings") or []
        if mood_token not in feelings:
            feelings.append(mood_token)
        new_profile["feelings"] = feelings[:10]

    # Timestamp
    new_profile["last_updated"] = datetime.utcnow().isoformat() + "Z"
    return new_profile

@app.post("/user/assessment", response_model=AssessmentResponse)
async def submit_assessment(payload: AssessmentPayload):
    try:
        current = UserProfileModule.load_user_profile(PROFILE_PATH) or {}
        merged = _merge_assessment_into_profile(current, payload.assessment)
        UserProfileModule.save_user_profile(merged, PROFILE_PATH)
        logger.info("Assessment merged and saved to %s", PROFILE_PATH)
        return AssessmentResponse(status="ok", profile=merged)
    except Exception as e:
        logger.exception("Assessment submission failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/profile")
async def get_user_profile():
    return UserProfileModule.load_user_profile(PROFILE_PATH) or {}


# ---------------------------------------------------------------------------
# Memory import endpoints
# ---------------------------------------------------------------------------

@app.post("/import/memory", response_model=MemoryImportResponse)
async def import_memory(payload: MemoryImportPayload):
    """
    Import conversation history from a ChatGPT, Claude, or Gemini export and
    extract a rich psychological profile that is immediately merged into the
    user's local profile so Zoe can personalise from the very first message.

    Accepts:
      • Parsed JSON  — pass the full contents of conversations.json (ChatGPT),
                       the Claude export array, or the Gemini Takeout JSON as `data`.
      • Plain text   — paste a copied conversation as a string in `data`.

    The detected/provided `source_hint` is used only for labelling; format
    detection is automatic.
    """
    try:
        raw = payload.data

        # If a source hint is 'text', force plain-text parsing
        if payload.source_hint and payload.source_hint.lower() == "text":
            if not isinstance(raw, str):
                raw = json_safe_str(raw)
            messages, platform = MemoryImport.parse_plain_text(raw), "Plain Text"
        else:
            messages, platform = MemoryImport.parse_import(raw)

        if not messages:
            raise HTTPException(
                status_code=422,
                detail="No messages could be parsed from the provided data. "
                       "Please check the format or try pasting as plain text."
            )

        # Extract profile using the app's LLM instance
        imported_profile = MemoryImport.extract_profile_from_import(
            messages, Main.LLM, source_platform=platform
        )

        # Merge into existing profile on disk
        merged = UserProfileModule.merge_imported_profile(imported_profile, PROFILE_PATH)

        # Also refresh the in-memory profile used by the current session
        Main.USERPROFILE = merged

        # Build a summary of what was extracted (non-null / non-empty fields)
        fields_extracted = {
            k: v for k, v in imported_profile.items()
            if v not in (None, "", [], {}) and k not in ("last_updated", "import_date")
        }

        logger.info(
            "Memory import complete: platform=%s, messages=%d, fields=%d",
            platform, len(messages), len(fields_extracted)
        )

        return MemoryImportResponse(
            status="ok",
            source_detected=platform,
            messages_processed=len(messages),
            fields_extracted=fields_extracted,
            profile=merged,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Memory import failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/import/memory/file", response_model=MemoryImportResponse)
async def import_memory_file(file: UploadFile = File(...)):
    """
    Upload a ChatGPT / Claude / Gemini export file directly (JSON or plain text).

    • For ChatGPT: upload conversations.json from the data export ZIP.
    • For Claude:  upload the conversations JSON from the Anthropic export.
    • For Gemini:  upload the JSON file from Google Takeout → Gemini Apps Activity.
    • Plain text:  upload a .txt file containing a pasted conversation.
    """
    try:
        raw_bytes = await file.read()
        content_type = (file.content_type or "").lower()
        filename = (file.filename or "").lower()

        # Decide whether to treat as JSON or plain text
        is_text = filename.endswith(".txt") or "text/plain" in content_type

        if is_text:
            raw: Any = raw_bytes.decode("utf-8", errors="replace")
            messages, platform = MemoryImport.parse_plain_text(raw), "Plain Text"
        else:
            try:
                raw = json.loads(raw_bytes.decode("utf-8", errors="replace"))
            except json.JSONDecodeError as exc:
                raise HTTPException(
                    status_code=422,
                    detail=f"Could not parse file as JSON: {exc}. "
                           "If this is a plain-text conversation, rename the file to .txt."
                )
            messages, platform = MemoryImport.parse_import(raw)

        if not messages:
            raise HTTPException(
                status_code=422,
                detail="No messages found in the uploaded file. "
                       "Make sure you are uploading the correct export file."
            )

        imported_profile = MemoryImport.extract_profile_from_import(
            messages, Main.LLM, source_platform=platform
        )
        merged = UserProfileModule.merge_imported_profile(imported_profile, PROFILE_PATH)
        Main.USERPROFILE = merged

        fields_extracted = {
            k: v for k, v in imported_profile.items()
            if v not in (None, "", [], {}) and k not in ("last_updated", "import_date")
        }

        return MemoryImportResponse(
            status="ok",
            source_detected=platform,
            messages_processed=len(messages),
            fields_extracted=fields_extracted,
            profile=merged,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Memory file import failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/import/memory/status")
async def import_memory_status():
    """
    Return whether a previous memory import has been applied, and a summary
    of what was imported (platform, date, message count).
    """
    profile = UserProfileModule.load_user_profile(PROFILE_PATH) or {}
    if profile.get("imported_from"):
        return {
            "imported": True,
            "source": profile.get("imported_from"),
            "import_date": profile.get("import_date"),
            "messages_imported": profile.get("messages_imported"),
            "issues_count": len(profile.get("issues") or []),
            "feelings_count": len(profile.get("feelings") or []),
            "triggers_count": len(profile.get("triggers") or []),
        }
    return {"imported": False}


def json_safe_str(data: Any) -> str:
    """Convert non-string data to a JSON string safely."""
    try:
        return json.dumps(data)
    except Exception:
        return str(data)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", "8000"))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=False)