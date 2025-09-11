"""FastAPI service exposing LLM QA + User Profile endpoints."""
from __future__ import annotations

import os
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import Main  # noqa: E402
import UserProfile as UserProfileModule  # noqa: E402

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

app = FastAPI(title="Zenith AI Knowledge API", version="1.1.1")

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", "8000"))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=False)