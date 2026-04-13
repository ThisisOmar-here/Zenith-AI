import os
import json
from dotenv import load_dotenv
from langchain_qdrant import Qdrant
from langchain_core.documents import Document
from qdrant_client import QdrantClient, models
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
import getUsersIP
from prompts import prompts
import math
import logging
from typing import List, Optional, Tuple
from datetime import datetime, timezone, timedelta

from session_store import SessionState, store as session_store
from UserProfile import update_user_profile
from emotion_detector import detect_emotion
from langchain_core.tools import tool
from langchain_core.messages import ToolMessage
from langchain_groq import ChatGroq


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

load_dotenv()

api_key_q = os.getenv("API_KEY_Q")
nvidia_api_key = os.getenv("NVIDIA_API_KEY")

embeddings = NVIDIAEmbeddings(
    base_url='https://integrate.api.nvidia.com/v1',
    model='nvidia/nv-embedqa-e5-v5',
    truncate='END',
    dimensions=None,
    max_batch_size=50
)

LLM = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=1,
    max_completion_tokens=5000,
    top_p=1,
    reasoning_effort="high",
    tools=[{"type": "browser_search"}],
    api_key=os.getenv("GROQ_API_KEY")
)

collection_name = "knowledge-base"

client = QdrantClient(
    url="https://f91f53a3-5514-4a34-ae7c-435b04046992.europe-west3-0.gcp.cloud.qdrant.io:6333",
    api_key=os.getenv("Qdrant_API_KEY")
)

vector_store = Qdrant(
    client=client,
    collection_name=collection_name,
    embeddings=embeddings
)


def Create_Collection():
    client.recreate_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE)
    )
    print(f"Collection {collection_name} created successfully")


def create_payload_index():
    client.create_payload_index(
        collection_name=collection_name,
        field_name="category",
        field_schema="keyword",
    )


def LoadPDFsToVectorStore():
    """Walk PDFs/<category>/**/*.pdf and index chunks with category metadata."""
    base_dir = "PDFs"
    if not os.path.isdir(base_dir):
        print("No PDFs directory found.")
        return

    total_docs = 0
    indexed_files = 0

    for root, _, files in os.walk(base_dir):
        for fname in files:
            if not fname.lower().endswith(".pdf"):
                continue
            category = os.path.basename(root).lower()
            pdf_path = os.path.join(root, fname)
            loader = PyMuPDFLoader(pdf_path)
            pages = loader.load_and_split()

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1500,
                chunk_overlap=800,
                length_function=len,
                separators=["\n\n", "\n", ".", " ", ""],
            )

            docs = []
            for idx, page in enumerate(pages):
                texts = text_splitter.split_text(page.page_content)
                for i, chunk in enumerate(texts):
                    if not chunk.strip():
                        continue
                    docs.append(
                        Document(
                            page_content=chunk,
                            metadata={
                                "source": fname,
                                "page_number": page.metadata.get("page", idx + 1),
                                "total_pages": len(pages),
                                "chunk_id": idx,
                                "chunk": i,
                                "category": category
                            },
                        )
                    )

            if docs:
                vector_store.add_documents(documents=docs)
                total_docs += len(docs)
                indexed_files += 1
                print(f"Indexed {len(docs)} chunks from: {pdf_path} [category={category}]")

    print(f"\nTotal files indexed: {indexed_files}, total chunks: {total_docs}")


# Tunables
TEMPERATURE_SUPPORT = 1
MAX_HISTORY_TOKENS = 4400
MAX_CONTEXT_TOKENS = 5500
APPROX_CHARS_PER_TOKEN = 4
MAX_DOCS_INITIAL = 100
MAX_DOCS_FINAL = 20
MIN_DOCS = 3

CATEGORIES = [
    "Emotional & Mental Health",
    "Emotional Intelligence & Social Skills",
    "Practical Life Skills",
    "Productivity & Habits",
    "Resilience & Life Perspective",
    "Well-being & Happiness"
]


def approx_tokens(text: str) -> int:
    return math.ceil(len(text) / APPROX_CHARS_PER_TOKEN)


def HybridDocumentEmbeddings(user_query: str, hydeprompt: str) -> str:
    """Produce HyDE text with stripped persona to avoid style contamination."""
    try:
        resp = LLM.invoke(hydeprompt.format(user_query=user_query), temperature=0.5)
        hyde_text = resp.content.strip() if hasattr(resp, "content") else str(resp).strip()
        return hyde_text[:1800]
    except Exception as e:
        logging.warning("HyDE generation failed: %s", e)
        return ""


