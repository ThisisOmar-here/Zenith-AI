# Observation Engine

## Observation 1: Synchronous Blocking in Async Endpoints
* **Raw Observation:** The `chat_query` FastAPI endpoint uses synchronous LangChain `invoke` methods (`Main.AnswerQes`, `Main.run_retrieval_pipeline`) inside an `async def` function.
* **Context (where it occurs):** `api.py` (lines 69-89) and `Main.py`.
* **Frequency (Rare / Occasional / Frequent):** Frequent (occurs on every API call to this endpoint).
* **Severity (Low / Medium / High):** High (causes event loop starvation).

## Observation 2: Global State Leakage
* **Raw Observation:** The application manages user state and conversation history using global variables (`USERPROFILE`, `conversation_history`).
* **Context (where it occurs):** `Main.py` (lines 271, 502).
* **Frequency (Rare / Occasional / Frequent):** Frequent (affects every user session).
* **Severity (Low / Medium / High):** High (creates an architectural risk of state leakage across concurrent requests).

---

# Insight Engine

## Insight 1: Concurrency Bottleneck
* **What is happening?:** FastAPI attempts to serve concurrent requests using the asyncio event loop, but the synchronous LangChain processes block the main thread.
* **Why is it happening?:** Developers often wrap blocking code in `async def` endpoints, incorrectly assuming it makes the function non-blocking, rather than explicitly offloading it to a thread pool via `asyncio.to_thread` or using standard `def`.
* **What does it imply?:** As concurrent users increase, the application will experience severe latency spikes, ultimately leading to timeouts and a degraded user experience.

## Insight 2: Architecture Coupling
* **What is happening?:** User profiles and chat histories are tied to the server's global memory.
* **Why is it happening?:** The app was likely built as a single-user prototype and hasn't evolved into a multi-tenant stateless architecture.
* **What does it imply?:** The application cannot be scaled horizontally. If multiple instances are deployed behind a load balancer, users will experience disjointed sessions, and concurrently active users might see each other's data.

---

# Idea Generator

1. **System Optimization:** Refactor `async def chat_query` to a standard `def` endpoint or wrap blocking calls in `asyncio.to_thread()` to eliminate event loop starvation.
2. **System Optimization:** Decouple state by injecting a stateless session manager (e.g., Redis or a request-scoped database context) to replace global variables.
3. **UX Transformation:** Implement streaming responses to mask LLM latency and improve perceived performance.

---

# Breakthrough Idea System

### 💡 Title
Stateless & Non-Blocking Architecture Overhaul

### 🔍 Problem
The current architecture blocks the event loop and leaks state across sessions, capping concurrency to a single user and preventing horizontal scaling.

### 🧠 Insight
By merely changing a few synchronization paradigms (using standard `def` for blocking endpoints or threading) and decoupling state into request-scoped entities, we unlock infinite horizontal scalability and drop latency spikes to near zero.

### 🔗 Connected Dots
Combining non-blocking execution with stateless session management transforms a single-user prototype into a robust, multi-tenant SaaS application ready for production traffic.

### 🚀 Proposed Change
Migrate global states (`USERPROFILE`, `conversation_history`) to request-scoped contexts (e.g., passing user ID to fetch state from an external cache). Wrap blocking LLM calls in `asyncio.to_thread()` or change the endpoint definition to standard `def` to utilize FastAPI's built-in thread pool.

### 📊 Impact
* **Concurrency:** 10x-100x increase in simultaneous active users.
* **Latency:** Elimination of event loop lag (reducing from ~190ms to <2ms for non-blocking parts).
* **Security/Privacy:** Complete elimination of cross-user state leakage.

### ⚙️ Implementation (Suggestion Only)
1. Remove `global` declarations in `Main.py`.
2. Refactor `api.py` endpoints to accept a session ID, pulling user context from a fast store (like Redis or an async DB layer) per request.
3. Change `async def chat_query` to `def chat_query`, allowing FastAPI to run it in a thread pool, OR use `await asyncio.to_thread(Main.AnswerQes, ...)`.

