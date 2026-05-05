# 📝 1. Observation Engine

### Raw Observation: Global State Leakage Risk
* **Context**: `Main.py` relies on global variables (`conversation_history` and `USERPROFILE`) to store user state, while being served by a concurrent FastAPI application (`api.py`).
* **Frequency**: Frequent (affects every request).
* **Severity**: High.

### Raw Observation: Event Loop Starvation
* **Context**: `api.py` uses `async def` for endpoints (`chat_query`, `submit_assessment`) but calls synchronous, blocking functions (LangChain `invoke`, file I/O in `UserProfileModule`).
* **Frequency**: Frequent.
* **Severity**: High.

---

# 🔍 2. Insight Engine

### Insight: The Concurrency Trap
* **What is happening?** The system uses global variables to hold conversation state and user profiles, while also using asynchronous endpoints that execute blocking code.
* **Why is it happening?** The application evolved from a single-user script (`Main.py`) into a concurrent web API (`api.py`) without redesigning the state management or execution model.
* **What does it imply?** The application cannot scale beyond a single user without mixing up private data (state leakage) and will freeze under load because blocking I/O starves the async event loop. There is massive hidden leverage in simply fixing the execution model to handle concurrent users safely and efficiently.

---

# 🔗 3. Idea Generator

### Idea: Stateless Context Injection
* **Type**: System Optimization
* **Solve**: Solves state leakage and allows horizontal scaling.
* **Leverage**: Extremely high. Enables the app to serve thousands of users instead of just one safely.

### Idea: Async/Sync Execution Alignment
* **Type**: System Optimization
* **Solve**: Solves event loop starvation.
* **Leverage**: High. Maximizes API throughput without rewriting the entire core logic by offloading synchronous work to thread pools.

---

# 💡 4. Breakthrough Idea System

### 💡 Title
Stateless & Non-Blocking Core Refactor

### 🔍 Problem
The current architecture risks exposing private user conversations due to global state variables (`conversation_history`, `USERPROFILE`) and suffers from event loop starvation because synchronous operations are running directly inside `async def` FastAPI endpoints.

### 🧠 Insight
By separating user state from the application state and utilizing FastAPI's built-in thread pool management (by changing `async def` to `def` for blocking endpoints or using `asyncio.to_thread`), the application can scale instantly and securely without a complete rewrite.

### 🔗 Connected Dots
Global State Leakage + Event Loop Starvation -> Both stem from a mismatch between the web framework (FastAPI) and the underlying script logic. Fixing this unlocks true SaaS scalability.

### 🚀 Proposed Change
1. Remove global `conversation_history` and `USERPROFILE` from `Main.py`. Pass these as arguments per-request from `api.py` (fetching/storing from a database or session).
2. Convert blocking `async def` endpoints in `api.py` to standard `def`, allowing FastAPI to automatically run them in a separate thread pool, preventing event loop blocking.

### 📊 Impact
* **Security & Privacy**: 100% elimination of cross-user data leakage.
* **Performance**: API throughput increases significantly by eliminating event loop starvation.

### ⚙️ Implementation (Suggestion Only)
* **Pass State Explicitly**: Modify `AnswerQes` in `Main.py` to accept `conversation_history` and `user_profile` as parameters instead of reading from globals. The caller (`api.py`) should handle loading and passing the state.
* **Adjust Endpoints**: Change `@app.post("/chat/query") async def chat_query(...)` to `def chat_query(...)` or use `await asyncio.to_thread(Main.AnswerQes, ...)` to handle the synchronous LLM calls.
* **Database Integration**: Replace the single `user_profile.json` with a database or user-specific files to isolate data.

### ⚠️ Trade-offs
* Requires refactoring the signature of core functions (`AnswerQes`).
* Need to implement a reliable session or user identification mechanism in the API layer.

---

# 📊 5. Scoring System

### Idea: Stateless & Non-Blocking Core Refactor

* **Impact**: 10 (Critical for revenue/retention; prevents data leaks and crashes)
* **Feasibility**: 8 (Moderate technical complexity, requires targeted refactoring)
* **Leverage**: 10 (Unlocks horizontal scaling with minimal code)
* **Novelty**: 2 (Standard engineering practice, not a new feature)
* **Scalability**: 10 (Directly solves scalability blockers)

### Final Score Calculation
Final Score = (10 × 0.30) + (10 × 0.25) + (10 × 0.20) + (2 × 0.15) + (8 × 0.10)
Final Score = 3.0 + 2.5 + 2.0 + 0.3 + 0.8 = **8.6**

---

# 🧭 6. Prioritization Engine

### 🔥 Now
* **Idea**: Stateless & Non-Blocking Core Refactor
* **Score**: 8.6
* **Why**: High score + Critical path for stability and data privacy.

---

# ⚙️ 7. Execution Planner (Suggestion Mode Only)

### 🎯 Objective
Eliminate global state to ensure data privacy and prevent event loop starvation to improve API responsiveness.

### 🧩 Tasks Breakdown
1. **Remove Globals**: In `Main.py`, remove `conversation_history` and `USERPROFILE` global variables.
2. **Parameterize State**: Update `AnswerQes` and related functions to accept history and profile as arguments.
3. **Fix Async Endpoints**: In `api.py`, change `async def` to `def` for endpoints executing blocking code (`chat_query`, `submit_assessment`) or wrap blocking calls in `asyncio.to_thread()`.
4. **Isolate User Data**: Update `api.py` and `UserProfile.py` to handle per-user files or database records instead of a hardcoded `user_profile.json`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* **Files to modify**: `Main.py`, `api.py`, `UserProfile.py`
* **Logic**: Refactor function signatures to pass state context instead of relying on module-level globals. Let FastAPI handle thread pooling for sync endpoints.
* **APIs**: The FastAPI routes will remain the same but will take a user identifier (e.g., token or session ID) to fetch correct state.

### ⏱ Time Estimate
* 1-2 Days

### 📈 Expected Outcome
* Zero cross-user data leakage.
* API response times remain stable under concurrent load (event loop lag < 2ms).

---

# 🤖 8. Execution Prompts Generator

### SYSTEM PROMPT
You are a senior backend engineer specializing in scalable FastAPI architectures and Python concurrency.

### TASK PROMPT
Refactor the Zenith AI codebase to eliminate global state leakage and resolve event loop starvation caused by synchronous operations in async endpoints.

### CONTEXT
The current system uses global variables (`conversation_history`, `USERPROFILE`) in `Main.py` which leaks state across concurrent FastAPI requests. Furthermore, `api.py` uses `async def` for endpoints that call synchronous blocking functions (LangChain `invoke`, file I/O), causing event loop starvation.

### OUTPUT FORMAT
* Provide the updated code for `Main.py` with parameterized state.
* Provide the updated code for `api.py` demonstrating either standard `def` endpoints or `asyncio.to_thread()`.
* Include a brief explanation of how user sessions should be managed.

---

# 🔁 9. Feedback Loop

### Evaluate
* Are concurrent requests correctly isolated? (Test with multiple simulated users)
* Is the event loop responsive during heavy load? (Benchmark with concurrent LLM calls)

### Store
* Results to be logged back into `notes.md` post-execution.

### Refine
* If thread pool scaling becomes an issue, consider migrating blocking LangChain calls to their true `async` equivalents (`ainvoke`).
