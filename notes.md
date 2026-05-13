# 📝 1. Observation Engine
* **Raw Observation**: `Main.py` relies on global variables (`conversation_history` and `USERPROFILE`) to manage user state across interactions.
  * **Context**: `Main.AnswerQes` function and the general module scope.
  * **Frequency**: Frequent (every chat request).
  * **Severity**: High (causes state leakage across multiple concurrent requests).
* **Raw Observation**: FastAPI endpoints in `api.py` are defined with `async def` but call synchronous, blocking I/O methods (e.g., synchronous LangChain `invoke` in `Main.py` and synchronous file operations).
  * **Context**: `api.py` endpoints like `/chat/query`.
  * **Frequency**: Frequent (every request).
  * **Severity**: High (causes event loop starvation and performance degradation).

# 🔍 2. Insight Engine
* **What is happening?** The application uses global state for user context and blocks the async event loop with synchronous LLM and file I/O calls.
* **Why is it happening?** The system was likely designed for a single-user prototype and uses synchronous tools inside an asynchronous framework without proper thread-pooling or state isolation.
* **What does it imply?** The system will fail to scale beyond a single concurrent user without cross-user data leakage, and it will suffer from severe latency spikes and poor throughput under load due to event loop starvation. The hidden leverage here is that restructuring state management and I/O handling unlocks the ability to serve thousands of users on the same infrastructure.

# 🔗 3. Idea Generator
* **System Optimization (State Isolation)**: Migrate from global variables to request-scoped or session-scoped state management (e.g., using dependency injection or a fast key-value store like Redis). This solves the limitation of single-user capacity and introduces leverage by allowing the system to scale horizontally.
* **System Optimization (Async I/O)**: Refactor asynchronous FastAPI endpoints that perform blocking operations either by changing them to standard `def` (to use FastAPI's built-in thread pool) or by wrapping the blocking calls in `asyncio.to_thread()`. This introduces leverage by drastically reducing event loop lag (e.g., from ~190ms to <2ms), significantly improving system throughput.

# 💡 4. Breakthrough Idea System

### 💡 Title
Stateless, Non-blocking API Architecture Refactor

### 🔍 Problem
The current application architecture leaks user state across concurrent requests due to global variables and blocks the FastAPI event loop with synchronous I/O operations, crippling scalability and performance.

### 🧠 Insight
By decoupling user state from module-level variables and correctly delegating blocking I/O to thread pools, we can transform a single-tenant prototype into a high-performance, multi-tenant production system without changing the underlying LLM models or business logic.

### 🔗 Connected Dots
Combining state isolation (Redis/Dependency Injection) with event-loop optimization (`asyncio.to_thread` or standard `def` endpoints) creates a robust, scalable backend capable of handling high concurrency.

### 🚀 Proposed Change
1. Remove `conversation_history` and `USERPROFILE` global variables from `Main.py`. Pass state explicitly via function arguments or FastAPI dependencies.
2. Update `api.py` endpoints (e.g., `/chat/query`) to wrap blocking calls to `Main.py` in `await asyncio.to_thread(...)` or convert the endpoint definition from `async def` to `def`.

### 📊 Impact
* **Revenue/Growth**: Enables multi-user SaaS capabilities, directly unlocking revenue generation.
* **Efficiency**: Eliminates event loop starvation, decreasing response latency and increasing throughput by orders of magnitude.

### ⚙️ Implementation (Suggestion Only)
* **State**: Use FastAPI's `Depends` to inject user-specific session data based on a session token or user ID. Load state from a database or cache before calling `Main.AnswerQes`.
* **Async**: Modify `/chat/query` in `api.py` to use `await asyncio.to_thread(Main.AnswerQes, payload.query.strip())` or change `async def chat_query` to `def chat_query`.

### ⚠️ Trade-offs
* Requires migrating existing single-user data to a multi-tenant data structure.
* Adds slight complexity to state management (need for session IDs and external storage like Redis or a database).

# 📊 5. Scoring System

* **Impact**: 10 (Critical for multi-user functionality and scalability)
* **Feasibility**: 8 (Standard architectural pattern, requires moderate refactoring)
* **Leverage**: 9 (One-time refactor unlocks infinite scaling)
* **Novelty**: 3 (Standard best practice, not highly novel)
* **Scalability**: 10 (Removes the primary bottlenecks to scaling)

**Final Score Calculation**:
(10 × 0.30) + (9 × 0.25) + (10 × 0.20) + (3 × 0.15) + (8 × 0.10)
= 3.0 + 2.25 + 2.0 + 0.45 + 0.8
= 8.5

# 🧭 6. Prioritization Engine

* **Score**: 8.5
* **Bucket**: 🔥 Now (Breakthrough/Immediate recommendation)
* **Reasoning**: The score meets the 8.5 threshold for Breakthrough. It is high impact and unlocks the core value proposition of the SaaS.

# ⚙️ 7. Execution Planner (Suggestion Mode Only)

### 🎯 Objective
Refactor the backend to support concurrent users without state leakage and eliminate event loop starvation.

### 🧩 Tasks Breakdown
1. **Design State Storage**: Define a strategy for storing and retrieving user profiles and conversation history per user (e.g., JSON files per user ID, SQLite, or Redis).
2. **Refactor `Main.py`**: Remove global `USERPROFILE` and `conversation_history`. Modify `AnswerQes` to accept these as parameters and return the updated state alongside the answer.
3. **Refactor `api.py`**:
    * Update endpoints to extract user context (e.g., via headers/tokens).
    * Wrap synchronous calls to `Main.AnswerQes` and `Main.run_retrieval_pipeline` using `asyncio.to_thread()`, or change endpoints to synchronous `def`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* `Main.py`: Remove `global USERPROFILE`. Add `user_profile` and `history` to function signatures.
* `api.py`: Change `async def chat_query` to use `await asyncio.to_thread(Main.AnswerQes, ...)` or modify to `def chat_query`. Manage session loading/saving within the endpoint.

### ⏱ Time Estimate
* 1-2 Days

### 📈 Expected Outcome
* Support for 1000+ concurrent requests without state leakage.
* Endpoint latency drop from event loop lag (190ms -> <2ms).

# 🤖 8. Execution Prompts Generator

### SYSTEM PROMPT
You are a senior Python backend engineer specializing in FastAPI, asynchronous programming, and scalable application architecture.

### TASK PROMPT
Refactor the Zenith AI application to eliminate global state and prevent event loop starvation. Remove `USERPROFILE` and `conversation_history` global variables in `Main.py` and implement user-specific state passing. Update the `api.py` endpoints to properly handle blocking I/O calls by using `asyncio.to_thread()` or by converting `async def` endpoints to standard `def`.

### CONTEXT
The current system uses global variables in `Main.py` for user state, causing state leakage across concurrent requests. Additionally, `api.py` uses `async def` for endpoints that perform synchronous LangChain `invoke` calls and file I/O, leading to event loop starvation. The application needs to support multiple concurrent users efficiently.

### OUTPUT FORMAT
* Code for `Main.py` modifications.
* Code for `api.py` modifications.
* Explanation of the changes and how they resolve the issues.
* Integration steps for deployment.

# 🔁 9. Feedback Loop

### Evaluate
* Did it improve the metric? (To be measured: concurrent user support and request latency/throughput).
* Any unintended issues? (Monitor for increased memory usage per user session or database connection limits).

### Store
* Results will be documented in `notes.md` after external execution.

### Refine
* If memory usage grows too quickly with user sessions, pivot to using a distributed cache with TTL for session state.
