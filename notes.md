# Observation Engine
### Structure
* **Raw Observation**: Global state variables `conversation_history` and `USERPROFILE` in `Main.py` are being used to track user sessions, risking state leakage across concurrent requests.
* **Context**: `Main.py` and `api.py` during chat endpoint usage.
* **Frequency**: Frequent
* **Severity**: High

* **Raw Observation**: The `chat_query` endpoint in `api.py` is defined as `async def` but calls synchronous LangChain methods (`Main.AnswerQes` and `Main.run_retrieval_pipeline`), causing event loop starvation.
* **Context**: `api.py` at `/chat/query`
* **Frequency**: Frequent
* **Severity**: High

* **Raw Observation**: The `_merge_assessment_into_profile` function drops the newest mood when the list is at capacity because it appends first then slices `[:10]`.
* **Context**: `api.py` at `_merge_assessment_into_profile`
* **Frequency**: Occasional
* **Severity**: Medium

# Insight Engine
* **What is happening?**: FastAPI is serving a multi-user API but the core AI logic (`Main.py`) is structured like a single-user script using global state and synchronous I/O within async routes.
* **Why is it happening?**: The prototype evolved from a standalone script to a web API without re-architecting for concurrency and state isolation.
* **What does it imply?**: As traffic scales, users will receive responses meant for other users, and the server will lock up under concurrent load, severely impacting retention and trust.

# Idea Generator
* **Type**: System Optimization
* **Idea**: Transition to Request-Scoped State & Asynchronous Threading.
* **Solve a real limitation**: Prevents catastrophic data leaks and system unresponsiveness.
* **Introduce leverage**: Allows the system to scale horizontally and serve concurrent users safely.

# Breakthrough Idea System
### 💡 Title
Stateless Asynchronous Concurrency Transformation

### 🔍 Problem
The system uses global variables (`conversation_history`, `USERPROFILE`) leading to cross-user state leakage, and performs synchronous LLM/IO calls in `async def` routes, blocking the event loop and crippling throughput.

### 🧠 Insight
The application's architectural mismatch between FastAPI's async model and single-user script logic creates hidden failure points that will exponentially degrade user experience under load. Fixing this creates a foundation for limitless scaling.

### 🔗 Connected Dots
Global variables in `Main.py` + `async def` in `api.py` with synchronous LLM calls = Server freezes and data leaks.

### 🚀 Proposed Change
Refactor `Main.py` to accept session context (state) per request instead of using globals. Wrap synchronous blocking calls (`Main.AnswerQes`, `Main.run_retrieval_pipeline`) in `asyncio.to_thread()` or convert endpoints to standard `def`.

### 📊 Impact
100% elimination of cross-user state leakage; >10x improvement in concurrent throughput.

### ⚙️ Implementation (Suggestion Only)
1. Remove `conversation_history` and `USERPROFILE` globals from `Main.py`. Pass these as arguments to functions.
2. Store state in a fast, distributed store (e.g., Redis) or pass from the client per request.
3. Change `/chat/query` to `def chat_query` or use `await asyncio.to_thread(Main.AnswerQes, ...)` for blocking ops.

### ⚠️ Trade-offs
Requires a moderate refactor of function signatures in `Main.py` and a new strategy for session persistence.

# Scoring System
### 1. Impact: 9
### 2. Feasibility: 7
### 3. Leverage: 9
### 4. Novelty: 3
### 5. Scalability: 10

## Final Score Calculation
Final Score = (9 * 0.30) + (9 * 0.25) + (10 * 0.20) + (3 * 0.15) + (7 * 0.10)
Final Score = 2.70 + 2.25 + 2.00 + 0.45 + 0.70 = 8.10

# Prioritization Engine
**Priority Bucket**: ⚡ Next
High score (8.10) + moderate effort

# Execution Planner
### 🎯 Objective
Ensure data isolation between users and unblock the event loop for concurrent processing.

### 🧩 Tasks Breakdown
1. Eliminate global state in `Main.py` by introducing a state-passing mechanism or database-backed session store.
2. Refactor FastAPI routes in `api.py` to use threadpools for synchronous operations (`asyncio.to_thread()`) or change `async def` to `def` for blocking endpoints.
3. Update `_merge_assessment_into_profile` to correctly enforce the 10-item limit.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* `Main.py`: Remove global lists/dicts. Update `AnswerQes` and `run_retrieval_pipeline` to accept `conversation_history` and `user_profile` as parameters.
* `api.py`: Wrap `Main.AnswerQes` in `await asyncio.to_thread()`. Fix `_merge_assessment_into_profile` mood slicing logic.

### ⏱ Time Estimate
2-3 Days

### 📈 Expected Outcome
Zero cross-user data leakage, 10x higher request throughput, and resolution of the newest mood drop bug.

# Execution Prompts Generator
### SYSTEM PROMPT
You are a senior backend engineer expert in Python, FastAPI, and concurrent systems.

### TASK PROMPT
Refactor the provided application to eliminate global state leakage and resolve event loop starvation.

### CONTEXT
The current app uses global variables (`conversation_history`, `USERPROFILE`) in `Main.py` causing state leakage across concurrent requests. Additionally, synchronous LLM calls block the FastAPI event loop in `async def` routes.

### OUTPUT FORMAT
* Code changes required (diff format)
* Explanation of the architectural improvements
* Testing strategy for concurrency

# Feedback Loop
### Evaluate
* Did request latency improve under load?
* Is state completely isolated per user session?
* Any unintended issues?

### Store
Results will be stored in `notes.md`.

### Refine
If Redis is overkill, consider a simple in-memory session cache with TTL, mapped by user/session ID.
