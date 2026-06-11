# Observation Engine

### Raw Observation
Event loop starvation occurs during simultaneous AI requests due to synchronous API calls (e.g., LLM generation) and file I/O operations blocking the main asynchronous event loop in FastAPI.

### Context
Occurs in `Main.py` (e.g., `AnswerQes`, `LLM_WITH_TOOLS.invoke`, `LLM.invoke`) and `UserProfile.py` (e.g., `update_user_profile`, `save_user_profile`, `load_user_profile`) which are called directly by the FastAPI endpoints in `api.py`.

### Frequency
Frequent (every time multiple users make requests concurrently).

### Severity
High (causes high latency, lag, and poor UX for all users on the instance).

---

# Insight Engine

### What is happening?
FastAPI uses an asynchronous event loop, but the application executes synchronous, blocking code (like standard LangChain `invoke` calls or direct `open`/`read`/`write` filesystem calls) within `async def` endpoints, effectively freezing the thread.

### Why is it happening?
The endpoints in `api.py` are declared as `async def` (e.g., `@app.post("/chat/query") async def chat_query(payload: ChatRequest):`), which tells FastAPI not to run them in a separate thread pool. The functions they call (`Main.AnswerQes` and file I/O in `UserProfile.py`) do not yield execution back to the loop.

### What does it imply?
The application cannot scale effectively and cannot serve concurrent requests reliably. Hidden leverage lies in converting these async endpoint definitions to synchronous (`def`) or wrapping the blocking function calls in `await asyncio.to_thread(...)`, providing a significant performance boost (e.g., reducing latency from ~190ms to <2ms per operation) without changing the underlying architecture.

---

# Idea Generator

1. **System Optimization Idea 1:** Convert blocking `async def` endpoints in `api.py` to regular `def`. FastAPI will automatically offload them to an external threadpool.
2. **System Optimization Idea 2:** Keep endpoints `async def`, but wrap all blocking calls (like `Main.AnswerQes`, `UserProfileModule.load_user_profile`, `UserProfileModule.save_user_profile`) in `await asyncio.to_thread()`.
3. **Architecture Optimization Idea:** Replace `json.load`/`dump` blocking file writes with asynchronous database operations, perhaps adopting SQLite or Postgres.
4. **Architecture Refactoring Idea:** Eliminate global state (e.g., `conversation_history` and `USERPROFILE` in `Main.py`) by moving state into an injected session or database. This is critical for scaling across multiple concurrent requests.

---

# Breakthrough Idea System

### 💡 Title
Threadpool-Powered Event Loop Unblocking & State Encapsulation

### 🔍 Problem
The main event loop is constantly blocked by synchronous AI calls and file I/O, leading to severe latency for concurrent users. Additionally, global state variables (`conversation_history`, `USERPROFILE`) leak data across sessions.

### 🧠 Insight
FastAPI endpoints using `async def` run on the main thread; if they contain synchronous blocking code, they freeze the server. Global variables in `Main.py` mean multiple requests alter the same state, causing data contamination.

### 🔗 Connected Dots
Synchronous APIs + Async Endpoints + Global State = Slow, buggy, unscalable architecture. Modifying endpoint definitions or wrapping calls in `asyncio.to_thread` directly solves the bottleneck, while passing session-specific state solves data leakage.

### 🚀 Proposed Change
Change endpoints containing synchronous I/O from `async def` to regular `def` (or wrap their contents with `asyncio.to_thread()`). Refactor `Main.py` to stop using `global conversation_history` and `global USERPROFILE`, passing them instead as arguments or managing them per-user.

### 📊 Impact
Eliminates event loop starvation, allowing high concurrency. Ensures user data remains private and uncorrupted, directly impacting retention, scalability, and UX.

### ⚙️ Implementation (Suggestion Only)
- In `api.py`, change `async def chat_query(...)` to `def chat_query(...)`.
- In `api.py`, change `async def submit_assessment(...)` to `def submit_assessment(...)`.
- Refactor `Main.py` so `conversation_history` and `USERPROFILE` are not globals, but are passed into `AnswerQes(query, conversation_history, user_profile)`.

