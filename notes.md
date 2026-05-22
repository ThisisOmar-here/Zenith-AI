# Observation Engine

### State Leakage in Conversation and User Profile
* **Raw Observation:** The application uses global variables `conversation_history` and `USERPROFILE` in `Main.py` to store context, meaning concurrent API requests overwrite each other's data and expose user data to the wrong requests.
* **Context (where it occurs):** `Main.py` variables `conversation_history` and `USERPROFILE`.
* **Frequency:** Frequent (Every time concurrent users make API requests)
* **Severity:** High (Security and data privacy risk, system correctness failure)

### Synchronous LLM Calls in Asynchronous Endpoints
* **Raw Observation:** The FastAPI app uses `async def` for endpoints like `/chat/query` in `api.py` while calling synchronous LLM operations (e.g., `LLM_WITH_TOOLS.invoke` in `Main.py` and file I/O operations). This causes event loop starvation.
* **Context (where it occurs):** `api.py` and `Main.py` (FastAPI endpoints triggering blocking functions)
* **Frequency:** Frequent (Every API call blocks the server)
* **Severity:** High (Limits scalability and drastically increases response latency under load)

---

# Insight Engine

### State Leakage Insight
* **What is happening?** Global variables (`conversation_history`, `USERPROFILE`) are utilized to maintain state across interactions. Since FastAPI spins up asynchronous requests on a single worker's event loop, concurrent requests access and modify these exact same memory locations.
* **Why is it happening?** A misunderstanding of web server request lifecycles vs. stateful script memory led to variables being instantiated globally instead of inside the request scope.
* **What does it imply?** The current architectural model is fundamentally unscalable and poses a critical data privacy risk. It requires a stateless API design where the context (e.g., user profile, history) is either passed via the request, retrieved securely per user/session, or managed efficiently via a session cache/DB.

### Event Loop Starvation Insight
* **What is happening?** The asynchronous web server is processing synchronous I/O operations directly on the main event loop.
* **Why is it happening?** Endpoints are incorrectly defined using `async def` without wrapping synchronous logic like `LLM_WITH_TOOLS.invoke`, LangChain synchronous operations, and `pathlib` file IO in non-blocking primitives (like `asyncio.to_thread`).
* **What does it imply?** True concurrency is zero. Only one user can practically interact with the system at a time before experiencing massive lag. Wrapping blocking functions or converting endpoints to standard `def` introduces massive leverage in throughput with minimal code changes.

---

# Idea Generator

### Stateless Request Handling (System Optimization & Safety)
* **Description:** Refactor state management to eliminate global variables. User sessions, conversation histories, and profiles should be loaded and managed at the API endpoint level dynamically, preventing crosstalk and data leakage.
* **Addresses:** Solves state leakage and privacy bugs.
* **Introduces Leverage:** Ensures reliable scaling to thousands of users simultaneously.

### Non-blocking Thread Execution for I/O (System Optimization)
* **Description:** Convert synchronous blocks within `async def` endpoints to use `await asyncio.to_thread()` or revert endpoints to standard `def` so FastAPI handles them in a worker thread pool.
* **Addresses:** Solves event loop starvation.
* **Introduces Leverage:** Instant speed improvement. Drops event loop lag from ~190ms to <2ms, restoring application responsiveness for virtually zero cost.

---

# Breakthrough Idea System

### 💡 Title: The Stateless & Responsive Zenith Architecture

### 🔍 Problem
The application currently fails gracefully to scale beyond a single user because it relies on global variables for user state and blocks the async event loop with heavy, synchronous LangChain logic, making concurrent usage impossible and unsafe.

### 🧠 Insight
Both fundamental issues originate from treating a concurrent web framework (FastAPI) as a single-threaded script. Fixing the state problem ensures data integrity, and fixing the sync-blocking problem ensures massive scale. The leverage lies in addressing the thread pool execution and request-bound memory allocation simultaneously.

### 🔗 Connected Dots
* The global `conversation_history` causes data privacy issues.
* The blocking `LLM_WITH_TOOLS.invoke` causes severe latency issues.
* By moving state out of globals and into request context, and shifting synchronous workloads to the thread pool, the entire system becomes scalable instantly.

### 🚀 Proposed Change
Eliminate global variables in `Main.py`. Pass user ID or session ID through API requests, retrieve necessary history and profile data dynamically per request. Convert FastAPI endpoints that trigger LLM chains to standard `def` (or wrap their inner logic with `asyncio.to_thread`), allowing FastAPI to automatically utilize a thread pool to handle concurrent users without starving the main event loop.

