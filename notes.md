# 📝 1. Observation Engine
* **Raw Observation**: `Main.py` relies on global variables (`conversation_history` and `USERPROFILE`) to manage user state.
* **Context**: User interactions in `Main.py` and `api.py`.
* **Frequency**: Frequent (every request).
* **Severity**: High (risk of state leakage across concurrent requests).

* **Raw Observation**: FastAPI endpoints like `/chat/query` use `async def` but call synchronous, blocking LLM invoke methods and file I/O operations directly.
* **Context**: `api.py` endpoints and `Main.py` LLM chains.
* **Frequency**: Frequent (every request).
* **Severity**: High (causes event loop starvation, blocking other async requests).

# 🔍 2. Insight Engine
* **What is happening?**: The FastAPI server handles requests concurrently, but the shared global variables mean different users might overwrite each other's session data. Furthermore, `async def` endpoints are running synchronous blocking code.
* **Why is it happening?**: The design originated as a single-user prototype without session isolation, and synchronous code wasn't wrapped in thread pools.
* **What does it imply?**: As user concurrency grows, users will see others' messages or profiles, and the server will lock up under load due to the event loop blocking. The system lacks horizontal scalability and multi-tenant isolation.

# 🔗 3. Idea Generator
* **Idea 1: Thread-Pool I/O Delegation (System Optimization)**: Wrap synchronous LLM calls and file I/O using `await asyncio.to_thread(...)` or convert `async def` endpoints to `def` so FastAPI handles them in a thread pool, preventing event loop starvation.
* **Idea 2: Request-Scoped State Management (System Optimization)**: Replace global variables `conversation_history` and `USERPROFILE` with request-scoped dependency injection or external session storage (e.g., Redis or in-memory dictionary keyed by session ID) to isolate user states.
* **Idea 3: Complete Async Refactoring (System Optimization)**: Migrate from synchronous LangChain `invoke` methods to `ainvoke` and use async file I/O libraries to natively support the async ecosystem.

# 💡 4. Breakthrough Idea System

### 💡 Title
Thread-Safe Concurrent User State & Non-Blocking API Architecture

### 🔍 Problem
The application suffers from state leakage due to global variables for `conversation_history` and `USERPROFILE`, and experiences event loop starvation because synchronous blocking tasks are run directly within `async def` endpoints.

### 🧠 Insight
Fixing event loop starvation and state leakage simultaneously transforms the app from a single-user prototype into a production-ready, highly concurrent backend. Leveraging standard FastAPI thread-pooling (`def`) or `asyncio.to_thread` requires minimal structural rewrite while yielding massive scalability gains.

### 🔗 Connected Dots
Combining Request-Scoped State Management (Idea 2) with Thread-Pool I/O Delegation (Idea 1) creates a resilient, multi-tenant system without needing heavy external dependencies (like Redis) right away.

### 🚀 Proposed Change
1. Remove global `conversation_history` and `USERPROFILE` from `Main.py`. Pass state explicitly per request based on a user/session ID.
2. Change the FastAPI endpoint definitions from `async def` to `def`, or wrap the blocking synchronous functions (LLM calls and `UserProfile.py` I/O) in `await asyncio.to_thread(...)`.

### 📊 Impact
Eliminates data leakage across users. Prevents server unresponsiveness during heavy LLM/IO operations, allowing 10x to 100x more concurrent users depending on the thread pool size.

### ⚙️ Implementation (Suggestion Only)
- Modify `Main.py` functions to accept `history` and `profile` as arguments rather than modifying globals.
- Update `api.py` endpoints to instantiate or fetch state based on a session token.
- Convert `async def chat_query` to `def chat_query`, or use `asyncio.to_thread(Main.AnswerQes, ...)`.

### ⚠️ Trade-offs
Using thread pools for blocking operations increases memory overhead compared to pure async code. Managing session state in-memory will still reset on server restart; a database will eventually be needed for persistence.

# 📊 5. Scoring System

* **Impact**: 9 (Crucial for correct operation and concurrency)
* **Feasibility**: 8 (Standard Python/FastAPI patterns, moderate refactoring)
* **Leverage**: 9 (Fixing these issues enables deploying to real users)
* **Novelty**: 3 (Standard backend engineering practices)
* **Scalability**: 8 (Enables horizontal and vertical scaling)

**Final Score Calculation**:
(9 × 0.30) + (9 × 0.25) + (8 × 0.20) + (3 × 0.15) + (8 × 0.10)
= 2.7 + 2.25 + 1.6 + 0.45 + 0.8
= 7.8

# 🧭 6. Prioritization Engine
* **Final Score**: 7.8
* **Priority Bucket**: ⚡ Next (High Priority - High score + moderate effort)
* **Reasoning**: This is critical for scaling, but technically falls just below the 8.5 threshold for a "Breakthrough/Now", likely because it's a foundational fix rather than a highly novel growth feature. However, it's essential before any marketing or scaling efforts.

# ⚙️ 7. Execution Planner (Suggestion Mode Only)

### 🎯 Objective
Eliminate state leakage and event loop starvation to support concurrent multi-tenant usage.

### 🧩 Tasks Breakdown
1. Update state management to remove global variables.
2. Refactor blocking API endpoints to utilize thread pooling.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
- `Main.py`: Remove `conversation_history` and `USERPROFILE` globals. Modify `AnswerQes` to accept `conversation_history` and `profile` as parameters and return the updated history/profile alongside the answer.
- `api.py`: Introduce an in-memory dictionary `sessions = {}` mapping session IDs to their histories and profiles. Update `/chat/query` and `/chat/history` to use these session-specific variables.
- `api.py`: Change `async def chat_query` to `def chat_query`, or implement `await asyncio.to_thread` for the `Main.AnswerQes` and `run_retrieval_pipeline` calls. Similarly adjust `/user/assessment`.

### ⏱ Time Estimate
1-2 Days

### 📈 Expected Outcome
0% state leakage between concurrent requests. 100% responsiveness maintained during heavy IO/LLM load.

# 🤖 8. Execution Prompts Generator

### SYSTEM PROMPT
You are a senior backend engineer specializing in FastAPI and concurrent systems architecture.

### TASK PROMPT
Refactor the application to eliminate global state leakage and resolve event loop starvation.

### CONTEXT
The application currently uses `conversation_history` and `USERPROFILE` as global variables in `Main.py`, causing user data to leak across concurrent requests. Additionally, `api.py` uses `async def` for endpoints like `/chat/query` while performing blocking synchronous LLM calls and file I/O, causing event loop starvation. You must isolate user state per request and ensure blocking calls are run in a thread pool (e.g., using standard `def` for FastAPI endpoints or `asyncio.to_thread`).

### OUTPUT FORMAT
- Code modifications for `Main.py` and `api.py`.
- Explanation of how state isolation and thread pooling are achieved.
- Testing strategies.

# 🔁 9. Feedback Loop
* **Evaluate**: Post-implementation, we must load test the API with concurrent users to ensure zero data crossover and measure response latencies to ensure no event loop blocking occurs.
* **Store**: Record test results and concurrency benchmarks in `notes.md`.
* **Refine**: If memory usage spikes due to in-memory session dictionaries, pivot to a Redis-backed session store.
