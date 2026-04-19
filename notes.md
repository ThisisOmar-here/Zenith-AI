# 📝 Observation Engine

* **Raw Observation:** FastAPI endpoints (`chat_query`, `get_history`) are defined as `async def` but perform synchronous blocking I/O (e.g., Langchain `invoke`).
* **Context (where it occurs):** `api.py` and `Main.py`.
* **Frequency:** Frequent (Every chat request).
* **Severity:** High (Blocks event loop, poor scalability).

* **Raw Observation:** State management relies on global variables `conversation_history` and `USERPROFILE`.
* **Context (where it occurs):** `Main.py` `AnswerQes` function.
* **Frequency:** Frequent (Every chat request).
* **Severity:** High (Critical security/privacy risk of state leakage between concurrent users).

* **Raw Observation:** CORS middleware allows wildcard `"*"` origins concurrently with `allow_credentials=True` when `ALLOW_ALL_ORIGINS=true`.
* **Context (where it occurs):** `api.py` CORS configuration.
* **Frequency:** Occasional (Depends on deployment environment).
* **Severity:** High (CSRF vulnerability risk if enabled).

---

# 🔍 Insight Engine

* **What is happening?** The application is handling concurrent requests using global state and blocking the asynchronous event loop with synchronous AI/IO operations.
* **Why is it happening?** The codebase grew from a simple single-user prototype into a web server without adapting to FastAPI/multi-user paradigms.
* **What does it imply?** The current architecture cannot scale beyond a single user without mixing up their private mental health conversations. The server will become unresponsive under minimal load due to event loop blocking.

---

# 🔗 Idea Generator

* **Feature Expansion:** Implement a stateless API using session tokens or user IDs to fetch/store user-specific context from a database.
* **System Optimization:** Refactor FastAPI route definitions from `async def` to `def` so FastAPI runs them in an external thread pool, preventing event loop blocks.
* **Security & Compliance:** Restrict CORS configurations to prevent wildcard origins when credentials are allowed.
* **Growth Mechanism:** A safe, scalable architecture will allow onboarding more users without privacy breaches or server crashes.

---

# 💡 Breakthrough Idea System

### 💡 Title
Stateless Concurrent AI Engine Refactor

### 🔍 Problem
The current application architecture relies on global variables for user state and blocks the asynchronous event loop with synchronous LLM calls. This prevents the application from scaling and introduces critical privacy risks (cross-user data leakage).

### 🧠 Insight
By separating user state from the application memory and aligning the API's concurrency model with FastAPI's intended design, we can drastically increase the application's scalability and guarantee user privacy. Hidden leverage lies in utilizing FastAPI's built-in thread pool for sync I/O.

### 🔗 Connected Dots
Global state (`Main.py`) + Event Loop Blocking (`api.py`) + CORS vulnerability -> Complete architectural overhaul needed to support >1 user safely.

### 🚀 Proposed Change
Migrate all global state (`conversation_history`, `USERPROFILE`) to an external datastore (e.g., Redis, DB, or at least per-user files) keyed by `user_id`. Refactor all `async def` route handlers performing sync I/O into `def` handlers to utilize standard thread pooling. Fix CORS configuration to prevent wildcard origins with credentials.

### 📊 Impact
* **Revenue/Growth:** Increases potential concurrent user base from 1 to infinity.
* **Retention:** Prevents catastrophic data leaks that would destroy user trust.
* **Efficiency:** Server can handle concurrent requests without locking up.

### ⚙️ Implementation (Suggestion Only)
1. Remove `global USERPROFILE` and `conversation_history` from `Main.py`.
2. Update `api.py` endpoints to accept and parse a `user_id` or session token.
3. Modify `AnswerQes` to accept `user_id`, retrieve the profile/history dynamically per user, process the query, and save the state back.
4. Change `@app.post("/chat/query") async def chat_query` to `def chat_query`.
5. Update CORS middleware configuration to prevent `allow_origins=["*"]` when `allow_credentials=True`.

### ⚠️ Trade-offs
Will require significant refactoring of core chat logic. Existing local deployments without user auth will need a default/mock `user_id`.

---

# 📊 Scoring System

### 1. Impact: 10
Critical for scaling and privacy.

### 2. Feasibility: 7
Moderate refactoring required, but standard patterns exist.

### 3. Leverage: 9
Fixing this unlocks the ability to serve many users on the same infrastructure with minimal future effort.

### 4. Novelty: 4
Standard web dev practice, but transformative for this specific app.

### 5. Scalability: 10
Transforms the app from single-user to multi-user capable.

### Final Score
`Final Score = (10 * 0.30) + (9 * 0.25) + (10 * 0.20) + (4 * 0.15) + (7 * 0.10) = 3.0 + 2.25 + 2.0 + 0.60 + 0.70 = 8.55`

---

# 🧭 Prioritization Engine

### 🔥 Now
* **Stateless Concurrent AI Engine Refactor (Score: 8.55)**. Absolute highest priority because the app fundamentally cannot work safely for multiple users right now.

---

# ⚙️ Execution Planner (Suggestion Mode Only)

## Execution Plan: Stateless Concurrent AI Engine Refactor

### 🎯 Objective
Eliminate global state to allow concurrent multi-user interactions and prevent event-loop blocking to increase throughput.

### 🧩 Tasks Breakdown
1. Pass `user_id` down from `api.py` endpoints into `Main.py` logic.
2. In `Main.py`, remove global references to `USERPROFILE` and `conversation_history`. Fetch them from storage based on `user_id`.
3. In `api.py`, change `async def chat_query` to `def chat_query` to let FastAPI use thread pooling.
4. Fix CORS configuration to prevent `["*"]` when `allow_credentials=True`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* `Main.py`: Delete `conversation_history = []` at module level. Modify `AnswerQes` signature to `AnswerQes(query: str, session_id: str)`.
* `api.py`: Remove `async` keyword from `chat_query` and `get_history` definitions. Update CORS config check.
* `UserProfile.py`: Ensure thread-safe or per-user file operations.

### ⏱ Time Estimate
1-2 Days.

### 📈 Expected Outcome
System can serve 100+ concurrent users without data leakage or timeouts.

---

# 🤖 Execution Prompts Generator

### SYSTEM PROMPT
You are a senior backend engineer specializing in FastAPI and scalable Python architecture.

### TASK PROMPT
Refactor the Zenith AI backend to be completely stateless and concurrent. Remove all global state variables in `Main.py`, update `api.py` to handle synchronous endpoints properly (removing `async def` where blocking I/O occurs), and fix the CORS security vulnerability regarding wildcard origins and credentials.

### CONTEXT
Currently, `Main.py` uses global `conversation_history` and `USERPROFILE`, causing data leaks between concurrent requests. `api.py` uses `async def` for routes that do synchronous LangChain LLM calls, blocking the event loop. The app needs to support multiple users concurrently safely.

### OUTPUT FORMAT
* Refactored code for `api.py`
* Refactored code for `Main.py`
* Explanation of concurrency changes

---

# 🔁 Feedback Loop

### Evaluate
(To be evaluated post-execution: Did the server stop blocking under load? Are users successfully isolated?)

### Store
Results will be recorded in future iterations of `notes.md`.

### Refine
If standard thread-pooling is insufficient, consider migrating completely to `ainvoke` for asynchronous LangChain execution.