def summarize_history_if_needed(session: SessionState):
    """Compress session history when exceeding token budget."""
    history = session.conversation_history
    if not history:
        return
    total = sum(approx_tokens(m.content) for m in history)
    if total <= MAX_HISTORY_TOKENS:
        return

    # Keep last 2 turns (up to 4 messages)
    kept = []
    turn_cut = 0
    for msg in reversed(history):
        kept.append(msg)
        if isinstance(msg, HumanMessage):
            turn_cut += 1
            if turn_cut == 2:
                break
    kept = list(reversed(kept))
    earlier = history[:len(history) - len(kept)]

    summary_prompt = prompts.SummrizePrompt.format(
        content="\n\n".join(m.content for m in earlier)
    )
    summary_msg = LLM.invoke([
        SystemMessage(content="Summarize prior dialogue neutrally for internal memory only."),
        HumanMessage(content=summary_prompt)
    ])
    summary_content = summary_msg.content.strip()
    compressed = AIMessage(content=f"Conversation_Summary: {summary_content}")
    session.conversation_history = [compressed, *kept]
    logging.info("History compressed for session %s. New length: %d", session.session_id, len(session.conversation_history))


def retrieve_and_rerank(user_query: str, hyde_text: str, qdrant_filter: Optional[models.Filter] = None) -> List[Document]:
    """MMR retrieval with optional category filter."""
    retriever = vector_store.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": MAX_DOCS_INITIAL,
            "fetch_k": 40,
            "lambda_mult": 0.35,
            "filter": qdrant_filter,
        },
        embeddings=embeddings,
    )

    variants = [user_query.strip()]
    if hyde_text:
        first_line = hyde_text.split("\n", 1)[0][:500]
        if first_line and first_line.lower() != user_query.strip().lower():
            variants.append(first_line)

    gathered: List[Document] = []
    for v in variants:
        try:
            docs = retriever.invoke(v)
            gathered.extend(docs)
        except Exception as e:
            logging.warning("Retriever failure (%s): %s", v, e)

    seen_meta = set()
    uniq_docs = []
    for d in gathered:
        key = (d.metadata.get("source"), d.metadata.get("chunk"), d.page_content[:60])
        if key not in seen_meta:
            uniq_docs.append(d)
            seen_meta.add(key)

    return uniq_docs[:MAX_DOCS_FINAL]


def build_context(docs: List[Document], token_budget: int) -> str:
    assembled = []
    total = 0
    for d in docs:
        chunk_text = d.page_content.strip()
        header = f"[Source: {d.metadata.get('source')} p{d.metadata.get('page_number')} c{d.metadata.get('chunk')}]"
        block = header + "\n" + chunk_text
        t = approx_tokens(block)
        if total + t > token_budget:
            break
        assembled.append(block)
        total += t
    return "\n\n---\n\n".join(assembled)


def run_retrieval_pipeline(user_query: str) -> Tuple[str, List[Document]]:
    """
    HyDE + retrieval pipeline.
    Returns (context_text, docs_used).
    """
    try:
        hyde_text = HybridDocumentEmbeddings(user_query, prompts.hyde_prompt) if user_query else ""
        docs = retrieve_and_rerank(user_query, hyde_text)

        if (not docs or len(docs) < MIN_DOCS) and hyde_text:
            synthetic_doc = Document(
                page_content=hyde_text,
                metadata={"source": "HyDE_virtual", "page_number": "-", "chunk": "-", "category": "general"},
            )
            docs.append(synthetic_doc)

        context = build_context(docs, token_budget=MAX_CONTEXT_TOKENS) if docs else (hyde_text or "")
        return context, docs

    except Exception:
        try:
            hyde_answer = HybridDocumentEmbeddings(user_query, prompts.hyde_prompt_full_informative_answer)
            return (hyde_answer or "NO_RESULTS"), []
        except Exception:
            return "NO_RESULTS", []


# ── Chronicle helpers ──────────────────────────────────────────────────────

def find_relevant_chronicle(query: str, chronicle: List[Dict]) -> List[Dict]:
    """Returns up to 3 most relevant chronicle entries for the current query."""
    if not chronicle:
        return []

    query_lower = query.lower()
    query_words = set(query_lower.split())
    scored = []

    for entry in chronicle:
        score = 0
        summary = (entry.get("summary") or "").lower()
        people = [p.lower() for p in (entry.get("people") or [])]
        name = (entry.get("name") or "").lower()

        for person in people + ([name] if name else []):
            if person and person in query_lower:
                score += 3

        summary_words = set(summary.split())
        score += len(query_words & summary_words)

        if entry.get("open"):
            score += 1

        if score > 0:
            scored.append((score, entry))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [e for _, e in scored[:3]]


