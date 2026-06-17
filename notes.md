# Observation Engine
- **Raw Observation:** Global variables `USERPROFILE` and `conversation_history` are used in `Main.py` for state management, which are accessed during FastAPI handling.
  - **Context:** `Main.py` in `AnswerQes` function.
  - **Frequency:** Frequent (Every query)
  - **Severity:** High
- **Raw Observation:** Synchronous LangChain `invoke` and blocking I/O calls in `Main.py` and `UserProfile.py` are executed directly within `async def chat_query` and other async routes in `api.py`.
  - **Context:** `api.py` in `chat_query` function.
  - **Frequency:** Frequent (Every query)
  - **Severity:** High
- **Raw Observation:** In `api.py`'s `_merge_assessment_into_profile`, when adding a new `generalMood` to `feelings` array that is at the 10-item limit, appending and slicing `[:10]` causes the newest mood to be dropped immediately.
  - **Context:** `api.py` lines 145-150.
  - **Frequency:** Occasional
  - **Severity:** Medium

# Insight Engine
- **What is happening?** The application relies on single global state instances and runs heavy synchronous operations in async loops.
- **Why is it happening?** A naive implementation mixing standard synchronous python scripts with FastAPI without session management or thread pools.
- **What does it imply?** The application is not horizontally scalable or even vertically scalable under concurrent load. Cross-user state leakage will happen.

# Idea Generator
- **Idea:** Refactor state management to use request-scoped contexts (e.g. dependency injection in FastAPI) or a database/Redis for session management.
- **Idea:** Wrap blocking I/O and synchronous LLM calls with `await asyncio.to_thread()` or change the endpoints to `def` so FastAPI handles thread pooling.
- **Idea:** Fix the feelings array logic by prepending new moods or slicing correctly so the newest mood is retained.

# Breakthrough Idea System
## 💡 Title: Stateless Asynchronous API Transformation
## 🔍 Problem: The API cannot handle concurrent users due to global state leakage and event loop starvation.
## 🧠 Insight: Moving state to a session store and offloading sync tasks to threads unlocks true SaaS scalability.
## 🔗 Connected Dots: Global variables + synchronous LLM calls in async routes = complete failure under scale.
## 🚀 Proposed Change: Migrate all user state to request context/Redis and wrap sync calls in `asyncio.to_thread`.
## 📊 Impact: 100x increase in concurrent user capacity with 0 cross-user data leakage.
## ⚙️ Implementation (Suggestion Only):
  - Remove `global USERPROFILE` and `conversation_history`.
  - Pass state via FastAPI Dependencies.
  - Use `asyncio.to_thread(Main.AnswerQes, ...)` in `api.py`.
## ⚠️ Trade-offs: Increases code complexity and requires a state store (e.g., Redis).

# Scoring System
- **Impact:** 9.0
- **Feasibility:** 6.0
- **Leverage:** 9.0
- **Novelty:** 4.0
- **Scalability:** 10.0
- **Final Score Calculation:** (9*0.3) + (9*0.25) + (10*0.2) + (4*0.15) + (6*0.1) = 2.7 + 2.25 + 2.0 + 0.6 + 0.6 = 8.15

# Prioritization Engine
- **Next:** Score 8.15 - High Priority. Do this after critical bugs.

# Execution Planner
## 🎯 Objective: Eliminate global state and event loop blocking.
## 🧩 Tasks Breakdown:
1. Replace global state in `Main.py` with session variables.
2. Update `api.py` to pass session contexts.
3. Wrap sync calls in `api.py` with thread pools.
## 🧑‍💻 Code-Level Changes (Descriptive Only):
- Modify `Main.py` to accept state arguments instead of using globals.
- Update `api.py` endpoints to inject dependencies.
## ⏱ Time Estimate: 2 Days
## 📈 Expected Outcome: Zero state leaks and <5ms event loop blocking.

# Execution Prompts Generator
## SYSTEM PROMPT
You are a senior backend engineer specializing in FastAPI and Python scalability.
## TASK PROMPT
Refactor `Main.py` and `api.py` to remove global state variables and wrap synchronous operations in `asyncio.to_thread`.
## CONTEXT
The current code uses `global USERPROFILE` and calls `LLM.invoke` directly in `async def` routes.
## OUTPUT FORMAT
Provide the refactored Python code with explanations.

# Feedback Loop
- **Evaluate:** To be evaluated after implementation.
- **Store:** Logged in `notes.md`.
- **Refine:** Monitor for any missed sync calls.
