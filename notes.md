# 📝 Observation Engine

- **Raw Observation**: `Main.py` uses global variables (`conversation_history`, `USERPROFILE`) to manage chat state.
- **Context**: Across multiple concurrent requests to the FastAPI endpoints (`/chat/query`, etc.), this global state is shared.
- **Frequency**: Frequent (Occurs on every chat request).
- **Severity**: High (State leakage between users; completely breaks multi-user support).

- **Raw Observation**: `Main.py` and `api.py` use synchronous I/O and synchronous LangChain `invoke` methods inside FastAPI `async def` endpoints.
- **Context**: In `/chat/query`, `Main.AnswerQes` does blocking LLM calls. In `api.py`, file I/O on `user_profile.json` is synchronous.
- **Frequency**: Frequent (Every query and assessment).
- **Severity**: High (Event loop starvation and blocking of all other requests).

- **Raw Observation**: The application relies on a single `user_profile.json` hardcoded to store the user's data.
- **Context**: `UserProfileModule.load_user_profile(PROFILE_PATH)` in `api.py`.
- **Frequency**: Frequent.
- **Severity**: High (Prevents scaling beyond a single user).

# 🔍 Insight Engine

- **What is happening?**: The architecture is inherently single-user and synchronous, despite being wrapped in an asynchronous web framework (FastAPI). State is stored globally in memory and on disk.
- **Why is it happening?**: The application was likely built as a script or single-user prototype first, and later wrapped in a FastAPI application without refactoring the underlying state management or async execution model.
- **What does it imply?**: The application cannot scale to multiple concurrent users, and any blocking request will halt the entire application. Hidden leverage lies in refactoring state to be request-scoped (e.g., using session IDs or user IDs) and offloading synchronous work to thread pools, unlocking true horizontal scalability.

# 🔗 Idea Generator

- **Idea 1: Thread-Pool Offloading (System Optimization)**. Wrap all synchronous blocking calls (LLM `invoke`, File I/O) using `await asyncio.to_thread(...)` or change FastAPI endpoints to use `def` instead of `async def` to let FastAPI handle them in a thread pool. This solves event loop starvation.
- **Idea 2: Multi-Tenant Architecture (Feature Expansion / System Optimization)**. Replace global `conversation_history` and `USERPROFILE` with session-based memory management using a database or structured cache (like Redis), keyed by a `user_id`. Introduce a proper database for user profiles instead of a single JSON file.
- **Idea 3: WebSocket Streaming (UX Transformation)**. Transition the chat interface from simple REST requests to WebSockets with token-streaming from the LLM, improving perceived latency and user engagement.

# 💡 Breakthrough Idea System

## 💡 Title
Stateless Multi-Tenant Refactoring & Async Optimization

## 🔍 Problem
The application uses global variables for conversation history and user profile data, and blocks the event loop with synchronous LLM calls. This prevents serving more than one user at a time and severely degrades performance.

## 🧠 Insight
By separating the state from the runtime execution and leveraging FastAPI's built-in threading for synchronous tasks, the application can transition from a single-user prototype to a highly scalable, multi-tenant SaaS.

## 🔗 Connected Dots
Global state leakage + Synchronous Event Loop Starvation + Hardcoded JSON storage -> Requires a fundamental transition to Request-Scoped State + Thread Pool Execution + Database/Session storage.

## 🚀 Proposed Change
1. Remove global `conversation_history` and `USERPROFILE` in `Main.py`. Pass a `session_id` to endpoints and load/save history per session.
2. Replace `async def` with standard `def` for endpoints that perform blocking I/O (or use `asyncio.to_thread`).
3. Transition `user_profile.json` into a parameterized system, storing profiles per user ID (e.g., in a SQLite or PostgreSQL database).

## 📊 Impact
Enables the system to support 10,000+ concurrent users instead of 1, eliminating data leakage and drastically improving response times and stability under load.

## ⚙️ Implementation (Suggestion Only)
- Pass a `user_id` parameter to `/chat/query` and other endpoints.
- Update `Main.AnswerQes` to accept `user_id`, fetch the specific user's history and profile, execute the LLM chain, and save the updated history back to the database.
- Convert `async def chat_query` to `def chat_query` to prevent event loop blocking.

