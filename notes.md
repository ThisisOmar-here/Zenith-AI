# Autonomous Idea Engine Notes

## Observation Engine
* **Raw Observation:** The `Main.py` module stores user state globally in `conversation_history` and `USERPROFILE`.
* **Context:** In `Main.py`, used across concurrent requests in `api.py`.
* **Frequency:** Frequent (Every user request)
* **Severity:** High (State leakage across users)

* **Raw Observation:** Synchronous LLM invocations and file I/O block the event loop in `api.py`.
* **Context:** FastAPI endpoints calling `Main.AnswerQes`, `UserProfileModule.load_user_profile`, and synchronous Qdrant/Langchain methods.
* **Frequency:** Frequent (Every chat request)
* **Severity:** High (Event loop starvation)

## Insight Engine
* **What is happening:** Global variables are used to maintain user states and `async def` FastAPI endpoints perform synchronous I/O operations without offloading to threads.
* **Why is it happening:** The initial MVP design favored simplicity (global variables and direct synchronous calls) over concurrent multi-user architectural patterns.
* **What does it imply:** The application is fundamentally broken for concurrent use. One user will see another user's chat history and profile. Furthermore, the single-threaded asynchronous event loop will freeze on every request, creating massive lag (from ~190ms to <2ms per blocking call if fixed) for all concurrent users.

## Idea Generator
* **Idea:** Isolate user states and unblock the event loop. Transition from global variables to session-based or request-bound state management, and wrap synchronous I/O calls in `asyncio.to_thread()` or define endpoints as `def` instead of `async def`.
* **Idea Type:** System Optimization
* **Requirement Check:** Solves critical limitations (concurrent safety, latency), introduces scale leverage, logically sound.

## Breakthrough Idea System

### 💡 Title
Scalable Concurrent Architecture Transformation

### 🔍 Problem
The current application architecture uses global variables (`conversation_history` and `USERPROFILE` in `Main.py`) which leads to severe state leakage across concurrent users. Concurrently, synchronous LLM and file I/O operations inside `async def` endpoints cause event loop starvation, drastically degrading performance.

### 🧠 Insight
Fixing these foundational architecture flaws is mandatory before any scaling or feature expansion. Global state in web applications guarantees data cross-contamination, and blocking the event loop neuters FastAPI's concurrency benefits. The leverage hidden here is achieving robust, safe scale with zero new infrastructure by simply correcting structural patterns.

### 🔗 Connected Dots
* Global state (`conversation_history`, `USERPROFILE`) -> State Leakage
* Synchronous I/O in `async def` -> Event Loop Starvation
* Combined -> A system that cannot support more than one user safely or performantly.

### 🚀 Proposed Change
Refactor the state management to pass user contexts (e.g., history, profile) explicitly to functions or bind them to user sessions/requests, completely removing global mutable state from `Main.py`. Convert blocking FastAPI endpoints to use `def` instead of `async def` (which runs them in a threadpool) or use `await asyncio.to_thread(...)` for specific blocking calls to prevent event loop starvation.

### 📊 Impact
* **Revenue/Retention:** Critical for retention. Users seeing other people's chats is an instant churn event and a severe privacy violation.
* **Efficiency:** Eliminating event loop lag will drop response blocking time drastically (e.g., from ~190ms to <2ms per blocking call context).

### ⚙️ Implementation (Suggestion Only)
* Analyze all usages of `conversation_history` and `USERPROFILE` in `Main.py`.
* Suggest modifying `Main.AnswerQes` to accept `conversation_history` and `USERPROFILE` as parameters rather than referencing globals.
* Suggest modifying `api.py` to maintain these states per-session or pass them explicitly.
* Suggest changing `async def chat_query` to `def chat_query` in `api.py` since `Main.AnswerQes` uses synchronous LangChain `invoke` methods.
* Suggest wrapping file I/O in `UserProfileModule` with `asyncio.to_thread` if used within an `async def` endpoint.

### ⚠️ Trade-offs
* Requires significant refactoring of the core data flow between `api.py` and `Main.py`.
* Thread pools for blocking operations consume slightly more memory than pure async I/O, but it is necessary since the underlying libraries (LangChain synchronous invokes, `requests` in `getUsersIP.py`, etc.) are synchronous.

## Scoring System
* **Impact (0-10):** 10 (Fixes critical privacy and performance blockers)
* **Feasibility (0-10):** 8 (Requires refactoring but no new technologies)
* **Leverage (0-10):** 9 (Unlocks actual multi-user scale)
* **Novelty (0-10):** 2 (Standard software engineering practice)
* **Scalability (0-10):** 10 (Directly enables horizontal and vertical scale)

**Final Score:**
(10 * 0.30) + (9 * 0.25) + (10 * 0.20) + (2 * 0.15) + (8 * 0.10)
= 3.0 + 2.25 + 2.0 + 0.3 + 0.8 = 8.35

## Prioritization Engine
**Priority:** ⚡ Next (High Priority - Score: 8.35) - Critical foundational fix, moderate effort.

## Execution Planner
### 🎯 Objective
Eliminate state leakage and event loop starvation to ensure safe, performant concurrent usage.

### 🧩 Tasks Breakdown
1. Identify all global mutable state in `Main.py`.
2. Propose a new signature for `AnswerQes` that takes state as input.
3. Propose updates to `api.py` to store state per-user (e.g., in a dictionary keyed by session/user ID or in a database).
4. Identify all `async def` endpoints in `api.py` calling synchronous functions.
5. Propose changing them to `def` or wrapping calls in `asyncio.to_thread`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* **`Main.py`:** Remove `conversation_history` and `USERPROFILE` globals. Update `AnswerQes`, `summarize_history_if_needed`, and `get_usersprofile` to accept and return state.
* **`api.py`:** Change `async def chat_query` to `def chat_query` (or use `asyncio.to_thread`). Introduce a mechanism to track state per user/session.
* **`UserProfile.py`:** Update to ensure thread-safe file I/O or recommend async file I/O if staying within `async def`.

### ⏱ Time Estimate
2-3 Days

### 📈 Expected Outcome
Zero state leakage between concurrent requests. Event loop starvation eliminated, improving concurrent throughput dramatically.

## Execution Prompts Generator

### SYSTEM PROMPT
You are a senior backend engineer specializing in FastAPI, concurrency, and scalable architecture.

### TASK PROMPT
Refactor the provided FastAPI application to eliminate global state leakage and resolve event loop starvation caused by synchronous operations inside async endpoints.

### CONTEXT
The current codebase (`Main.py` and `api.py`) uses global variables (`conversation_history`, `USERPROFILE`) to store user state, causing data to leak between concurrent requests. Additionally, `api.py` defines endpoints as `async def` but calls synchronous LangChain methods and file I/O, which blocks the event loop and starves other requests.

### OUTPUT FORMAT
* Refactored `Main.py` code snippet showing state passed as parameters.
* Refactored `api.py` code snippet showing proper endpoint definitions (`def` instead of `async def` for synchronous workloads) and state management.
* Explanation of the architectural changes.

## Feedback Loop
* **Evaluate:** TBD - Wait for external execution to measure concurrent request latency and verify isolated user states.
* **Store:** Results will be logged back here upon completion.
* **Refine:** If `def` endpoints consume too many thread pool workers, evaluate migrating to fully async LangChain versions (`ainvoke`) in the future.
