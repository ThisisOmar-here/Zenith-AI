# Observation Engine
* **Raw Observation:** The `chat_query` endpoint in `api.py` is defined as `async def` but executes synchronous, blocking LangChain methods (`Main.AnswerQes` and `Main.run_retrieval_pipeline`). Additionally, `Main.py` relies on global variables (`conversation_history` and `USERPROFILE`) to manage user state.
* **Context:** `api.py` FastAPI endpoints and `Main.py` core logic.
* **Frequency:** Frequent (Happens on every request to these endpoints).
* **Severity:** High (Causes event loop starvation and architectural risk of state leakage across multiple concurrent requests).

# Insight Engine
* **What is happening?** FastAPI's event loop is being starved by synchronous processing within asynchronous endpoints, causing a massive concurrency bottleneck. Furthermore, global variables are storing user session state across requests, creating data leaks between users.
* **Why is it happening?** The system mixes `async` web frameworks with synchronous LLM and file I/O operations, forcing the event loop to block. It also uses global variables to cache data in memory without scoping it to the user's specific session or request.
* **What does it imply?** The application cannot scale beyond a few concurrent users without severe lag. Concurrency issues guarantee that user data will leak across requests, violating privacy and breaking basic functionality.

# Idea Generator
* **Idea Type:** System Optimization & Architectural Transformation.
* **Idea:** Thread-Pooled Synchronous Execution & Stateless Architecture. Use `await asyncio.to_thread(...)` or `def` instead of `async def` for blocking routes. Store user state per request or inject dependencies rather than using global variables.
* **Leverage:** Scales application instantly without major architecture rewrite, completely resolving critical data leaks.

# Breakthrough Idea System
### 💡 Title
Async-to-Sync Alignment & Stateless Execution Refactor

### 🔍 Problem
The application suffers from critical event loop starvation and concurrent user state leakage.

### 🧠 Insight
Mixing `async` web frameworks with synchronous LLM and file I/O operations breaks the non-blocking guarantee. Using global variables in an async web server guarantees state crossover. Hidden leverage lies in delegating blocking tasks to thread pools while scoping state to the request lifecycle.

### 🔗 Connected Dots
Event loop lag (up to ~190ms) + Global Variable `USERPROFILE` + Synchronous Langchain interactions -> We must offload blocking tasks to threads and scope state to the request.

### 🚀 Proposed Change
Wrap blocking I/O and synchronous LLM calls in `asyncio.to_thread()` or convert the endpoints to standard `def`. Refactor `USERPROFILE` and `conversation_history` to be injected or retrieved per request rather than stored globally.

### 📊 Impact
Massive concurrency scale (10x+ users), 0 state leakage, complete elimination of privacy issues, reduction of event loop lag to <2ms.

### ⚙️ Implementation (Suggestion Only)
1. In `api.py`, wrap calls to `Main.AnswerQes` and `Main.run_retrieval_pipeline` in `await asyncio.to_thread(...)`.
2. In `Main.py`, remove the global `USERPROFILE` and `conversation_history` variables. Refactor `AnswerQes` to accept these as parameters, load them securely per request, and return the updated state.

### ⚠️ Trade-offs
Thread pools have slight overhead compared to true async I/O, but it is absolutely necessary for synchronous LLM and file operations. Refactoring state injection requires updating function signatures across the core execution pipeline.

# Scoring System
### 1. Impact (10)
Fixes critical data leak and massive scaling blockers.
### 2. Feasibility (8)
Requires refactoring global state passing and wrapping function calls.
### 3. Leverage (9)
Small architectural change yields huge performance and security boosts.
### 4. Novelty (3)
Standard backend best practice.
### 5. Scalability (10)
Removes the primary concurrency bottleneck entirely.

**Final Score Calculation:**
Final Score = (10 × 0.30) + (9 × 0.25) + (10 × 0.20) + (3 × 0.15) + (8 × 0.10)
Final Score = 3.0 + 2.25 + 2.0 + 0.45 + 0.8 = 8.5

# Prioritization Engine
* **Final Score:** 8.5
* **Bucket:** 🔥 Now (Breakthrough/Immediate recommendation: High score + fast execution)

# Execution Planner
### 🎯 Objective
Eliminate event loop starvation and global state leaks to enable safe concurrency.

### 🧩 Tasks Breakdown
1. Identify all `async def` endpoints in `api.py` performing blocking work.
2. Wrap the blocking work in `asyncio.to_thread` or convert endpoints to standard `def`.
3. Remove global `USERPROFILE` and `conversation_history` from `Main.py`.
4. Refactor logic to pass state explicitly through function parameters.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* **`api.py`:** Update `chat_query` to use `await asyncio.to_thread(Main.AnswerQes, ...)` and `await asyncio.to_thread(Main.run_retrieval_pipeline, ...)`.
* **`Main.py`:** Refactor `AnswerQes` to accept `user_profile` and `history` as parameters instead of reading globals. Remove `global USERPROFILE` declarations.

### ⏱ Time Estimate
1-2 Days

### 📈 Expected Outcome
Sub-2ms event loop lag and absolutely 0 cross-user data leakage under concurrent load.

# Execution Prompts Generator
### SYSTEM PROMPT
You are a senior Python backend engineer specializing in FastAPI performance and concurrency.

### TASK PROMPT
Refactor the FastAPI application to eliminate event loop starvation and remove global state variables.

### CONTEXT
The current `api.py` uses `async def` endpoints but calls synchronous LangChain methods and file I/O operations (e.g. `Main.AnswerQes`). This blocks the event loop. Furthermore, `Main.py` uses a global `USERPROFILE` and `conversation_history`, causing state leaks between concurrent requests.

### OUTPUT FORMAT
- Explanation of the issue
- Descriptive steps for resolution
- Code snippets demonstrating how to wrap blocking calls in `asyncio.to_thread` and pass state explicitly instead of using globals.

# Feedback Loop
### Evaluate
* Did it improve the metric? Monitor event loop delay (should be <2ms) and test concurrent requests to ensure no data crossover.
* Any unintended issues? Check for thread pool exhaustion under extremely high load.

### Store
* Results to be logged in `notes.md` upon completion.

### Refine
* If thread pool limits are reached, consider adjusting FastAPI thread pool size or moving to a message queue architecture for LLM processing.