def get_session_opener(session: SessionState) -> Optional[str]:
    """
    Returns a follow-up note to inject at session start if:
    - User is returning after a gap of > 12 hours
    - There are open chronicle events due for follow-up
    """
    if not session.chronicle:
        return None

    # Only trigger on the very first message of this session
    if session.conversation_history:
        return None

    try:
        last_active = datetime.fromisoformat(session.last_active.replace("Z", "+00:00"))
        hours_gap = (datetime.now(timezone.utc) - last_active).total_seconds() / 3600
        if hours_gap < 12:
            return None
    except Exception:
        return None

    now_iso = datetime.now(timezone.utc).isoformat()
    # Find events due for follow-up
    due = [
        e for e in session.chronicle
        if e.get("open") and e.get("follow_up_at") and e.get("follow_up_at") <= now_iso
    ]
    if not due:
        open_events = [e for e in session.chronicle if e.get("open") and e.get("type") == "event"]
        if open_events:
            due = open_events[:1]
    if not due:
        return None

    event = due[0]
    summary = event.get("summary", "")
    people = event.get("people") or []
    people_note = f" (involves: {', '.join(people)})" if people else ""

    return f'"{summary}"{people_note}'


def detect_accountability_trigger(query: str, chronicle: List[Dict]) -> bool:
    """
    Returns True if accountability mode should activate:
    - A goal in chronicle is 14+ days old and still active
    - Query contains repeated-failure language
    """
    if not chronicle:
        return False

    now = datetime.now(timezone.utc)
    for entry in chronicle:
        if entry.get("type") == "goal" and entry.get("status") == "active":
            stated_on_str = entry.get("stated_on")
            if stated_on_str:
                try:
                    stated_on = datetime.fromisoformat(stated_on_str.replace("Z", "+00:00"))
                    if (now - stated_on).days >= 14:
                        return True
                except Exception:
                    pass

    failure_patterns = [
        "doesn't work", "not working", "tried everything", "keep trying",
        "nothing helps", "still the same", "hasn't changed", "i keep",
        "always happens", "same thing", "again and again", "never works"
    ]
    query_lower = query.lower()
    return any(pattern in query_lower for pattern in failure_patterns)


# ── Prompts organizer ──────────────────────────────────────────────────────

def prompts_organizer(user_profile, chronicle: Optional[List] = None,
                      session_opener: Optional[str] = None,
                      accountability: bool = False,
                      emotion_note: Optional[str] = None) -> List:
    """Build system messages for LLM, injecting chronicle and session context."""
    messages = [
        SystemMessage(content=prompts.SYSTEM_PROMPT_v5),
        SystemMessage(content=prompts.Zoe_Examples),
        SystemMessage(content=prompts.user_data_prompt.format(user_data=user_profile)),
        SystemMessage(content=prompts.UI_Prompt),
    ]

    # Inject relevant chronicle entries
    if chronicle:
        entries_text = "\n\n".join(
            f"- [{e.get('type', 'note').upper()}] {e.get('summary', '')} "
            f"{'(People: ' + ', '.join(e.get('people') or []) + ')' if e.get('people') else ''}"
            f"{'(Name: ' + e.get('name', '') + ', ' + e.get('relationship', '') + ')' if e.get('name') else ''}"
            for e in chronicle
        )
        messages.append(SystemMessage(content=prompts.chronicle_context_prompt.format(
            chronicle_entries=entries_text
        )))

    # Inject accountability mode guidance
    if accountability:
        messages.append(SystemMessage(content=prompts.accountability_mode_prompt))

    # Inject session opener (proactive follow-up)
    if session_opener:
        messages.append(SystemMessage(content=prompts.session_opener_prompt.format(
            follow_up_note=session_opener
        )))

    # Inject emotion detection note (silent, not shown to user)
    if emotion_note:
        messages.append(SystemMessage(content=emotion_note))

    return messages


# ── Tool definitions ───────────────────────────────────────────────────────

retrieve_docs_des = """
Use to find relevant passages from trusted books and articles when the user query
indicates they need help, advice, or information in any of these areas:
    Emotional & Mental Health,
    Emotional Intelligence & Social Skills,
    Practical Life Skills,
    Productivity & Habits,
    Resilience & Life Perspective,
    Well-being & Happiness

Don't use for other topics, or for Real-time data (news, weather, stock prices, etc).
Don't use for casual conversation or chit-chat
Don't use if the user query is very general or vague.
Output is a text block of relevant excerpts, or 'NO_RESULTS' if nothing found.
Do NOT repeat this text verbatim in your final answer; instead, use it to inform your response naturally.
"""