### 📊 Impact
* **Revenue:** Increases server capacity limit, potentially allowing monetization through higher request volume.
* **Retention:** Decreases latency dramatically, making users significantly more likely to continue using the application.
* **Growth:** Resolves foundational blocker to adding multiple parallel users.
* **Efficiency:** Drastic improvement in event loop performance.

### ⚙️ Implementation (Suggestion Only)
1. **Remove Globals:** Strip `conversation_history` and `USERPROFILE` global assignments from `Main.py`.
2. **Context Passing:** Update `AnswerQes` to accept `conversation_history` and `USERPROFILE` as arguments, rather than pulling them globally. Update `api.py` to maintain these based on session/request context.
3. **Thread Pool Strategy:** Change `async def chat_query(...)` to `def chat_query(...)` in `api.py`. FastAPI will push this to an external thread pool automatically since it wraps synchronous LLM calls. Alternatively, if `async def` must be kept, use `await asyncio.to_thread(Main.AnswerQes, payload.query, ...)`.

### ⚠️ Trade-offs
* Removing globals means state must be persisted externally (e.g. redis or database), which might introduce minor DB read/write latency. However, this is negligible compared to event loop lag and infinitely safer.

---

# Scoring System

## The Stateless & Responsive Zenith Architecture

### Criteria
* **Impact (0-10):** 9.5 (Solves absolute show-stopping privacy and performance bugs)
* **Feasibility (0-10):** 8.0 (Requires light refactoring of function signatures and endpoint definitions)
* **Leverage (0-10):** 9.0 (Transforms 1-user script into an N-user application)
* **Novelty (0-10):** 3.0 (Standard web development practices, not novel)
* **Scalability (0-10):** 9.5 (Essential foundational step for scale)

### Final Score Calculation
Final Score =
(9.5 × 0.30) +
(9.0 × 0.25) +
(9.5 × 0.20) +
(3.0 × 0.15) +
(8.0 × 0.10)
= 2.85 + 2.25 + 1.9 + 0.45 + 0.8 = **8.25**

---

# Prioritization Engine

### Priority Bucket: ⚡ Next
The score of 8.25 falls into the High Priority category. It is essential for scale and correctness, and the effort is moderate. It should be addressed immediately in the next cycle.

---

# Execution Planner

## Execution Plan: Implement Stateless & Responsive Architecture

### 🎯 Objective
Eliminate data leakage across concurrent users and restore sub-2ms event loop latency.

### 🧩 Tasks Breakdown
1. **Refactor `Main.py` State:** Remove global variables `conversation_history` and `USERPROFILE`.
2. **Modify Signatures:** Change `AnswerQes` to accept parameters for history and profile state.
3. **Update API Integration:** In `api.py`, manage the user's history and profile based on request scope or session headers, passing them directly into `AnswerQes`.
4. **Fix Event Loop Starvation:** Modify `chat_query` in `api.py` from `async def` to `def`, or wrap the internal synchronous LLM/IO logic with `asyncio.to_thread`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* **`Main.py`:** Delete `conversation_history: list = []` and `USERPROFILE = {}`. Add them as parameters to `AnswerQes(query: str, history: list, profile: dict)`.
* **`api.py`:** Change `@app.post("/chat/query") async def chat_query...` to `@app.post("/chat/query") def chat_query...` to execute in a separate thread.

### ⏱ Time Estimate
* 4 - 8 Hours

### 📈 Expected Outcome
* Event loop latency under blocking operations reduced from >100ms to <2ms. Data state leakage completely resolved.

---

# Execution Prompts Generator

### SYSTEM PROMPT
You are a senior Backend Engineer specialized in FastAPI, Python concurrency, and state management.

### TASK PROMPT
Refactor the FastAPI application to eliminate global state variables causing data leakage and resolve event loop starvation caused by synchronous operations inside asynchronous endpoints.

### CONTEXT
The application (`Main.py` and `api.py`) relies on synchronous LangChain `invoke` calls and file IO operations. Because it uses global variables `conversation_history` and `USERPROFILE`, concurrent requests overwrite state. Because these synchronous operations run inside `async def` endpoints, the event loop starves.

### OUTPUT FORMAT
* A detailed list of files modified.
* The refactored code for `Main.py` and `api.py`.
* A brief explanation of how thread pools (`asyncio.to_thread` or standard `def` endpoints) are being utilized.

---

# Feedback Loop

### Evaluate
* Did it improve the metric? Pending implementation. Expected: Zero state leakage and normal web server concurrency.
* Any unintended issues? Pending implementation.

### Store
* Results to be logged in `notes.md` upon completion.

### Refine
* If database/Redis caching is needed later for performance, re-evaluate the architecture for managing the stateless session data.