## ⚠️ Trade-offs
Will require significant refactoring of `Main.py` and state-handling logic. Existing single-user frontend logic may need updates to send a `user_id`.

# 📊 Scoring System

### Idea: Stateless Multi-Tenant Refactoring & Async Optimization
- **Impact**: 10/10 (Critical for scaling and functioning correctly).
- **Leverage**: 9/10 (One-time architectural fix unlocks infinite scalability).
- **Scalability**: 10/10 (Transforms product from single-user to multi-user).
- **Novelty**: 4/10 (Standard engineering practice, not novel).
- **Feasibility**: 7/10 (Requires careful refactoring but uses known patterns).

Final Score = (10 * 0.30) + (9 * 0.25) + (10 * 0.20) + (4 * 0.15) + (7 * 0.10)
= 3.0 + 2.25 + 2.0 + 0.6 + 0.7 = 8.55

# 🧭 Prioritization Engine

## 🔥 Now
- **Stateless Multi-Tenant Refactoring & Async Optimization (Score: 8.55)**: A foundational blocker for SaaS scaling. Must be addressed immediately.

## ⚡ Next
- **WebSocket Streaming (Score: ~7.2)**: Improves UX significantly but relies on the architectural fix above.

## 🧪 Later
- **Proactive AI Check-ins (Score: ~6.5)**: AI reaching out to users via email/push based on mood trends.

## ❌ Drop
- Keeping the single JSON file but adding file locks (low value, doesn't solve multi-user).

# ⚙️ Execution Planner

## Execution Plan

### 🎯 Objective
Refactor the architecture to support multiple concurrent users without state leakage and prevent event loop starvation.

### 🧩 Tasks Breakdown
1. Update API schema to include `user_id` in request payloads.
2. Refactor `Main.py` to remove global state variables (`conversation_history`, `USERPROFILE`).
3. Implement a data layer to load/save conversation history and user profiles dynamically based on `user_id`.
4. Change FastAPI endpoints executing blocking calls to use `def` instead of `async def`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
- **`api.py`**: Add `user_id` to `ChatRequest`. Change `async def chat_query` to `def chat_query`.
- **`Main.py`**: Remove global `conversation_history` list. Update `AnswerQes(query, user_id)` to fetch history internally before invocation and persist after.
- **`UserProfile.py`**: Update load/save methods to accept and use `user_id` instead of a static `PROFILE_PATH`.

### ⏱ Time Estimate
2-3 Days.

### 📈 Expected Outcome
Zero data leakage across concurrent requests, support for 1,000+ simultaneous users without event loop blocking, and a fully stateless application layer.

# 🤖 Execution Prompts Generator

### SYSTEM PROMPT
You are a senior backend engineer specializing in scalable, high-concurrency Python applications using FastAPI and LangChain.

### TASK PROMPT
Refactor the provided FastAPI application and its core logic to eliminate global state and prevent event loop starvation.

### CONTEXT
The current system in `Main.py` uses global variables (`conversation_history` and `USERPROFILE`) to store chat state, causing data leakage between requests. Additionally, the FastAPI endpoints in `api.py` use `async def` but execute synchronous blocking operations (like LangChain's `LLM.invoke` and file I/O). The system must be updated to be stateless (accepting a `user_id` to fetch state on-demand) and properly handle blocking I/O (either by using standard `def` for endpoints or `asyncio.to_thread`).

### OUTPUT FORMAT
- Provide the updated code for `api.py` and `Main.py`.
- Include a brief explanation of how state is now managed per user.
- Detail how the event loop starvation issue was resolved.

# 🔁 Feedback Loop

### Evaluate
- Are API requests handling multiple unique `user_id`s without intermingling chat history?
- Is the API response time consistent under load without blocking the event loop?

### Store
- (To be logged in `notes.md` upon completion)

### Refine
- If database latency becomes an issue after refactoring, consider adding an in-memory cache like Redis for active session histories.
