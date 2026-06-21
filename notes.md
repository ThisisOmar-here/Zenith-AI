# 🧠 Autonomous Idea Engine System (SaaS Builder Integration)

## 1. Observation Engine
**Raw Observation:** The application uses synchronous `invoke` methods from LangChain within asynchronous FastAPI endpoints (`chat_query` in `api.py`), causing event loop starvation. The state management in `Main.py` relies on global variables (`conversation_history`, `USERPROFILE`) to manage user context.
**Context:** `Main.py` functions like `AnswerQes` and `run_retrieval_pipeline` use blocking operations. The application stores context in global lists/dicts, meaning concurrent requests will overwrite or mix data.
**Frequency:** Frequent (every single chat interaction)
**Severity:** High (critical architectural bottleneck and severe data leakage risk)

## 2. Insight Engine
**What is happening?** The chat endpoint processes blocking I/O (LLM generation, vector retrieval) synchronously on the main thread, freezing the async event loop. Furthermore, user state is globally bound, making multi-tenant concurrency impossible.
**Why is it happening?** FastAPI uses Starlette's async event loop. Since `chat_query` is defined as `async def` but calls blocking functions, the thread pool isn't utilized. Additionally, the system lacks a session management layer, dumping all user requests into a single global state object.
**What does it imply?** The application is fundamentally unscalable. Two simultaneous users will share conversation history. Any single slow request will lock up the entire server for all users. The infrastructure needs a pivot from single-user prototype to multi-tenant async backend.

## 3. Idea Generator
**Feature Expansion:** Session Management Layer.
**System Optimization:** Wrap blocking calls in `asyncio.to_thread` or transition `async def` to `def` for threadpool delegation.
**Monetization:** None directly, but prevents total failure on scaling.
**UX Transformation:** Seamless multi-user interaction without cross-talk.
**Growth Mechanism:** System stability allows the SaaS to actually function for more than one user.

## 4. Breakthrough Idea System

### 💡 Title
The Asynchronous Multi-Tenant Core Pivot

### 🔍 Problem
The current architecture collapses under concurrent load due to event loop starvation and globally shared user state, preventing the application from functioning as a SaaS.

### 🧠 Insight
Fixing event loop starvation (via `asyncio.to_thread` or removing `async`) solves the freezing, but exposes the deeper issue: global state. By untangling the global `conversation_history` into session-specific stores, the application can naturally scale across multiple users without cross-talk, unlocking true SaaS capability.

### 🔗 Connected Dots
Blocking LLM calls + Async FastAPI + Global variables = Single-user prototype.
Thread delegation + Session dicts + FastAPI Dependency Injection = Scalable Multi-tenant System.

### 🚀 Proposed Change
Implement a session manager using a dictionary mapped by session IDs. Pass the session ID through the API. Modify `AnswerQes` to accept a session ID, fetch the specific user's history and profile, and execute the synchronous LangChain logic via `asyncio.to_thread` inside the FastAPI route to unblock the server.

### 📊 Impact
- **Efficiency:** Server throughput increases drastically as the event loop is freed.
- **Scalability:** System can support hundreds of concurrent users instead of exactly one.
- **Retention:** Users won't experience mixed conversations or infinite loading screens.

### ⚙️ Implementation (Suggestion Only)
1. **Refactor `Main.py`:** Remove global `conversation_history` and `USERPROFILE`. Create a `SessionManager` class to hold `dict[session_id, dict]`.
2. **Update `AnswerQes`:** Pass `session_id` to this function. Retrieve history/profile from the `SessionManager`.
3. **Optimize `api.py`:** Update the `chat_query` endpoint to accept a `session_id` header or body parameter. Wrap the call to `AnswerQes` in `await asyncio.to_thread(AnswerQes, query, session_id)`.

### ⚠️ Trade-offs
- Increased memory usage due to keeping multiple session histories in RAM.
- Potential need for a Redis or database layer if memory usage becomes too high or horizontal scaling is required.

## 5. Scoring System
- **Impact:** 10 (Fixes critical blocking issue and data leak)
- **Feasibility:** 8 (Straightforward refactoring)
- **Leverage:** 9 (Unlocks the ability to serve multiple users)
- **Novelty:** 2 (Standard engineering practice)
- **Scalability:** 10 (Directly enables scaling)
**Final Score:** (10 * 0.30) + (9 * 0.25) + (10 * 0.20) + (2 * 0.15) + (8 * 0.10) = 3.0 + 2.25 + 2.0 + 0.3 + 0.8 = **8.35**

## 6. Prioritization Engine
**🔥 Now / High Priority** (Score: 8.35)
This is the most critical foundation to fix before any new features are added.

## 7. Execution Planner (Suggestion Mode Only)

### 🎯 Objective
Eliminate event loop starvation and isolate user state to enable concurrent multi-tenant usage.

### 🧩 Tasks Breakdown
1. **Remove Global State:** Eliminate `conversation_history` and `USERPROFILE` globals in `Main.py`.
2. **Implement Session Management:** Introduce a lightweight dictionary-based session store mapping session IDs to history and profiles.
3. **Refactor Entry Point:** Modify `AnswerQes` to accept `session_id` and manage state locally per execution.
4. **Thread Delegation:** Modify `api.py` to use `asyncio.to_thread` for the `AnswerQes` call.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
- **`Main.py`**:
  - Delete `conversation_history = []` and `USERPROFILE = {}`.
  - Add `SESSIONS = {}`.
  - Update `AnswerQes(query, session_id="default")` to retrieve and update `SESSIONS[session_id]['history']` and `SESSIONS[session_id]['profile']`.
- **`api.py`**:
  - Import `asyncio`.
  - In `chat_query`, call `await asyncio.to_thread(Main.AnswerQes, request.query, request.session_id)`.

### ⏱ Time Estimate
2-4 Hours

### 📈 Expected Outcome
Concurrent requests will process without blocking the server, and users will have isolated chat contexts.

## 8. Execution Prompts Generator

### SYSTEM PROMPT
You are a Senior Backend Engineer specializing in Python, FastAPI, and asynchronous system architecture.

### TASK PROMPT
Refactor the current AI chat application to eliminate event loop starvation and remove global state dependencies, enabling multi-tenant concurrency.

### CONTEXT
The FastAPI application currently defines an `async def chat_query` endpoint that directly calls synchronous LangChain blocking methods (`Main.AnswerQes`). Furthermore, `Main.py` stores user context in global variables (`conversation_history`, `USERPROFILE`), causing data leakage across concurrent requests. We need to introduce basic session management and use `asyncio.to_thread` to unblock the event loop.

### OUTPUT FORMAT
- A detailed explanation of the proposed changes.
- The modified code for `Main.py` (showing the session management logic).
- The modified code for `api.py` (showing the `asyncio.to_thread` implementation).
- A checklist for verifying the fix.

## 9. Feedback Loop
### Evaluate
(Pending execution by an external system) Metrics to track: response time under concurrent load (should remain stable), cross-user data bleed (should be 0).
### Store
Results will be logged in `notes.md` upon completion.
### Refine
If in-memory dict grows too large, transition to Redis for session storage.
