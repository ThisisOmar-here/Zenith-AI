# 🧠 Autonomous Idea Engine

## 📝 Observation Engine

### Raw Observation 1: Synchronous LangChain `invoke` blocks the event loop
* **Context**: `chat_query` endpoint in `api.py` and `Main.py` LLM interactions.
* **Frequency**: Frequent (every chat request)
* **Severity**: High (can lead to event loop starvation and degraded performance under concurrency)

### Raw Observation 2: Global State Leakage Risk
* **Context**: `conversation_history` and `USERPROFILE` in `Main.py`.
* **Frequency**: Frequent (affects every concurrent request)
* **Severity**: High (architectural risk of state cross-contamination between users)

### Raw Observation 3: Hardcoded 10-Item Limit on Mood/Feelings History
* **Context**: `_merge_assessment_into_profile` in `api.py`.
* **Frequency**: Occasional (when list exceeds 10 items)
* **Severity**: Low/Medium (data loss for longer-term mood tracking)

## 🔍 Insight Engine

### Insight 1: Event Loop Starvation
* **What is happening?** FastAPI uses asynchronous `async def` endpoints, but synchronous LangChain functions (`invoke`) are called inside them, blocking the main event loop.
* **Why is it happening?** Synchronous LLM calls are not being offloaded to a thread pool (e.g., using `asyncio.to_thread` or standard `def` endpoints).
* **What does it imply?** The application cannot scale effectively and will suffer from severe latency spikes when multiple users interact simultaneously. This is a critical bottleneck for user experience and system throughput.

### Insight 2: Global State Vulnerability
* **What is happening?** User-specific conversational state and profile data are stored in global variables (`conversation_history`, `USERPROFILE`).
* **Why is it happening?** The system was likely built as a single-user prototype and hasn't been adapted for multi-tenant SaaS architecture.
* **What does it imply?** The application is completely unsafe for multi-user deployment. One user's chat request could modify or leak data into another user's session, leading to privacy breaches and unpredictable behavior.

## 🔗 Idea Generator

### Idea 1: Asynchronous Execution Offloading (System Optimization)
* **Concept**: Wrap all blocking LangChain calls (or any heavy synchronous I/O) in `asyncio.to_thread()` within FastAPI endpoints, or convert those specific endpoints to synchronous `def` functions to let FastAPI manage the thread pool automatically.
* **Leverage**: Significantly improves concurrency and application responsiveness under load with minimal code changes.

### Idea 2: Session-Based State Management (System Optimization / Security)
* **Concept**: Refactor the state management to be request/session-scoped. Pass context (history and profile) explicitly through function calls instead of relying on global variables. Introduce user identification (e.g., tokens/IDs).
* **Leverage**: Solves the critical multi-user vulnerability, making the application production-ready and fundamentally scalable.

## 💡 Breakthrough Idea System

### 💡 Title: Stateless AI Companion Architecture
### 🔍 Problem: The current architecture relies on global variables for state and synchronous operations in an asynchronous framework, making it unsafe and unscalable for multiple users.
### 🧠 Insight: To truly function as a SaaS product, the AI must act as a stateless processing engine where all context is dynamically injected per request, completely decoupling the engine from long-term storage or global state.
### 🔗 Connected Dots: Global state vulnerability + Synchronous blocking operations + Need for scalability.
### 🚀 Proposed Change: Transition to a completely stateless API architecture. Manage session state externally (e.g., database, Redis, or client-side context injection) and rewrite endpoints to enforce isolation and fully asynchronous I/O handling.
### 📊 Impact: Transforms a single-user prototype into a scalable, secure, multi-tenant SaaS application capable of handling high concurrency without state leakage.
### ⚙️ Implementation (Suggestion Only):
1. Remove `global conversation_history` and `USERPROFILE` from `Main.py`.
2. Modify `Main.AnswerQes` and related functions to accept `history` and `profile` as explicit arguments.
3. Update `api.py` endpoints to retrieve state dynamically per user/session, pass it to `Main.py`, and save updates back to external storage.
4. Convert synchronous blocking endpoints in `api.py` to `def` (instead of `async def`) or use `asyncio.to_thread` to manage blocking I/O safely.
### ⚠️ Trade-offs: Requires a significant refactoring of core logic and state management flows, increasing initial development complexity.

## 📊 Scoring System

