# 📝 1. Observation Engine

* **Raw Observation:** Global variables (`conversation_history` and `USERPROFILE`) are used in `Main.py` to manage user state.
* **Context (where it occurs):** `Main.py` module, specifically in `AnswerQes` and `summarize_history_if_needed`.
* **Frequency:** Frequent (every request to `/chat/query` uses these globals).
* **Severity:** High (leads to state leakage across multiple concurrent requests, meaning one user's context might bleed into another's).

* **Raw Observation:** Synchronous LLM calls and blocking I/O (file read/write) are present in FastAPI `async def` endpoints.
* **Context (where it occurs):** `api.py` (`/chat/query`, `/user/assessment`) and `UserProfile.py`.
* **Frequency:** Frequent (every request hits these paths).
* **Severity:** High (causes event loop starvation, leading to severe latency for concurrent users).

---

# 🔍 2. Insight Engine

* **What is happening?** The application uses global state for session management and synchronous operations within an asynchronous framework.
* **Why is it happening?** It appears the system was initially built as a single-user prototype or script and was wrapped in a FastAPI application without refactoring for concurrency.
* **What does it imply?** The application cannot reliably scale beyond a single concurrent user without data corruption (state leakage) and significant performance degradation (event loop blocking). The leverage point here is migrating state management to a per-request or session-based model and offloading blocking I/O to thread pools.

---

# 🔗 3. Idea Generator

1. **System Optimization:** Refactor FastAPI endpoints to use standard `def` instead of `async def` for routes that wrap synchronous operations (`Main.py` LLM calls, `UserProfile.py` file ops), automatically utilizing FastAPI's thread pool to prevent event loop blocking.
2. **System Optimization:** Use `asyncio.to_thread` for specific blocking operations if endpoints must remain `async def`.
3. **Architecture Optimization:** Eliminate global `conversation_history` and `USERPROFILE` in `Main.py`. Pass state explicitly via the API request payload or implement a lightweight session store (e.g., Redis or an in-memory dictionary keyed by session ID).
4. **Data Management:** Implement a proper database (e.g., SQLite/PostgreSQL) instead of flat JSON files (`user_profile.json`) to handle concurrent reads/writes safely and scale state management.

---

# 💡 4. Breakthrough Idea System

### 💡 Title
Stateless, Concurrent AI Companion Refactoring

### 🔍 Problem
The current architecture uses global variables for conversation history and user profiles, and performs synchronous I/O and LLM operations within the `async` event loop. This prevents the application from scaling, causes user data leakage between requests, and blocks the server during processing.

### 🧠 Insight
By separating state management from the core LLM execution logic and leveraging standard FastAPI concurrency patterns, we can transform a single-user prototype into a multi-tenant, scalable application with minimal code changes.

### 🔗 Connected Dots
* Global state in `Main.py` -> State leakage.
* Synchronous operations in `async` endpoints -> Event loop starvation.
* Both issues prevent horizontal scaling. Moving state out of `Main` and utilizing thread pools solves both concurrently.

### 🚀 Proposed Change
1. Remove global variables `conversation_history` and `USERPROFILE` from `Main.py`.
2. Update `api.py` endpoints to accept and return conversation history, or implement a basic `dict` based session store keyed by a `user_id`.
3. Change `/chat/query` and `/user/assessment` in `api.py` from `async def` to `def` so FastAPI runs them in a background thread pool, eliminating event loop blocking.

### 📊 Impact
* **Revenue/Growth:** Allows multiple users to use the system simultaneously, a prerequisite for SaaS scalability.
* **Efficiency:** Drastically reduces P99 latency by preventing event loop starvation.

### ⚙️ Implementation (Suggestion Only)
* **`Main.py`**: Refactor `AnswerQes` to accept `conversation_history` and `USERPROFILE` as arguments instead of using globals. Return the updated history.
* **`api.py`**:
    * Change `async def chat_query` to `def chat_query`.
    * Change `async def submit_assessment` to `def submit_assessment`.
    * Implement a session mechanism (even a simple `sessions = {}` dict keyed by a generated UUID passed in headers) to store the history and profile per user, fetching it before calling `Main.AnswerQes`.