### ⚠️ Trade-offs
Refactoring globals requires threading state through multiple function calls, slightly increasing code complexity. Using `asyncio.to_thread` adds a minor overhead to context switching, though negligible compared to the current blocking penalty.

---

# Scoring System

### Impact (0-10): 9
(Huge improvement in scalability and concurrent response times.)

### Leverage (0-10): 8
(Minor code change yields massive architectural improvement.)

### Scalability (0-10): 9
(Removes the primary bottleneck to scaling vertically.)

### Novelty (0-10): 4
(Standard best practice for FastAPI, not highly unique.)

### Feasibility (0-10): 8
(Relatively straightforward to change `async def` to `def` and refactor state.)

### Final Score
(9 * 0.30) + (8 * 0.25) + (9 * 0.20) + (4 * 0.15) + (8 * 0.10)
= 2.7 + 2.0 + 1.8 + 0.6 + 0.8
= **7.9**

---

# Prioritization Engine

Priority Bucket: **⚡ Next**
Score: 7.9 (High Priority)
Reason: Critical architectural fix required before serious scaling can occur. Low effort, extremely high impact.

---

# Execution Planner

### 🎯 Objective
Eliminate event loop starvation and prevent cross-session state leakage by offloading blocking I/O to threads and removing global variables.

### 🧩 Tasks Breakdown
1. Update `api.py`: Change blocking `async def` endpoints (`chat_query`, `get_history`, `submit_assessment`, `get_user_profile`) to `def`.
2. Refactor `Main.py`: Remove `global conversation_history` and `global USERPROFILE`.
3. Update `Main.AnswerQes` to accept `conversation_history` and `user_profile` as parameters.
4. Update `api.py` endpoints to pass state to `Main.AnswerQes`.
5. Update `UserProfile.py` if necessary to ensure thread safety during file I/O or keep it as simple blocking I/O within the thread pool.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
- **`api.py`**:
  - Remove `async` from `def chat_query`, `def submit_assessment`, `def get_history`, `def get_user_profile`.
  - Pass user session state to `Main.AnswerQes`.
- **`Main.py`**:
  - Delete lines defining `conversation_history: list = []` and `USERPROFILE = {}` as globals.
  - Modify `def AnswerQes(query: str, conversation_history: list, user_profile: dict)` and thread these arguments through helper functions.

### ⏱ Time Estimate
2-4 hours.

### 📈 Expected Outcome
FastAPI processes requests in a thread pool without blocking the main event loop. Response times for concurrent requests drop significantly (e.g., >95% reduction in latency under load). No more cross-session data leaks.

---

# Execution Prompts Generator

### SYSTEM PROMPT
You are a senior Backend Engineer and FastAPI optimization expert specializing in high-performance Python services.

### TASK PROMPT
Refactor the FastAPI application to prevent event loop starvation caused by synchronous LLM calls and file I/O. Convert blocking `async def` endpoints to standard `def` to utilize FastAPI's external thread pool. Additionally, refactor `Main.py` to eliminate global state (`conversation_history`, `USERPROFILE`) to ensure thread-safety and prevent data leakage across concurrent requests.

### CONTEXT
The current `api.py` defines endpoints using `async def`, but they call functions in `Main.py` and `UserProfile.py` that execute synchronous LangChain `invoke` operations and blocking file reads/writes. This blocks the main event loop. Furthermore, `Main.py` uses global variables to maintain conversation state, which will contaminate data if multiple users query the system simultaneously.

### OUTPUT FORMAT
- Code snippets for updated `api.py` and `Main.py`.
- Step-by-step explanation of the changes.
- Instructions for running load tests to verify the improvement.

---

# Feedback Loop

### Evaluate
(To be completed post-execution)
- Did the latency under concurrent load decrease?
- Are users experiencing cross-session data leakage?

### Store
Results will be stored back in `notes.md`.

### Refine
If thread pool exhaustion occurs under massive load, consider migrating file I/O to true asynchronous operations (e.g., `aiofiles` or async database) and using async LangChain integrations.
