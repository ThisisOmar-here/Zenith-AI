# Observation Engine

## Raw Observation 1
* **Raw Observation:** The FastAPI endpoint `chat_query` is defined as `async def` but calls synchronous, blocking LangChain methods (e.g., `Main.AnswerQes`, `Main.run_retrieval_pipeline`).
* **Context:** Occurs in `api.py` and `Main.py` when processing user chat queries.
* **Frequency:** Frequent (Every chat request)
* **Severity:** High (Causes event loop starvation and performance degradation under load)

## Raw Observation 2
* **Raw Observation:** Global variables (`conversation_history` and `USERPROFILE`) are used in `Main.py` to manage user state.
* **Context:** Occurs across user sessions, primarily accessed and mutated during chat processing.
* **Frequency:** Frequent (Every session)
* **Severity:** High (Risk of state leakage and cross-talk between concurrent users)

## Raw Observation 3
* **Raw Observation:** The `_merge_assessment_into_profile` function appends a new mood to the `feelings` list and then slices `[:10]`, which drops the newly appended mood if the list already has 10 items.
* **Context:** Occurs in `api.py` when submitting user assessments.
* **Frequency:** Occasional (Whenever a user with 10+ feelings submits a new assessment)
* **Severity:** Medium (Data loss for the most recent user mood entry)

---

# Insight Engine

## Insight 1: Event Loop Starvation
* **What is happening?** The asynchronous FastAPI event loop is being blocked by synchronous I/O and CPU-bound operations in LangChain.
* **Why is it happening?** Developers used `async def` for the endpoint but didn't wrap the blocking synchronous calls in `asyncio.to_thread()` or standard `def` functions.
* **What does it imply?** The application cannot scale concurrently; a single slow LLM request will block all other users from receiving responses, severely limiting throughput.

