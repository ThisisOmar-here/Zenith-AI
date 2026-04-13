"""FastAPI service exposing LLM QA + User Profile endpoints."""
from __future__ import annotations

import os
import logging
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import Main
import UserProfile as UserProfileModule
from session_store import store as session_store

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

app = FastAPI(title="Zenith AI Knowledge API", version="2.0.0")

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


# ── Request / Response models ──────────────────────────────────────────────

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1)
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class ChatResponse(BaseModel):
    answer: str
    session_id: str
    used_retrieval: bool
    sources: List[dict] = []


class HistoryTurn(BaseModel):
    role: str
    content: str


class HistoryResponse(BaseModel):
    history: List[HistoryTurn]
    session_id: str


class AssessmentPayload(BaseModel):
    assessment: Dict[str, Any]
    session_id: str = Field(default="default")


class AssessmentResponse(BaseModel):
    status: str
    profile: Dict[str, Any]


class ImportRequest(BaseModel):
    source: str = Field(..., description="chatgpt | claude | replika | manual")
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class ImportPreviewResponse(BaseModel):
    session_id: str
    extracted_profile: Dict[str, Any]
    extracted_chronicle: List[Dict[str, Any]]
    message: str


class CheckinRequest(BaseModel):
    mood_score: int = Field(..., ge=1, le=10)
    note: Optional[str] = None
    session_id: str = Field(default="default")


# ── Background tasks ───────────────────────────────────────────────────────

def _run_profile_update(session_id: str):
    """Background task: update user profile + chronicle, then persist session."""
    try:
        session = session_store.get(session_id)
        UserProfileModule.update_user_profile(
            session.conversation_history,
            Main.LLM,
            session=session,
        )
        session_store.save(session)
        logger.info("Background profile update completed for session %s", session_id)
    except Exception:
        logger.exception("Background profile update failed for session %s", session_id)


# ── Helpers ────────────────────────────────────────────────────────────────

def _merge_assessment_into_profile(existing: Optional[Dict[str, Any]], assessment: Dict[str, Any]) -> Dict[str, Any]:
    existing = existing or {}
    if "assessment_history" in existing:
        existing.pop("assessment_history", None)

    preserved_issues = existing.get("issues") or []
    preserved_notes = existing.get("notes") or ""
    preserved_feelings = existing.get("feelings") or []
    preserved_chronicle = existing.get("chronicle") or []

    new_profile: Dict[str, Any] = {}
    if preserved_issues:
        new_profile["issues"] = preserved_issues
    if preserved_notes:
        new_profile["notes"] = preserved_notes
    if preserved_feelings:
        new_profile["feelings"] = preserved_feelings
    if preserved_chronicle:
        new_profile["chronicle"] = preserved_chronicle

    for k, v in assessment.items():
        if v not in (None, ""):
            new_profile[k] = v

    if isinstance(new_profile.get("dailyRole"), str) and new_profile["dailyRole"].strip():
        new_profile["role"] = new_profile["dailyRole"].strip()

    if isinstance(new_profile.get("generalMood"), str) and new_profile["generalMood"].strip():
        mood_token = new_profile["generalMood"].strip().lower()
        feelings = new_profile.get("feelings") or []
        if mood_token not in feelings:
            feelings.append(mood_token)
        new_profile["feelings"] = feelings[:10]

    new_profile["last_updated"] = datetime.utcnow().isoformat() + "Z"
    return new_profile


# ── Endpoints ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/chat/query", response_model=ChatResponse)
async def chat_query(payload: ChatRequest, background_tasks: BackgroundTasks):
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query text required")
    try:
        session = session_store.get(payload.session_id)

        answer_text, docs = Main.AnswerQes(payload.query.strip(), session)

        # Persist session immediately (history updated)
        session_store.save(session)

        # Update profile + chronicle in background (non-blocking)
        background_tasks.add_task(_run_profile_update, payload.session_id)

        used_retrieval = len(docs) > 0
        sources = [
            {
                "source": d.metadata.get("source"),
                "page": d.metadata.get("page_number"),
                "chunk": d.metadata.get("chunk"),
                "category": d.metadata.get("category"),
            }
            for d in docs[:10]
        ]
        return ChatResponse(
            answer=answer_text,
            session_id=payload.session_id,
            used_retrieval=used_retrieval,
            sources=sources,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Chat query failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/history", response_model=HistoryResponse)
async def get_history(payload: ChatRequest):
    session = session_store.get(payload.session_id)
    turns = []
    for m in session.conversation_history[-50:]:
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
    return HistoryResponse(history=turns, session_id=payload.session_id)


@app.post("/user/assessment", response_model=AssessmentResponse)
async def submit_assessment(payload: AssessmentPayload):
    try:
        session = session_store.get(payload.session_id)
        merged = _merge_assessment_into_profile(session.user_profile, payload.assessment)
        session.user_profile = merged
        session_store.save(session)
        logger.info("Assessment merged for session %s", payload.session_id)
        return AssessmentResponse(status="ok", profile=merged)
    except Exception as e:
        logger.exception("Assessment submission failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/user/profile")
async def get_user_profile(session_id: str = "default"):
    session = session_store.get(session_id)
    return session.user_profile or {}


@app.get("/user/chronicle")
async def get_chronicle(session_id: str = "default"):
    session = session_store.get(session_id)
    return {"session_id": session_id, "chronicle": session.chronicle}


@app.post("/user/checkin")
async def mood_checkin(payload: CheckinRequest):
    """Append a mood check-in to the session's progress data."""
    try:
        session = session_store.get(payload.session_id)
        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "mood_score": payload.mood_score,
            "note": payload.note or "",
            "session_id": payload.session_id,
            "trigger": "mood_checkin",
        }
        # Store in a lightweight progress list within the profile
        profile = session.user_profile or {}
        progress = profile.get("progress") or []
        progress.append(entry)
        profile["progress"] = progress[-90:]  # cap at 90 entries
        session.user_profile = profile
        session_store.save(session)
        return {"status": "ok", "entry": entry}
    except Exception as e:
        logger.exception("Mood check-in failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/user/import/preview", response_model=ImportPreviewResponse)
