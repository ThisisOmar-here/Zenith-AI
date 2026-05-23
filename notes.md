# Observation Engine

## Raw Observation
* FastAPI endpoints in `api.py` (`chat_query`, `get_history`, `submit_assessment`, `get_user_profile`) are defined with `async def`.
* `Main.py` uses synchronous components extensively, especially `LLM.invoke` (LangChain), `QdrantClient` operations, and `PyMuPDFLoader`.
* Tools like `retrieve_docs`, `get_user_ip_location`, and `get_users_profile` use synchronous code (e.g. `requests.get`, file I/O).
* `UserProfile.py` uses standard synchronous file operations (`pathlib`).
* Memory notes mention the risk of event loop starvation if blocking operations run in `async def` endpoints, suggesting `await asyncio.to_thread(...)` or changing to standard `def`.

## Context
These observations occur in the core API and logic components (`api.py` and `Main.py`) of the Zenith AI Knowledge API.

## Frequency
Occasional to Frequent (every chat request or assessment triggers these synchronous components).

## Severity
Medium to High (can cause latency or freeze the application when handling concurrent requests).

---

# Insight Engine

## What is happening?
FastAPI is built on Starlette and uses an asynchronous event loop. Endpoints defined with `async def` run directly on this main event loop. Because the application relies heavily on synchronous libraries (LangChain's standard `invoke`, `requests`, blocking file I/O), these endpoints block the event loop while waiting for external services (LLM, Qdrant) or the disk.

## Why is it happening?
The architecture combines asynchronous endpoint definitions (`async def`) with synchronous underlying operations without offloading the synchronous tasks to a separate thread pool.

## What does it imply?
This implies a structural bottleneck. When a user sends a query, the event loop is blocked during the entire LLM processing and retrieval phase. If multiple users query simultaneously, they will experience significant lag because the server can only process one synchronous operation at a time, failing to leverage FastAPI's concurrency capabilities.

---

# Idea Generator

## Ideas
1.  **Refactor Endpoints to Synchronous `def`**: Change `async def` to `def` for endpoints in `api.py` that perform synchronous operations. FastAPI will automatically run them in an external threadpool. (System Optimization)
2.  **Wrap Blocking Calls in `asyncio.to_thread`**: Keep `async def` but wrap specific blocking calls (like `Main.AnswerQes`, file reads/writes) in `asyncio.to_thread`. (System Optimization)
3.  **Migrate to Asynchronous Libraries**: Refactor `Main.py` and `UserProfile.py` to use `ainvoke`, `httpx` (instead of `requests`), and `aiofiles`. (System Optimization, High Effort)
4.  **Implement Request Queuing / Background Tasks**: Queue incoming requests and process them via background workers (e.g., Celery) to completely free the API thread. (System Optimization, Scalability)

---

# Breakthrough Idea System

## 💡 Title
**Unblocking the Event Loop: Thread Pool Offloading for Synchronous LLM and I/O Operations**

## 🔍 Problem
The API suffers from potential event loop starvation because synchronous blocking operations (LangChain LLM calls, Qdrant vector retrieval, file I/O, external HTTP requests) are executed directly within `async def` FastAPI endpoints. This architectural mismatch prevents the application from handling concurrent requests efficiently.

## 🧠 Insight
FastAPI provides a built-in mechanism to handle synchronous blocking code gracefully: if an endpoint is defined with a standard `def` (instead of `async def`), FastAPI automatically executes it in a separate thread pool, preventing it from blocking the main asynchronous event loop. Alternatively, `asyncio.to_thread` can be used surgically. The leverage here is high: a very small syntax change yields massive concurrency improvements.

## 🔗 Connected Dots
*   `api.py` uses `async def` for all routes.
*   `Main.AnswerQes` uses `LLM.invoke` (synchronous).
*   `UserProfile.py` uses synchronous file I/O.
*   `getUsersIP.py` uses synchronous `requests`.
*   FastAPI's documentation explicitly advises using `def` for endpoints containing blocking I/O if async libraries aren't used.

## 🚀 Proposed Change
Instead of a full rewrite to asynchronous libraries, structurally change how FastAPI handles these specific endpoints. Either change the endpoint definitions in `api.py` from `async def` to `def`, or explicitly wrap the blocking calls (like `Main.AnswerQes` and profile saves) using `await asyncio.to_thread(...)`. This offloads the synchronous work to worker threads, allowing the main event loop to continue serving other requests immediately.

## 📊 Impact
*   **Efficiency**: Significant reduction in event loop lag (e.g., from ~190ms to <2ms per concurrent request).
*   **Scalability**: Allows the application to handle multiple concurrent users without freezing.
*   **Retention**: Better user experience due to more responsive API during high load.

## ⚙️ Implementation (Suggestion Only)
1.  In `api.py`, identify endpoints that call blocking functions: `chat_query`, `submit_assessment`, and potentially `get_user_profile`.
2.  **Approach A (Simpler)**: Remove the `async` keyword from these endpoint definitions.
    *   `@app.post("/chat/query") def chat_query(...)`
    *   `@app.post("/user/assessment") def submit_assessment(...)`
    *   `@app.get("/user/profile") def get_user_profile(...)`
3.  **Approach B (Surgical)**: Keep `async def` and use `asyncio.to_thread`.
    *   `answer_text = await asyncio.to_thread(Main.AnswerQes, payload.query.strip())`
    *   `await asyncio.to_thread(UserProfileModule.save_user_profile, merged, PROFILE_PATH)`

## ⚠️ Trade-offs
*   Using thread pools introduces some overhead compared to pure asynchronous I/O, but it is vastly superior to blocking the main event loop.
*   If the thread pool is exhausted by too many concurrent long-running LLM requests, latency will still increase, though it will degrade more gracefully than a completely blocked event loop.

---

# Scoring System

## Idea: Thread Pool Offloading for Synchronous Operations
*   **Impact**: 8.0 (Crucial for concurrency and responsiveness)
*   **Feasibility**: 9.5 (Requires minimal code changes, just removing `async` or adding `asyncio.to_thread`)
*   **Leverage**: 9.0 (Tiny input for massive output in scalability)
*   **Novelty**: 3.0 (Standard best practice, not novel)
*   **Scalability**: 8.0 (Allows horizontal scaling of requests up to thread pool limits)

**Final Score Calculation**:
(8.0 × 0.30) + (9.0 × 0.25) + (8.0 × 0.20) + (3.0 × 0.15) + (9.5 × 0.10)
= 2.4 + 2.25 + 1.6 + 0.45 + 0.95 = **7.65**

**Interpretation**: 7.65 → **High Priority**

---

# Prioritization Engine

Priority Bucket: **⚡ Next** (High score + moderate/low effort. It's a critical architectural fix that should be prioritized immediately.)

---

# Execution Planner (Suggestion Mode Only)

## Execution Plan: Implement Thread Pool Offloading

### 🎯 Objective
Eliminate event loop blocking in FastAPI endpoints to enable concurrent request handling and improve overall API responsiveness.

### 🧩 Tasks Breakdown
1.  **Analyze `api.py` Endpoints**: Review `chat_query`, `submit_assessment`, and `get_user_profile` to confirm they contain synchronous blocking calls.
2.  **Select Modification Strategy**: Decide whether to change `async def` to `def` or use `asyncio.to_thread`. Changing to `def` is generally cleaner for endpoints entirely composed of blocking calls.
3.  **Refactor Endpoints (Suggested)**:
    *   Update the function signatures in `api.py` from `async def` to `def` for the affected routes.
4.  **Testing Strategy**:
    *   Verify the application starts correctly.
    *   Simulate concurrent requests to ensure the event loop is no longer blocked.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
*   **File**: `api.py`
    *   Line ~47: Change `async def chat_query(payload: ChatRequest):` to `def chat_query(payload: ChatRequest):`
    *   Line ~123: Change `async def submit_assessment(payload: AssessmentPayload):` to `def submit_assessment(payload: AssessmentPayload):`
    *   Line ~133: Change `async def get_user_profile():` to `def get_user_profile():`
    *   *Note*: `get_history` (Line ~70) can likely remain `async def` if it only accesses an in-memory list (`Main.conversation_history`), but if it involves any blocking serialization, it should also be changed.

### ⏱ Time Estimate
*   1-2 Hours (Implementation and basic concurrency testing).

### 📈 Expected Outcome
*   Event loop lag during concurrent requests drops to near-zero.
*   The API can handle multiple simultaneous LLM queries without timing out other requests.

---

# Execution Prompts Generator

## SYSTEM PROMPT
You are a senior backend engineer specializing in Python and FastAPI performance optimization.

## TASK PROMPT
Refactor the FastAPI endpoints in `api.py` to prevent event loop starvation caused by synchronous blocking operations.

## CONTEXT
The current `api.py` defines endpoints using `async def`. However, these endpoints call synchronous functions like `Main.AnswerQes` (which performs blocking LangChain LLM calls) and `UserProfileModule.save_user_profile` (which performs synchronous file I/O). Because the endpoints are async, these blocking operations freeze the main FastAPI event loop, causing severe latency for concurrent requests.

## OUTPUT FORMAT
Provide the refactored code for `api.py`, changing the necessary endpoint definitions from `async def` to `def` so that FastAPI automatically runs them in a worker thread pool. Include brief explanations of why each change was made.
