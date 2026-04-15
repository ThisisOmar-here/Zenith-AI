# 📝 Observation Engine

### Observation 1
* **Raw Observation:** The application uses global state (`conversation_history` and `USERPROFILE`) in `Main.py` for tracking conversational state across multiple requests.
* **Context:** `Main.py`, lines 164, 303-311. State is appended directly to a global list and updated in a global dictionary.
* **Frequency:** Frequent (happens on every chat request).
* **Severity:** High.

### Observation 2
* **Raw Observation:** The FastAPI endpoints in `api.py` are defined with `async def` but call entirely synchronous blocking code (like `Main.AnswerQes` and synchronous `Qdrant` client).
* **Context:** `api.py` endpoints like `/chat/query` and `/user/assessment`.
* **Frequency:** Frequent.
* **Severity:** High.

### Observation 3
* **Raw Observation:** Vector search and LLM completion endpoints directly reach out to third-party endpoints (Groq, Qdrant) synchronously during the critical request path.
* **Context:** `Main.py` `AnswerQes`, `retrieve_docs`.
* **Frequency:** Frequent.
* **Severity:** Medium.

---

# 🔍 Insight Engine

### Insight 1: Global State Anti-Pattern
* **What is happening?** The system relies on a single python process's global variable for user state.
* **Why is it happening?** Likely designed originally as a local script/demo where only one user (the developer) interacts with it.
* **What does it imply?** The application cannot scale beyond 1 concurrent user effectively. If user A and user B make requests at the same time, their conversations and profiles will intermingle in memory, leading to severe privacy violations and context bleeding. It also prevents horizontal scaling. Hidden leverage lies in sessionization.

### Insight 2: Event Loop Blocking
* **What is happening?** Asynchronous FastAPI routes (`async def`) are running synchronous, blocking network and CPU-bound operations.
* **Why is it happening?** Mixing paradigms without understanding FastAPI's threading model.
* **What does it imply?** The entire FastAPI event loop will freeze while waiting for an LLM response or vector database query. A single user query will block all other users from connecting or receiving responses. Hidden leverage lies in threadpool offloading.

---

# 💡 Breakthrough Idea System

## 💡 Title
Stateless Multi-Tenant Scaling Architecture

## 🔍 Problem
The current architecture uses global in-memory variables to store user state and blocks the async event loop with synchronous operations. This means the application can effectively only serve one user at a time, and user data will cross-contaminate.

## 🧠 Insight
By transitioning from global state to stateless, session-driven request handling, and aligning the I/O model with FastAPI best practices, the application can immediately support hundreds of concurrent users on the existing hardware without unpredictable latency spikes.

## 🔗 Connected Dots
* The global `conversation_history` list and `USERPROFILE` dict block multi-tenancy.
* `async def` routes executing synchronous code block the event loop.
* Converting routes to regular `def` allows FastAPI to execute them in an external thread pool, unblocking the main thread.
* Utilizing session IDs or JWTs would allow retrieving specific user history from a database instead of a global list.

## 🚀 Proposed Change
1. Remove global `conversation_history` and `USERPROFILE` variables. Implement a session management system where chat history is fetched and persisted per user via a database (e.g., SQLite/PostgreSQL) or a specialized document store.
2. Change FastAPI endpoint signatures from `async def` to `def` for endpoints executing synchronous LLM calls (e.g., `/chat/query`). This leverages FastAPI's built-in thread pool for synchronous operations.
3. Pass `user_id` or `session_id` to `Main.AnswerQes` to fetch only the relevant context per request.

## 📊 Impact
* **Scalability:** Unlocks multi-tenant usage. Horizontal scalability becomes possible once state is externalized.
* **Privacy/Security:** Eliminates the risk of User A receiving User B's conversation history.
* **Performance:** Eliminates single-thread bottlenecking by allowing concurrent requests to run in background threads.

## ⚙️ Implementation (Suggestion Only)
1. **Modify `api.py`:** Update endpoints like `@app.post("/chat/query")` to use standard `def` instead of `async def`.
2. **Refactor `Main.py`:** Add a `session_id` parameter to `AnswerQes`.
3. **Externalize State:** Replace `conversation_history` with a function that retrieves history from a datastore based on `session_id`. Replace `USERPROFILE` global with a direct fetch per request.

## ⚠️ Trade-offs
* Requires adding a database or robust cache (like Redis) for fast session retrieval, adding slight deployment complexity.
* Changing `async def` to `def` introduces thread switching overhead, though this is negligible compared to blocking the event loop.

---

# 📊 Scoring System

### Idea: Stateless Multi-Tenant Scaling Architecture
* **Impact:** 10 (Critical for production viability)
* **Feasibility:** 8 (Straightforward refactoring, standard FastAPI patterns)
* **Leverage:** 9 (A small code change unlocks vast scalability)
* **Novelty:** 4 (Standard industry practice, not a novel AI feature)
* **Scalability:** 10 (Enables horizontal scaling)

**Final Score Calculation:**
(10 * 0.30) + (9 * 0.25) + (10 * 0.20) + (4 * 0.15) + (8 * 0.10)
= 3.0 + 2.25 + 2.0 + 0.6 + 0.8
= **8.65**

**Interpretation:** **8.65** → Breakthrough (Immediate recommendation)

---

# 🧭 Prioritization Engine

## 🔥 Now
* **Stateless Multi-Tenant Scaling Architecture** (Score: 8.65) - Absolutely essential before acquiring multiple users.

---

# ⚙️ Execution Planner (Suggestion Mode Only)

## Execution Plan: Stateless Multi-Tenant Scaling Architecture

### 🎯 Objective
Enable multi-user concurrency without state bleeding and eliminate event-loop blocking.

### 🧩 Tasks Breakdown
1. Update `api.py` endpoint definitions from `async def` to `def` to allow thread-pool execution.
2. Introduce a `session_id` parameter to API requests.
3. Modify `Main.py` to accept `session_id`.
4. Replace global lists with database/file reads and writes parameterized by `session_id`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* **`api.py`:** Remove `async` keyword from `chat_query` and `submit_assessment`. Add a `session_id: str` to `ChatRequest`.
* **`Main.py`:** Remove global `conversation_history` and `USERPROFILE`. Update `AnswerQes(query: str, session_id: str)`. Load history inside the function using `session_id`, perform the LLM call, and append/save the new history back to the datastore.

### ⏱ Time Estimate
* 1-2 Days

### 📈 Expected Outcome
* Ability to handle 50+ concurrent users on a single instance without cross-talk or UI freezes.

---

# 🤖 Execution Prompts Generator

### SYSTEM PROMPT
You are a senior backend engineer expert in Python, FastAPI, and scalable systems.

### TASK PROMPT
Refactor the FastAPI application to remove global state and fix event-loop blocking issues.

### CONTEXT
The current system in `Main.py` uses global variables (`conversation_history`, `USERPROFILE`) to store state, which causes data bleeding between users. Furthermore, `api.py` uses `async def` for endpoints that perform synchronous, blocking LLM and database calls, freezing the server for all other requests. We need to transition to a stateless, session-based architecture and utilize FastAPI's thread-pool by changing endpoints to standard `def`.

### OUTPUT FORMAT
* Refactored `api.py` code.
* Refactored `Main.py` code with session-based history management.
* Explanation of how concurrency is now handled.
