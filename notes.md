# Observation Engine

* **Raw Observation:** The application relies on a global variable (`conversation_history`) in `Main.py` to manage user state.
* **Context:** State management for incoming requests in the backend logic.
* **Frequency:** Frequent (every user interaction).
* **Severity:** High (Causes cross-user state leakage during concurrent requests).

* **Raw Observation:** Synchronous operations (LangChain `invoke` methods and file I/O in `UserProfile.py`) are executing inside `async def` FastAPI endpoints without offloading.
* **Context:** `api.py` and `Main.py` request handling.
* **Frequency:** Frequent (every chat and profile request).
* **Severity:** High (Event loop starvation and blocking).

# Insight Engine

* **What is happening?**
  Global state is shared across all concurrent requests, causing cross-user data leakage. Concurrently, synchronous I/O operations inside `async def` endpoints are blocking the event loop.
* **Why is it happening?**
  There is no session management or user context tracking implemented. Furthermore, FastAPI's async endpoints are executing blocking operations on the main thread instead of using `asyncio.to_thread` or thread-pooled `def` endpoints.
* **What does it imply?**
  The system cannot safely scale to multiple concurrent users. A single user can see another's history (privacy violation), and requests will bottleneck and timeout under load due to event loop starvation. The hidden leverage is in proper request isolation and thread offloading, which instantly unlocks scalability.

# Idea Generator

* **Idea 1 (System Optimization):** Refactor state management to use session IDs/tokens and store state in memory or Redis per session instead of globally.
* **Idea 2 (System Optimization):** Use `asyncio.to_thread` for all synchronous I/O operations (LangChain, file writes) within the `async def` endpoints, or change the endpoints to standard `def`.

# Breakthrough Idea System

## 💡 Title
Asynchronous State Isolation & Event Loop Rescue

## 🔍 Problem
Global state leakage causing privacy risks, combined with blocking operations starving the FastAPI event loop, severely limits concurrency.

## 🧠 Insight
Moving synchronous operations to thread pools and replacing global variables with session-scoped storage provides immense leverage for scalability with relatively low effort. The architectural risk of state leakage is a critical blocker for production.

## 🔗 Connected Dots
Thread-pooling + Session-based state management = Production-ready multi-user scalability.

## 🚀 Proposed Change
Isolate state using session tracking (e.g., via headers or tokens) and offload synchronous blocking I/O calls to threads (or refactor FastAPI endpoints to synchronous `def`).

## 📊 Impact
Dramatically improves scalability, eliminates cross-user data leakage (protecting retention and trust), and allows high concurrency (improving efficiency).

## ⚙️ Implementation (Suggestion Only)
1. Implement Session Middleware or Dependency Injection in FastAPI to extract and pass session IDs.
2. Replace the global `conversation_history` in `Main.py` with a session store (e.g., an in-memory dictionary or Redis) keyed by user/session ID.
3. Update `api.py` to either use `def` for blocking endpoints or wrap blocking calls like `Main.AnswerQes` and `UserProfileModule.save_user_profile` with `await asyncio.to_thread(...)`.

## ⚠️ Trade-offs
Increases memory usage slightly by storing state per session. Adds minor complexity to state management compared to a simple global array.

# Scoring System

* **Impact (10):** Critical for revenue, retention, and growth by fixing fatal scalability and privacy flaws.
* **Feasibility (8):** Relies on standard refactoring patterns (session management, thread pooling).
* **Leverage (9):** High output for the input; minimal code changes unlock massive concurrency.
* **Novelty (5):** Standard backend engineering best practice, not highly novel.
* **Scalability (10):** Fundamentally enables the application to scale horizontally and vertically.

**Final Score Calculation:**
Final Score = (10 * 0.30) + (9 * 0.25) + (10 * 0.20) + (5 * 0.15) + (8 * 0.10)
Final Score = 3.0 + 2.25 + 2.0 + 0.75 + 0.8 = 8.8

# Prioritization Engine

* **Priority:** 🔥 Now (Score 8.8 - High priority, Breakthrough)

# Execution Planner

## 🎯 Objective
Isolate user state and prevent event loop starvation.

## 🧩 Tasks Breakdown
1. Introduce session tracking in `api.py` (e.g., via custom headers).
2. Move global state to a session store in `Main.py`.
3. Wrap blocking I/O in `await asyncio.to_thread` or switch `async def` to `def` in `api.py`.

## 🧑‍💻 Code-Level Changes (Descriptive Only)
* **Files to modify:** `api.py`, `Main.py`
* **Logic to add/remove:**
  * Remove `conversation_history = []` global definition in `Main.py`. Add a session dictionary.
  * Update `Main.AnswerQes` to accept a session ID and use the appropriate history.
  * In `api.py`, extract session ID from request headers. Change `async def chat_query` to `def chat_query` or use `asyncio.to_thread`.
* **APIs or systems involved:** FastAPI endpoints, LangChain invocations, UserProfile I/O.

## ⏱ Time Estimate
2 - 3 Days

## 📈 Expected Outcome
100% elimination of cross-user state leakage, 10x improvement in concurrent request handling without timeouts.

# Execution Prompts Generator

## SYSTEM PROMPT
You are a senior backend engineer specializing in FastAPI and concurrent systems.

## TASK PROMPT
Refactor the FastAPI application to eliminate global state leakage and prevent event loop starvation caused by synchronous operations in async endpoints.

## CONTEXT
The application currently uses a global `conversation_history` array in `Main.py`, causing cross-user state leakage on concurrent requests. Additionally, synchronous LangChain invocations and file I/O operations are placed inside `async def` endpoints in `api.py` without thread offloading, blocking the event loop.

## OUTPUT FORMAT
* Code (Provide updated descriptive code blocks for `api.py` and `Main.py`)
* Explanation (Explain the use of session keys and thread pools)
* Integration steps (How to test the changes)

# Feedback Loop

* **Evaluate:** Monitor concurrent request metrics and verify isolated user sessions using performance benchmark tests.
* **Store:** Results and further observations will be logged in `notes.md`.
* **Refine:** If the in-memory session dict grows too large, suggest a transition to Redis with TTL.
