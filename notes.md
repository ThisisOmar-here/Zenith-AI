# 🧠 Autonomous Idea Engine System (SaaS Builder Integration)
## Observation Engine
* **Raw Observation:** The application uses global state (`conversation_history`, `USERPROFILE`) in `Main.py` and blocking synchronous methods (`Main.AnswerQes`, `Main.run_retrieval_pipeline`) inside the `async def chat_query` endpoint in `api.py`.
* **Context:** `api.py` and `Main.py` in the Zenith AI application.
* **Frequency:** Frequent (on every chat request).
* **Severity:** High (causes event loop starvation and state leakage across concurrent requests).

## Insight Engine
* **What is happening?:** Concurrent requests to the `/chat/query` endpoint modify the same global conversation history and user profile variables, and long-running synchronous LLM calls block the asyncio event loop.
* **Why is it happening?:** The system is built using FastAPI but relies on a stateful, synchronous backend design inherited from a monolithic or single-user script context, directly invoking LangChain's synchronous API without isolating state per request.
* **What does it imply?:** As user volume grows, the application will experience severe performance degradation (starvation) and critical data privacy issues (users seeing each other's chat history or data).

## Breakthrough Idea System
### 💡 Title: Stateless, Asynchronous API Architecture
### 🔍 Problem: Event loop starvation and cross-request state leakage due to global variables and synchronous blocking calls in FastAPI endpoints.
### 🧠 Insight: Refactoring the backend to be stateless per request and wrapping blocking calls in thread pools unlocks true concurrency without rewriting the entire LangChain pipeline asynchronously.
### 🔗 Connected Dots: FastAPI's `async def` vs `def` behavior + ThreadPoolExecutor + stateless HTTP paradigms.
### 🚀 Proposed Change: Migrate conversation history and user profile management to be request-scoped (passed as parameters or loaded from DB per user), and execute synchronous LangChain code using `asyncio.to_thread()` or by converting the FastAPI endpoint to a synchronous `def`.
### 📊 Impact: High. Prevents data leakage between users, significantly reduces event loop lag (e.g., from ~190ms to <2ms), and enables the application to scale to multiple concurrent users.
### ⚙️ Implementation (Suggestion Only):
1. Remove `global conversation_history` and `USERPROFILE` from `Main.py`.
2. Refactor `Main.AnswerQes` and related functions to accept `history` and `profile` as parameters and return the updated state.
3. Update `api.py` to load/save state (e.g., from a database or session) on each request.
4. Change `async def chat_query` to `def chat_query` so FastAPI runs it in a threadpool, OR wrap `Main.AnswerQes` with `await asyncio.to_thread(Main.AnswerQes, ...)`.
### ⚠️ Trade-offs: Requires a refactor of the core state management, potentially increasing latency slightly per request due to repeated state loading/saving, but massively improves throughput and correctness.

## Idea Generator
* **Idea 1:** Transition from synchronous LangChain `invoke` methods to their asynchronous counterparts (`ainvoke`). (System Optimization)
* **Idea 2:** Implement Redis or a similar key-value store for session-based conversation history instead of in-memory lists. (Feature Expansion)
* **Idea 3:** Add middleware to measure and log event loop lag automatically to monitor starvation issues. (Automation)

## Scoring System
* **Stateless, Asynchronous API Architecture:** Impact (9) * 0.30 + Leverage (9) * 0.25 + Scalability (10) * 0.20 + Novelty (3) * 0.15 + Feasibility (7) * 0.10 = 2.7 + 2.25 + 2.0 + 0.45 + 0.70 = 8.1
* **Transition to `ainvoke`:** Impact (8) * 0.30 + Leverage (7) * 0.25 + Scalability (8) * 0.20 + Novelty (2) * 0.15 + Feasibility (5) * 0.10 = 2.4 + 1.75 + 1.6 + 0.3 + 0.5 = 6.55
* **Session-based Redis History:** Impact (9) * 0.30 + Leverage (8) * 0.25 + Scalability (9) * 0.20 + Novelty (4) * 0.15 + Feasibility (6) * 0.10 = 2.7 + 2.0 + 1.8 + 0.6 + 0.6 = 7.7
* **Event Loop Lag Middleware:** Impact (5) * 0.30 + Leverage (6) * 0.25 + Scalability (5) * 0.20 + Novelty (5) * 0.15 + Feasibility (9) * 0.10 = 1.5 + 1.5 + 1.0 + 0.75 + 0.9 = 5.65

## Prioritization Engine
### 🔥 Now
* **Stateless, Asynchronous API Architecture (Score: 8.1)** - Critical for basic application correctness and scalability.

### ⚡ Next
* **Session-based Redis History (Score: 7.7)** - Necessary follow-up to support the stateless architecture effectively.
* **Transition to `ainvoke` (Score: 6.55)** - Further optimization once the core architecture is sound.

### 🧪 Later
* **Event Loop Lag Middleware (Score: 5.65)** - Useful for monitoring, but secondary to fixing the actual issues.

### ❌ Drop
* None currently.

## Execution Planner
### 🎯 Objective: Resolve event loop starvation and state leakage without breaking existing functionality.
### 🧩 Tasks Breakdown:
1. Identify all usages of global state in `Main.py` and modify function signatures to accept them as arguments.
2. Update the FastAPI route in `api.py` to either be synchronous or to offload synchronous work to a thread.
3. Implement a per-request state management solution (even if it's just a file-based mock for now) to replace the global variables.
### 🧑‍💻 Code-Level Changes (Descriptive Only):
* **Main.py:** Remove `conversation_history: list = []` and `USERPROFILE = ...`. Update `AnswerQes`, `summarize_history_if_needed`, and `prompts_organizer` signatures.
* **api.py:** Modify `chat_query` to handle state loading/saving and thread offloading (e.g., changing `async def` to `def`).
### ⏱ Time Estimate: 1-2 Days
### 📈 Expected Outcome: Zero cross-user data leakage and event loop lag reduced to < 5ms under concurrent load.

## Execution Prompts Generator
### SYSTEM PROMPT
You are a senior backend engineer specializing in scalable, high-concurrency FastAPI applications.
### TASK PROMPT
Refactor the Zenith AI backend to eliminate global state leakage and event loop starvation. Make the system stateless per request and ensure synchronous operations do not block the asyncio event loop.
### CONTEXT
The current system uses global variables (`conversation_history`, `USERPROFILE`) in `Main.py` and calls synchronous, blocking LangChain methods from an `async def` FastAPI endpoint (`chat_query` in `api.py`). This causes data to leak between users and the server to stall during concurrent requests.
### OUTPUT FORMAT
* Refactored code snippets for `Main.py` and `api.py`.
* Explanation of the architectural changes.
* Instructions for testing concurrency and state isolation.

## Feedback Loop
### Evaluate
* Did it improve the metric? Pending execution. Expected to drastically improve concurrency metrics.
* Any unintended issues? Pending execution.
### Store
* Results logged in `notes.md`.
### Refine
* If thread offloading adds too much overhead, reconsider a full rewrite to asynchronous LangChain methods (`ainvoke`).