### Idea 1: Asynchronous Execution Offloading
* Impact: 8
* Feasibility: 9
* Leverage: 8
* Novelty: 2
* Scalability: 9
* **Final Score**: (8 * 0.3) + (8 * 0.25) + (9 * 0.20) + (2 * 0.15) + (9 * 0.10) = 2.4 + 2.0 + 1.8 + 0.3 + 0.9 = **7.4**

### Idea 2: Session-Based State Management
* Impact: 10
* Feasibility: 6
* Leverage: 9
* Novelty: 3
* Scalability: 10
* **Final Score**: (10 * 0.3) + (9 * 0.25) + (10 * 0.20) + (3 * 0.15) + (6 * 0.10) = 3.0 + 2.25 + 2.0 + 0.45 + 0.6 = **8.3**

### Breakthrough Idea: Stateless AI Companion Architecture
* Impact: 10
* Feasibility: 5
* Leverage: 10
* Novelty: 5
* Scalability: 10
* **Final Score**: (10 * 0.3) + (10 * 0.25) + (10 * 0.20) + (5 * 0.15) + (5 * 0.10) = 3.0 + 2.5 + 2.0 + 0.75 + 0.5 = **8.75**

## 🧭 Prioritization Engine

### 🔥 Now
* **Stateless AI Companion Architecture (Score: 8.75)** - Critical for any real-world deployment. Resolves major security and scalability issues simultaneously.

### ⚡ Next
* **Asynchronous Execution Offloading (Score: 7.4)** - Can be partially implemented alongside the stateless architecture to resolve immediate concurrency bottlenecks.

### 🧪 Later
* Expanding the 10-Item Limit on Mood/Feelings History (Low priority optimization).

### ❌ Drop
* Continuing development with the current global state model.

## ⚙️ Execution Planner (Suggestion Mode Only)

### 🎯 Objective
Migrate the application to a stateless, multi-tenant capable architecture while resolving event loop starvation caused by synchronous operations.

### 🧩 Tasks Breakdown
1. **Refactor `Main.py` State Management:** Modify `Main.py` to remove `global` state variables. Ensure all functions (e.g., `AnswerQes`, `run_retrieval_pipeline`) accept necessary state (history, user profile) as input parameters and return updated state.
2. **Implement User/Session Isolation in `api.py`:** Update API endpoints to manage separate state structures per user/session, likely leveraging a database or structured session store instead of a single `user_profile.json`.
3. **Address Synchronous Blocking:** Review all endpoints in `api.py`. For endpoints calling `Main.py` or performing heavy I/O, either convert the endpoint to a synchronous `def` function or wrap the blocking calls using `await asyncio.to_thread()`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* **`Main.py`**: Remove `global conversation_history` and `USERPROFILE`. Change function signatures like `AnswerQes(query: str, history: List, profile: Dict)`.
* **`api.py`**: Refactor `chat_query` and profile management endpoints to fetch state dynamically. Change `async def chat_query` to use `await asyncio.to_thread(Main.AnswerQes, ...)` or convert it to `def chat_query(...)`.

### ⏱ Time Estimate
3-5 Days

### 📈 Expected Outcome
* Complete elimination of cross-user state leakage risk.
* >95% reduction in event loop starvation incidents under concurrent load.
* Scalable foundation for future SaaS development.

## 🤖 Execution Prompts Generator

### SYSTEM PROMPT
You are a senior software engineer specializing in scalable SaaS systems, FastAPI, and robust asynchronous architectures.

### TASK PROMPT
Refactor the state management and asynchronous execution model of the application. Remove global state variables, implement session-scoped state injection, and eliminate event loop starvation by offloading synchronous LLM calls.

### CONTEXT
The current application uses `global conversation_history` and `USERPROFILE` in `Main.py`, creating a critical risk of state leakage between users. Additionally, synchronous LangChain `invoke` operations within FastAPI `async def` endpoints block the event loop, causing severe latency under concurrent requests. The goal is to move to a stateless execution model where context is passed explicitly, and blocking operations are handled via thread pools (e.g., `asyncio.to_thread`).

### OUTPUT FORMAT
* Detailed explanation of architectural changes.
* Specific code modifications for `Main.py` and `api.py`.
* Guidance on managing user sessions externally.

## 🔁 Feedback Loop

### Evaluate
* Metrics to track: Number of concurrent requests handled without latency spikes, zero incidents of state cross-contamination.
* Unintended issues: Increased memory overhead due to context passing, potential complexity in session management.

### Store
* Evaluation results and metrics will be logged in `notes.md` post-implementation.

### Refine
* Depending on the load, we may need to explore more advanced state management solutions like Redis or a dedicated vector database for history.
