"""HTTP API used by the React app.

Run:  uvicorn zenith.api:app --reload --port 8000
"""

from __future__ import annotations

import uuid
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import __version__
from .agent import ZenithAgent, build_agent
from .config import settings


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: str | None = Field(default=None, max_length=64)


class Source(BaseModel):
    source: str | None = None
    page: int | str | None = None
    category: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    mode: str
    category: str | None = None
    sources: list[Source] = []


@lru_cache(maxsize=1)
def get_agent() -> ZenithAgent:
    return build_agent(settings)


AgentDep = Annotated[ZenithAgent, Depends(get_agent)]

app = FastAPI(title="Zenith API", version=__version__)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest, agent: AgentDep) -> ChatResponse:
    session_id = req.session_id or uuid.uuid4().hex
    reply = agent.answer(session_id, req.message)
    return ChatResponse(
        session_id=session_id,
        reply=reply.text,
        mode=reply.mode,
        category=reply.category,
        sources=[Source(**s) for s in reply.sources],
    )


@app.delete("/api/session/{session_id}", status_code=204)
def reset(session_id: str, agent: AgentDep) -> None:
    agent.reset(session_id)