@tool(description=retrieve_docs_des)
def retrieve_docs(query: str) -> str:
    context, _docs = run_retrieval_pipeline(query)
    return context if context else "NO_RESULTS"


iptool_des = """
    Tool: get_user_ip_location
    Description: Use for: Local crisis resources, culturally appropriate framing, timezone-aware suggestions, and weather-appropriate activities; do not over-collect or expose location details.
    """

@tool(description=iptool_des)
def get_user_ip_location(_: str = "") -> str:
    try:
        info = getUsersIP.get_user_ip_location_data()
        return json.dumps(info)
    except Exception as e:
        return json.dumps({"error": f"Location lookup failed: {e}"})


user_profile_tool_des = """
    This function retrieves the user's profile information use it when you need to understand the user's background, issues, or preferences.
    Returns a dict with keys: name, age, role, issues, feelings, notes, tone, writing, other.
    """

@tool(description=user_profile_tool_des)
def get_users_profile(_: str = "") -> dict:
    # Stub — actual execution in AnswerQes uses session.user_profile directly
    return {}


LLM_WITH_TOOLS = LLM.bind_tools([retrieve_docs, get_user_ip_location, get_users_profile])


# ── Main entry point ───────────────────────────────────────────────────────

def AnswerQes(query: str, session: SessionState) -> Tuple[str, List[Document]]:
    """
    Process a user query within the context of a session.
    Returns (answer_text, retrieved_docs).
    Caller is responsible for saving the session after this returns.
    """
    summarize_history_if_needed(session)

    # Detect emotional signals (text + behavioral)
    emotion_signals = detect_emotion(query, session)

    # Detect signals for special modes
    opener = get_session_opener(session)
    accountability = detect_accountability_trigger(query, session.chronicle)

    # Find relevant chronicle entries for context injection
    relevant_chronicle = find_relevant_chronicle(query, session.chronicle)

    # Determine temperature based on mode
    temperature = 0.4 if accountability else TEMPERATURE_SUPPORT

    profile_str = json.dumps(session.user_profile or {}, ensure_ascii=False)
    prompt_messages = prompts_organizer(
        user_profile=profile_str,
        chronicle=relevant_chronicle if relevant_chronicle else None,
        session_opener=opener,
        accountability=accountability,
        emotion_note=emotion_signals.system_note,
    )

    first_pass_messages = [*prompt_messages, *session.conversation_history, HumanMessage(content=query)]
    model_response = LLM_WITH_TOOLS.invoke(first_pass_messages, temperature=temperature)

    tool_used = False
    retrieved_docs: List[Document] = []
    final_answer_content = ""

    tool_calls = getattr(model_response, "tool_calls", None)
    if tool_calls:
        tool_msgs = []
        for tc in tool_calls:
            try:
                if tc["name"] == "retrieve_docs":
                    logging.info("Tool 'retrieve_docs' called.")
                    tool_used = True
                    retrieved_context, retrieved_docs = run_retrieval_pipeline(query)
                    tool_msgs.append(ToolMessage(
                        content=retrieved_context if retrieved_context else "NO_RESULTS",
                        tool_call_id=tc["id"]
                    ))

                elif tc["name"] == "get_user_ip_location":
                    logging.info("Tool 'get_user_ip_location' called.")
                    # Use session-cached location to avoid global cache bug
                    if not session.ip_location:
                        try:
                            session.ip_location = getUsersIP.get_user_ip_location_data()
                        except Exception as e:
                            session.ip_location = {"error": str(e)}
                    tool_msgs.append(ToolMessage(
                        content=json.dumps(session.ip_location),
                        tool_call_id=tc["id"]
                    ))

                elif tc["name"] == "get_users_profile":
                    logging.info("Tool 'get_users_profile' called.")
                    # Use session profile directly — no file I/O
                    tool_msgs.append(ToolMessage(
                        content=json.dumps(session.user_profile or {}),
                        tool_call_id=tc["id"]
                    ))

                else:
                    logging.warning("Unknown tool called: %s", tc["name"])

            except Exception as exc:
                logging.warning("Tool execution failed for %s: %s", tc.get("name"), exc)

        followup_messages = [*first_pass_messages, model_response, *tool_msgs]
        followup_messages.append(SystemMessage(content=prompts.Notes))
        final = LLM.invoke(followup_messages, temperature=temperature)
        final_answer_content = final.content if hasattr(final, "content") else str(final)

    else:
        final_answer_content = model_response.content

    # Update session history
    session.conversation_history.extend([
        HumanMessage(content=query),
        AIMessage(content=final_answer_content)
    ])

    return final_answer_content, retrieved_docs