### ⚠️ Trade-offs
* Requires refactoring how user contexts are fetched, which may temporarily complicate local development without a database/cache setup.
* Thread pool usage has overhead compared to pure async, but is vastly superior to blocking the event loop.

---

# Scoring System

## Scoring Criteria (0–10 each)
* **Impact (0-10):** 9 (Massive improvement in scale and reliability)
* **Feasibility (0-10):** 7 (Requires careful refactoring but uses well-understood patterns)
* **Leverage (0-10):** 8 (Small code changes yield huge architectural benefits)
* **Novelty (0-10):** 3 (Standard web architecture best practices)
* **Scalability (0-10):** 10 (Removes the primary bottleneck to scaling)

## Final Score Calculation
Final Score = (9 × 0.30) + (8 × 0.25) + (10 × 0.20) + (3 × 0.15) + (7 × 0.10)
Final Score = 2.70 + 2.00 + 2.00 + 0.45 + 0.70 = 7.85

## Score Interpretation
* **7.85** → High Priority (Next)

---

# Prioritization Engine

## Priority Buckets

### 🔥 Now
* Wrap blocking calls in `asyncio.to_thread()` in `api.py` (Fastest fix for the immediate starvation issue).

### ⚡ Next
* Refactor global state management (`USERPROFILE`, `conversation_history`) into request-scoped entities (Score: 7.85).

### 🧪 Later
* Implement WebSocket-based streaming responses.

### ❌ Drop
* Adding new LLM features before fixing the concurrency bottlenecks.

---

# Execution Planner (Suggestion Mode Only)

## Execution Plan

### 🎯 Objective
Eliminate event loop starvation and prevent cross-user state leakage to enable multi-tenant scaling.

### 🧩 Tasks Breakdown
1. **Fix Starvation:** Modify `api.py` to wrap `Main.AnswerQes` and `Main.run_retrieval_pipeline` in `asyncio.to_thread()`.
2. **State Decoupling:** Refactor `Main.py` to accept user session identifiers and store `conversation_history` and `USERPROFILE` in a dictionary keyed by session, or an external store.
3. **Endpoint Update:** Update API endpoints to parse and pass the session ID.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* **`api.py`:** Update `chat_query` to use `await asyncio.to_thread(...)`.
* **`Main.py`:** Remove `global USERPROFILE` and `global conversation_history`. Introduce functions like `get_conversation(session_id)` and `get_profile(session_id)`.

### ⏱ Time Estimate
2-3 Days

### 📈 Expected Outcome
Zero event loop starvation during blocking I/O and zero state leakage across concurrent API requests.

---

# Execution Prompts Generator

### SYSTEM PROMPT
You are a senior backend engineer specializing in FastAPI and scalable concurrent systems.

### TASK PROMPT
Refactor the FastAPI application to eliminate event loop starvation and decouple global state variables into request-scoped contexts.

### CONTEXT
The current `chat_query` endpoint in `api.py` uses `async def` but calls synchronous LangChain functions (`Main.AnswerQes`), blocking the event loop. Additionally, `Main.py` relies on `global conversation_history` and `global USERPROFILE`, which causes state leakage across concurrent requests.

### OUTPUT FORMAT
* Code snippets for `api.py` and `Main.py`.
* Brief explanation of the changes.
* Required testing steps.

---

# Feedback Loop

### Evaluate
* Did the refactor reduce event loop lag to <2ms?
* Can multiple distinct sessions operate concurrently without state overlap?
* Any unintended issues? (e.g., increased thread pool overhead or memory usage).

### Store
* Logging benchmark results and scaling metrics into `notes.md`.

### Refine
* If thread pool overhead is too high, pivot to replacing synchronous LangChain modules with their native async equivalents (e.g., `ainvoke`).
