# 📝 1. Observation Engine

### Raw Observation: Global State Contamination
* **Context**: `Main.py` defines `conversation_history` and `USERPROFILE` as global variables.
* **Frequency**: Frequent (Occurs on every chat request).
* **Severity**: High. Concurrent users will overwrite and pollute each other's session data and context.

### Raw Observation: Event Loop Starvation
* **Context**: `api.py` uses `async def` for endpoints (e.g., `/chat/query`, `/user/assessment`), but relies on synchronous downstream calls (`LLM.invoke` in `Main.py`, `requests.get` in `getUsersIP.py`, and blocking file I/O in `UserProfile.py`).
* **Frequency**: Frequent.
* **Severity**: High. The asynchronous event loop will be completely blocked during these calls, preventing the server from handling other incoming requests simultaneously.

---

# 🔍 2. Insight Engine

### What is happening?
The architecture mixes asynchronous web handling (FastAPI `async def`) with fully synchronous, blocking business logic and a globally shared state across all requests.

### Why is it happening?
The system was likely built by translating a single-user CLI script into a web server without adapting the state management or execution model for concurrency.

### What does it imply?
The application cannot scale beyond a single concurrent user. If two users send messages at the same time, User A might receive User B's history, and the entire server will freeze for all users while waiting for long-running LLM API responses. This represents a critical bottleneck for user retention and service reliability.

---

# 🔗 3. Idea Generator

* **System Optimization (State Localization)**: Refactor `conversation_history` and `USERPROFILE` to be tied to a request or session ID, eliminating cross-user state leakage.
* **System Optimization (Concurrency Management)**: Switch FastAPI endpoints from `async def` to standard `def`, allowing FastAPI to automatically run them in a thread pool, or wrap blocking calls inside `asyncio.to_thread(...)`. This unblocks the event loop.

---

# 💡 4. Breakthrough Idea System

### 💡 Title
Stateless & Non-Blocking Architectural Transformation

### 🔍 Problem
The AI backend crashes under concurrent load because it blocks the main event loop with synchronous LLM invocations and shares conversation state globally across all users.

### 🧠 Insight
By leveraging FastAPI's native thread-pooling for synchronous endpoints and isolating state per request/user, we can instantly transform the application from a fragile single-user prototype into a production-ready, multi-user system without needing complex distributed architecture.

### 🔗 Connected Dots
Global State + Blocking I/O = Complete Concurrency Failure.
Thread Pools + Request-Scoped State = Effortless Scalability.

### 🚀 Proposed Change
1. Remove global `conversation_history` and `USERPROFILE` from `Main.py`. Pass these as explicit arguments or use database-backed session state.
2. Convert `async def` endpoints in `api.py` to `def`, or explicitly use `await asyncio.to_thread(...)` for `Main.AnswerQes()` and file I/O, ensuring the FastAPI event loop remains responsive.

### 📊 Impact
Allows infinite horizontal scaling potential by eliminating global state dependencies and maximizes server throughput by preventing event loop starvation.

### ⚙️ Implementation (Suggestion Only)
- In `api.py`, change `async def chat_query` to `def chat_query` (FastAPI automatically thread-pools `def` endpoints).
- In `Main.py`, refactor `AnswerQes` to accept `conversation_history` and `user_profile` as arguments, rather than relying on global scope. Inject these from the `api.py` layer using a session store (e.g., memory cache or Redis).

### ⚠️ Trade-offs
Moving state to the request layer requires implementing a session management system, which slightly increases the complexity of the API layer.

---

# 📊 5. Scoring System

### 1. Impact: 10
Massively improves efficiency, scalability, and retention by preventing server freezes and data leakage.
### 2. Feasibility: 9
Very high feasibility. FastAPI naturally supports this via standard `def` endpoints and dependency injection.
### 3. Leverage: 9
Minimal code changes (removing globals, changing async keywords) yield a fully concurrent server.
### 4. Novelty: 5
Standard best practice, though highly transformative for this specific codebase.
### 5. Scalability: 10
Directly unlocks multi-user scaling without proportional cost increases.

**Final Score Calculation:**
`Final Score = (10 × 0.30) + (9 × 0.25) + (10 × 0.20) + (5 × 0.15) + (9 × 0.10)`
`Final Score = 3.00 + 2.25 + 2.00 + 0.75 + 0.90 = 8.90`

---

# 🧭 6. Prioritization Engine

### 🔥 Now
**Score: 8.90 (Breakthrough)**
This is a critical architectural fix that must be implemented before any user traffic hits the server. Fast execution, high strategic alignment.

---

# ⚙️ 7. Execution Planner (Suggestion Mode Only)

### 🎯 Objective
Eliminate event loop starvation and global state contamination.

### 🧩 Tasks Breakdown
1. **Refactor State**: Modify `Main.py` to remove `conversation_history` and `USERPROFILE` global variables. Update `AnswerQes` to accept these as function parameters.
2. **Update Endpoints**: In `api.py`, modify `/chat/query` and `/user/assessment` to either be standard `def` instead of `async def` or wrap blocking calls using `await asyncio.to_thread()`.
3. **Session Management**: Introduce a lightweight session mapping in `api.py` (e.g., a dictionary mapping a user ID to their history) to pass to `Main.py`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* **Main.py**: Remove globals. Update `AnswerQes(query, history, profile)`.
* **api.py**: Drop `async` keyword on `chat_query`. Add a session dictionary. Pass request-specific history to `AnswerQes`.

### ⏱ Time Estimate
4 Hours

### 📈 Expected Outcome
100% elimination of cross-user state leakage and zero event-loop blocking under load.

---

# 🤖 8. Execution Prompts Generator

### SYSTEM PROMPT
You are a senior backend engineer specializing in scalable FastAPI and asyncio architectures.

### TASK PROMPT
Refactor the FastAPI application to eliminate event loop starvation and global state leakage. Convert blocking `async def` endpoints to `def` and remove global state variables in the LLM processing module.

### CONTEXT
The current `api.py` uses `async def` but executes synchronous LangChain invocations and file I/O. Additionally, `Main.py` relies on a global `conversation_history` list, which causes user data to leak across concurrent requests.

### OUTPUT FORMAT
* Code for `api.py`
* Code for `Main.py`
* Brief explanation of the concurrency model improvements.

---

# 🔁 9. Feedback Loop

### Evaluate
* Run load testing (e.g., using `locust` or `performance_benchmark.py`) with multiple concurrent users.
* Verify if any requests timeout or return another user's history.

### Store
* Document the latency and throughput results before and after the change in `notes.md`.

### Refine
* If in-memory session management consumes too much RAM, pivot the idea to use a Redis-backed session store.