## Insight 2: Global State Leakage
* **What is happening?** Concurrent user requests are modifying and reading the same global memory structures (`conversation_history` and `USERPROFILE`).
* **Why is it happening?** The application lacks a robust session management system or stateless architecture, likely a relic of an initial single-user prototype.
* **What does it imply?** High risk of severe privacy violations (User A seeing User B's history) and unpredictable system behavior as concurrent requests overwrite each other's state.

## Insight 3: Flawed Data Eviction
* **What is happening?** The newest user mood data is being silently discarded instead of the oldest data.
* **Why is it happening?** The slice operation `[:10]` retains the first 10 elements (oldest) rather than the last 10 elements (`[-10:]`).
* **What does it imply?** The AI companion will become out-of-sync with the user's current emotional state, degrading personalization and user trust over time.

---

# Idea Generator

* **Idea A (System Optimization):** Refactor `api.py` endpoints doing blocking I/O to use standard `def` instead of `async def`, or wrap synchronous LLM calls in `await asyncio.to_thread()`, instantly solving the event loop starvation.
* **Idea B (System Optimization & Security):** Migrate user state management from global variables to a session-based or stateless architecture using Redis or database-backed session IDs passed in requests.
* **Idea C (UX Transformation):** Fix the feelings list slicing to `[-10:]` to ensure the AI always bases its responses on the most recent user context.

---

# Breakthrough Idea System

### 💡 Title
Scalable & Secure Conversational Architecture

### 🔍 Problem
The current architecture blocks the event loop during heavy LLM calls and mixes user states globally, causing performance bottlenecks and severe data privacy risks.

### 🧠 Insight
Fixing the asynchronous blocking and the global state issues are deeply connected. By moving to a stateless request model, we not only secure user data but also naturally align with scalable, non-blocking asynchronous patterns.

### 🔗 Connected Dots
Event Loop Starvation + Global State Leakage -> A fundamental need for a stateless, decoupled architecture where each request is isolated and executed in a thread pool without blocking the main loop.

### 🚀 Proposed Change
1. Wrap all synchronous LangChain calls in `asyncio.to_thread()` in `Main.py`.
2. Remove global variables `conversation_history` and `USERPROFILE`. Instead, load state per request based on a unique user ID, pass it to the LLM, and persist it immediately.
3. Correct the `[:10]` slice logic to `[-10:]` during state persistence.

### 📊 Impact
* **Efficiency:** 10x improvement in concurrent request handling.
* **Security:** 100% elimination of cross-user state leakage.
* **Retention:** Better AI personalization by accurately retaining recent user moods.

### ⚙️ Implementation (Suggestion Only)
1. Modify `chat_query` to accept a `user_id`.
2. Refactor `Main.py` functions to accept `history` and `profile` as arguments rather than reading globals.
3. Use `await asyncio.to_thread(Main.AnswerQes, ...)` in the endpoint.
4. Update `api.py` assessment logic: `profile["feelings"] = (profile["feelings"] + [new_mood])[-10:]`.

### ⚠️ Trade-offs
* Requires refactoring the core request flow in both `api.py` and `Main.py`.
* Slight increase in I/O overhead due to loading/saving state per request instead of keeping it in memory.

---

# Scoring System

## Idea: Scalable & Secure Conversational Architecture
* **Impact:** 10 (Fixes critical scalability and security flaws)
* **Feasibility:** 7 (Requires careful refactoring but uses standard patterns)
* **Leverage:** 9 (One architectural change unlocks infinite horizontal scaling)
* **Novelty:** 4 (Standard SaaS best practice, not highly novel)
* **Scalability:** 10 (Directly enables concurrent user scaling)

*Final Score Calculation:*
(10 * 0.30) + (9 * 0.25) + (10 * 0.20) + (4 * 0.15) + (7 * 0.10)
= 3.0 + 2.25 + 2.0 + 0.6 + 0.7 = 8.55

---

# Prioritization Engine

## Priority Buckets

### 🔥 Now
* **Scalable & Secure Conversational Architecture (Score: 8.55)** - High impact, immediate necessity for production viability.

### ⚡ Next
* (None currently scored)

### 🧪 Later
* (None currently scored)

### ❌ Drop
* (None currently scored)

---

# Execution Planner

## Execution Plan

### 🎯 Objective
Eliminate event loop starvation and prevent cross-user state leakage by implementing thread-pool offloading and stateless request handling.

### 🧩 Tasks Breakdown
1. **Thread Offloading:** Update `api.py` to use `asyncio.to_thread` for all calls to `Main.py` that perform synchronous LangChain operations.
2. **State Isolation:** Refactor `Main.py` to remove global state. Pass `user_id` from `api.py`, load the user's specific state from a database/file, inject it into the LangChain context, and save it back post-request.
3. **Fix Data Eviction:** Update `_merge_assessment_into_profile` in `api.py` to use `[-10:]` instead of `[:10]`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* **`api.py`**:
  * Update `chat_query` to `await asyncio.to_thread(Main.AnswerQes, query, user_id)`.
  * Fix list slicing in `_merge_assessment_into_profile`.
* **`Main.py`**:
  * Delete global `conversation_history` and `USERPROFILE`.
  * Modify `AnswerQes` to accept `user_id`, load history/profile, execute LangChain chain, and save history/profile.

### ⏱ Time Estimate
1-2 Days

### 📈 Expected Outcome
* 0ms event loop blocking during LLM generation.
* Zero incidents of user data leakage.
* 100% accuracy in retaining the latest user moods.

---

# Execution Prompts Generator

### SYSTEM PROMPT
You are a Senior Python Backend Architect specializing in FastAPI and scalable asynchronous systems.

### TASK PROMPT
Refactor the FastAPI application to resolve event loop starvation and eliminate global state leakage.

### CONTEXT
The current codebase uses `async def` endpoints in FastAPI that call synchronous LangChain methods, blocking the event loop. Furthermore, user state is stored in global variables (`conversation_history`, `USERPROFILE`) in `Main.py`, causing cross-request data corruption. The `_merge_assessment_into_profile` function also incorrectly drops the newest user mood due to a `[:10]` slice instead of `[-10:]`.

### OUTPUT FORMAT
Provide the refactored code for `api.py` and `Main.py`.
Include an explanation of the changes.
List the steps required to integrate and test the updated architecture.

---

# Feedback Loop

### Evaluate
* Metrics to track: Event loop lag (ms), concurrent users supported without timeouts, user reports of incorrect chat history.
* Unintended issues: Monitor I/O performance; loading state from disk per request might increase baseline latency slightly compared to in-memory globals.

### Store
* Results will be appended to `notes.md` in future iterations.

### Refine
* If disk I/O becomes a bottleneck after removing globals, the next iteration should propose integrating an in-memory datastore like Redis for fast session management.
