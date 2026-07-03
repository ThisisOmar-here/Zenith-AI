# 📝 1. Observation Engine

### Raw Observation
Global variables (`conversation_history` and `USERPROFILE`) are used in `Main.py` to maintain user state. `api.py` exposes the `Main.AnswerQes` endpoint asynchronously but delegates to these blocking global states and synchronous LLM calls.

### Context
FastAPI API (`api.py`) interacting with LLM QA endpoints (`Main.py`).

### Frequency
Frequent (Occurs on every concurrent request).

### Severity
High (Causes state leakage across different concurrent users, mixing conversation histories and profiles; synchronous methods block event loop).

---

# 🔍 2. Insight Engine

### What is happening?
The server is retaining and sharing user-specific state (`conversation_history`, `USERPROFILE`) in global module-level variables. Additionally, synchronous LLM invoke operations block the main thread.

### Why is it happening?
The design relies on module-level globals in `Main.py` for state, which is a single instance shared across all asynchronous requests handled by FastAPI.

### What does it imply?
If multiple users interact with the application simultaneously, User A could receive context or history belonging to User B. The event loop starvation also causes extreme latency spikes under load. This prevents scalability to multiple concurrent users.

---

# 🔗 3. Idea Generator

### Idea Types
System Optimization, Architectural Transformation

### Requirement
- **Solve a real limitation:** Resolves the security risk of data leakage and scaling bottlenecks.
- **Introduce leverage:** Enables stateless horizontal scaling and safe concurrent usage.
- **Explainable logically:** Shifting state from server memory to database/client (statelessness) prevents cross-contamination. Wrapping synchronous tasks in thread pools prevents event loop blocking.

---

# 💡 4. Breakthrough Idea System

### 💡 Title
Stateless Architecture & Asynchronous Decoupling

### 🔍 Problem
Cross-user state leakage via global variables and severe event loop starvation blocking concurrent requests.

### 🧠 Insight
Module-level variables in Python act as singletons across the application lifecycle. FastAPI runs concurrently, so multiple requests modifying these singletons inherently race and overwrite each other, causing leakage.

### 🔗 Connected Dots
Stateless APIs + Thread-pool offloading = Safe concurrency + high throughput + zero data leakage.

### 🚀 Proposed Change
Refactor the architecture to become entirely stateless at the module level. Pass user state (history, profile) explicitly in request payloads or fetch it dynamically per request using session IDs. Wrap blocking I/O (LLM calls) in `asyncio.to_thread()`.

### 📊 Impact
Eliminates cross-user data leakage (Privacy/Security). Unblocks the event loop, achieving multi-user concurrent support with minimal latency.

### ⚙️ Implementation (Suggestion Only)
Remove `conversation_history` and `USERPROFILE` globals from `Main.py`. Pass `user_id` or `session_id` to endpoints. Fetch/store user state per-request from/to a database or external cache. Use `await asyncio.to_thread()` for LangChain `.invoke()` calls.

### ⚠️ Trade-offs
Increased database I/O per request to fetch/store history. Code complexity increases by managing state per user session rather than implicitly.

---

# 📊 5. Scoring System

### 1. Impact: 10
(Crucial for multi-tenant SaaS viability and data privacy)
### 2. Feasibility: 8
(Standard web architecture refactor, manageable complexity)
### 3. Leverage: 9
(Fixes foundational architecture, unlocking horizontal scale)
### 4. Novelty: 4
(Standard best practice, not conceptually novel)
### 5. Scalability: 10
(Moves from 1-user limit to theoretically infinite concurrency)

Final Score = (10 × 0.30) + (9 × 0.25) + (10 × 0.20) + (4 × 0.15) + (8 × 0.10)
Final Score = 3.0 + 2.25 + 2.0 + 0.6 + 0.8 = 8.65

Score Interpretation: **8.65** -> Breakthrough (Immediate recommendation)

---

# 🧭 6. Prioritization Engine

### 🔥 Now
**Stateless Architecture & Asynchronous Decoupling** (Score: 8.65) - High score + urgent security/scaling necessity.

### ⚡ Next
Implement Redis/DB session store for fast history retrieval.

### 🧪 Later
Migrate all synchronous LangChain logic to its async counterparts (`ainvoke`).

### ❌ Drop
Attempting to lock the global variables (does not solve scaling, only prevents crash/race conditions on the single user).

---

# ⚙️ 7. Execution Planner (Suggestion Mode Only)

### 🎯 Objective
Eliminate global state leakage and resolve event loop starvation to support secure, concurrent users.

### 🧩 Tasks Breakdown
1. Update `api.py` endpoints to accept `user_id` or `session_id`.
2. Remove `conversation_history` and `USERPROFILE` from `Main.py`.
3. Modify `AnswerQes` to accept history and profile dynamically.
4. Wrap blocking I/O calls in `asyncio.to_thread()`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
- **`Main.py`**: Delete lines initializing `conversation_history = []` and `USERPROFILE = {}`. Change `def AnswerQes(query: str, history: list, profile: dict):`. Use `await asyncio.to_thread(LLM_WITH_TOOLS.invoke, ...)` instead of direct invocation.
- **`api.py`**: Inject user session context into `Main.AnswerQes()` calls. Manage loading/saving state per user instead of relying on globals.

### ⏱ Time Estimate
1-2 Days

### 📈 Expected Outcome
0% cross-user data leakage. Multi-user concurrent request latency reduced dramatically due to unblocked event loops.

---

# 🤖 8. Execution Prompts Generator

### SYSTEM PROMPT
You are a senior backend engineer and Python/FastAPI expert specializing in scalable, stateless web services.

### TASK PROMPT
Refactor the Zenith AI application to eliminate global state leakage and prevent event loop starvation. Remove all global variables (`conversation_history`, `USERPROFILE`) in `Main.py` and implement a stateless design where user context is passed dynamically. Wrap synchronous blocking calls (like LLM `.invoke`) using `asyncio.to_thread()`.

### CONTEXT
The current architecture in `Main.py` uses module-level global variables for conversation history and user profiles. FastAPI in `api.py` serves these asynchronously, causing state leakage (users seeing each other's data) and event loop blocking (latency spikes).

### OUTPUT FORMAT
- Code for `Main.py` and `api.py`.
- Explanation of the state flow changes.
- Integration steps for deployment.

---

# 🔁 9. Feedback Loop

### Evaluate
Did it improve the metric? (Pending execution) Wait to measure latency drops and verify state isolation in concurrent tests.
Any unintended issues? Increased latency on single requests due to DB lookups.

### Store
Results stored in `notes.md`.

### Refine
If DB lookups are too slow, consider introducing a distributed cache like Redis for in-memory session state.