async def import_memory_preview(
    source: str = Form(...),
    session_id: str = Form(default_factory=lambda: str(uuid.uuid4())),
    file: UploadFile = File(None),
    text_content: Optional[str] = Form(None),
):
    """
    Parse and extract a user profile from an exported AI conversation file.
    Returns a preview for user review — does NOT save yet.
    """
    try:
        from memory_import import extract_profile_from_export
        raw_bytes = await file.read() if file else None
        raw_text = raw_bytes.decode("utf-8", errors="ignore") if raw_bytes else (text_content or "")

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="No content provided")

        extracted = extract_profile_from_export(raw_text, source, Main.LLM)
        return ImportPreviewResponse(
            session_id=session_id,
            extracted_profile=extracted.get("profile", {}),
            extracted_chronicle=extracted.get("chronicle", []),
            message="Review the extracted profile below. Confirm to apply it to your account.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Import preview failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/user/import/confirm")
async def import_memory_confirm(payload: Dict[str, Any]):
    """
    Apply a previewed import to a session (after user review).
    Expects: { session_id, profile, chronicle }
    """
    try:
        session_id = payload.get("session_id", "default")
        incoming_profile = payload.get("profile") or {}
        incoming_chronicle = payload.get("chronicle") or []

        session = session_store.get(session_id)
        merged = UserProfileModule._merge_profiles(session.user_profile, incoming_profile)
        session.user_profile = merged

        existing_summaries = {e.get("summary", "")[:60].lower() for e in session.chronicle}
        for entry in incoming_chronicle:
            key = entry.get("summary", "")[:60].lower()
            if key not in existing_summaries:
                session.chronicle.append(entry)
                existing_summaries.add(key)

        session.chronicle = session.chronicle[-50:]
        session_store.save(session)
        return {"status": "ok", "session_id": session_id, "profile": session.user_profile}
    except Exception as e:
        logger.exception("Import confirm failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/user/data")
async def delete_user_data(session_id: str = "default"):
    """GDPR-style: delete all data for a session."""
    session_store.delete(session_id)
    return {"status": "deleted", "session_id": session_id}


# ── Voice endpoints ────────────────────────────────────────────────────────

@app.post("/chat/voice")
async def chat_voice(
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
    session_id: str = Form(default_factory=lambda: str(uuid.uuid4())),
):
    """
    Full voice round-trip:
    1. Transcribe user audio (Groq Whisper)
    2. Run AnswerQes
    3. Synthesize Zoe's response (ElevenLabs v3)
    Returns: JSON with transcript, answer text, and base64-encoded audio.
    """
    try:
        import base64
        from voice import transcribe, synthesize, detect_mode_from_response

        audio_bytes = await audio.read()
        transcript = await transcribe(audio_bytes, filename=audio.filename or "audio.webm")

        session = session_store.get(session_id)
        answer_text, docs = Main.AnswerQes(transcript, session)
        session_store.save(session)
        background_tasks.add_task(_run_profile_update, session_id)

        mode = detect_mode_from_response(answer_text)
        audio_response = await synthesize(answer_text, mode=mode)
        audio_b64 = base64.b64encode(audio_response).decode("utf-8")

        used_retrieval = len(docs) > 0
        return {
            "transcript": transcript,
            "answer": answer_text,
            "session_id": session_id,
            "used_retrieval": used_retrieval,
            "audio_base64": audio_b64,
            "audio_format": "mp3",
        }
    except Exception as e:
        logger.exception("Voice chat failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/speak")
async def chat_speak(payload: ChatRequest):
    """
    Text-in, voice-out:
    User sends a text message but wants Zoe's response as audio.
    Returns: JSON with answer text + base64-encoded MP3.
    """
    try:
        import base64
        from voice import synthesize, detect_mode_from_response

        session = session_store.get(payload.session_id)
        answer_text, _ = Main.AnswerQes(payload.query.strip(), session)
        session_store.save(session)

        mode = detect_mode_from_response(answer_text)
        audio_bytes = await synthesize(answer_text, mode=mode)
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        return {
            "answer": answer_text,
            "session_id": payload.session_id,
            "audio_base64": audio_b64,
            "audio_format": "mp3",
        }
    except Exception as e:
        logger.exception("Speak endpoint failed")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", "8000"))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=False)