### ⚠️ Trade-offs
* State must be managed explicitly by the caller (API layer) rather than implicitly by the LLM layer.
* In-memory session stores (if used as an intermediate step) will be lost on server restart, requiring a persistent database eventually.

---

# 📊 5. Scoring System

* **Impact:** 9 (Critical for concurrent usage and scaling).
* **Feasibility:** 8 (Relatively straightforward refactoring, no new major technologies needed).
* **Leverage:** 9 (High output vs. input ratio; small changes unlock multi-user capability).
* **Novelty:** 2 (Standard software engineering practices).
* **Scalability:** 10 (Directly enables horizontal and vertical scaling).

**Final Score Calculation:**
`Final Score = (9 × 0.30) + (9 × 0.25) + (10 × 0.20) + (2 × 0.15) + (8 × 0.10) = 2.7 + 2.25 + 2.0 + 0.3 + 0.8 = 8.05`

---

# 🧭 6. Prioritization Engine

### ⚡ Next (High Priority)
* **Stateless, Concurrent AI Companion Refactoring** (Score: 8.05)
* Justification: High score, critical for basic operational integrity (fixing state leakage), moderate effort. Should be executed immediately after the current sprint.

---

# ⚙️ 7. Execution Planner (Suggestion Mode Only)

### 🎯 Objective
Eliminate global state leakage and event loop blocking to enable multi-tenant concurrency.

### 🧩 Tasks Breakdown
1. **Remove Globals:** Modify `Main.py` to remove `global conversation_history` and `USERPROFILE`. Update function signatures (e.g., `AnswerQes`) to accept these as parameters.
2. **Session Management:** In `api.py`, implement a temporary dictionary-based session store `SESSION_STORE = {}` to hold `conversation_history` per user.
3. **Thread Pool Execution:** Convert `async def` endpoints in `api.py` that call synchronous code (`/chat/query`, `/user/assessment`) to standard `def` functions.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* **`Main.py`**:
    * Remove `conversation_history: list = []` and `USERPROFILE = {}` at the module level.
    * Update `def AnswerQes(query: str, history: list, profile: dict):`
    * Return `final_answer_content, updated_history`.
* **`api.py`**:
    * Change `@app.post("/chat/query") async def chat_query...` to `@app.post("/chat/query") def chat_query...`.
    * Manage user session based on an incoming identifier (e.g., header or query param), default to a single session if not provided for backward compatibility during transition.

### ⏱ Time Estimate
4-6 Hours

### 📈 Expected Outcome
System can handle multiple concurrent requests without state bleeding between users. API latency under load remains stable (no event loop blocking).

---

# 🤖 8. Execution Prompts Generator

### SYSTEM PROMPT
You are a senior backend engineer specializing in FastAPI and concurrent Python systems.

### TASK PROMPT
Refactor the provided FastAPI application and underlying LLM module to eliminate global state leakage and prevent event loop starvation.

### CONTEXT
The current system in `Main.py` uses global variables (`conversation_history`, `USERPROFILE`) to manage state, causing data leakage between requests. Additionally, FastAPI endpoints in `api.py` are defined as `async def` but execute blocking synchronous code (LLM invocations and file I/O), leading to event loop starvation.

### OUTPUT FORMAT
* Provide the refactored code for `Main.py`.
* Provide the refactored code for `api.py`.
* Include a brief explanation of how the changes resolve the concurrency and state issues.

---

# 🔁 9. Feedback Loop

### Evaluate
*(To be filled after execution)*
* Did it improve the metric? (Check concurrent user capacity and P99 latency).
* Any unintended issues? (Check if context is correctly maintained per session).

### Store
Results will be appended here.

### Refine
If in-memory sessions cause memory bloat, pivot to a Redis-backed session store or move conversation history storage to the client side.
