# Observation Engine

### Raw Observation:
Event Loop Lag in Asynchronous Endpoints.

### Context:
In `api.py`, multiple `async def` endpoints (`/chat/query`, `/user/assessment`, `/user/profile`) are performing blocking I/O calls directly on the main event loop. For instance, `/chat/query` calls synchronous functions like `Main.AnswerQes` and `Main.run_retrieval_pipeline` which involve significant blocking logic like API requests to LLM inference or synchronous Qdrant retrieval. Similarly, endpoints accessing the filesystem such as `/user/assessment` or `/user/profile` utilize standard `open()` via `UserProfileModule`.

### Frequency:
Frequent (happens on every corresponding request).

### Severity:
High. Blocking the main thread in FastAPI restricts horizontal concurrency handling. Other simultaneous incoming async requests have to wait for the blocking I/O to finish, completely nullifying the advantages of asynchronous I/O and creating severe scalability limits.

---
# Insight Engine

### What is happening?
`async def` route handlers in FastAPI execute on the single main event loop thread. By introducing synchronous blocking functions inside these endpoints, the application is suffering from "Event Loop Starvation." The event loop waits idly for the LLM API, Qdrant client, or local disk read/write instead of progressing other requests.

### Why is it happening?
The handlers are marked `async def` which forces them onto the event loop, but the libraries or methods invoked inside them (e.g. Langchain synchronous methods, Qdrant standard client, `UserProfileModule`'s `open()`) are not natively asynchronous.

### What does it imply?
This mismatch acts as a silent killer for system scalability. As traffic scales, the application will experience dramatically increased latencies, thread starvation, and potential request timeouts.

---
# Idea Generator

### Idea
**Offload Blocking I/O using Thread Pools or Synchronous Endpoints**
The idea is to change FastAPI endpoints from `async def` to regular `def` if the underlying processing is synchronous, or alternatively offload those heavy tasks using `await asyncio.to_thread()`. This prevents the event loop from being blocked and handles incoming concurrent requests smoothly by leveraging a thread pool.

### Leverage Introduced
By merely tweaking the function definition signature or wrapping with `to_thread`, we instantly unlock the framework's capability to process other requests asynchronously. It scales request-handling capacity with virtually zero cost.

---
# Breakthrough Idea System

### 💡 Title
**Unlock Concurrent Scale: Preventing Event Loop Starvation**

### 🔍 Problem
The current application suffers from Event Loop Starvation because `async def` endpoints are running synchronous blocking I/O calls directly, which freezes the event loop for all other pending concurrent requests.

### 🧠 Insight
FastAPI provides a built-in mechanism to gracefully handle synchronous blocking operations. By defining endpoints as `def` (synchronous) instead of `async def` (asynchronous), FastAPI automatically runs them in an external thread pool. This simple shift bridges the gap between synchronous libraries and an async framework without rewriting the logic.

### 🔗 Connected Dots
As the product incorporates complex systems like external LLM inference, Vector DB lookup, and file-based state management, synchronous blocking operations are inevitable. The current architecture forces all these heavy loads onto the single main thread.

### 🚀 Proposed Change
Audit all FastAPI endpoints. If an endpoint consists primarily of synchronous blocking operations (e.g., `Main.AnswerQes`, `Main.run_retrieval_pipeline`, `UserProfileModule.load_user_profile`), convert its signature from `async def` to regular `def`. For the few async-heavy ones containing small blocking operations, wrap the blocking call inside `await asyncio.to_thread()`.

### 📊 Impact
* **Latency & Concurrency:** Drastically reduces event loop lag (e.g., reducing from ~190ms to <2ms during blocking I/O).
* **Scalability:** The application will be able to handle multiple simultaneous users without locking up.

### ⚙️ Implementation (Suggestion Only)
1. Review `api.py`.
2. Locate `async def chat_query(payload: ChatRequest):`.
3. Locate `async def submit_assessment(payload: AssessmentPayload):`.
4. Locate `async def get_user_profile():`.
5. Remove the `async` keyword and any redundant `await` calls if they are entirely synchronous, or retain `async` but wrap the `Main.AnswerQes()` in `asyncio.to_thread()`.

### ⚠️ Trade-offs
Using a thread pool increases memory footprint slightly as each thread requires a stack. However, the limit is typically 40 threads, making it very acceptable for the scalability unlocked.

---
# Scoring System

### 1. Impact: 9
Massive improvement in handling concurrency and scaling.
### 2. Feasibility: 9
Trivial change. Just updating function signatures in `api.py`.
### 3. Leverage: 10
Negligible effort for exponential scalability.
### 4. Novelty: 4
Standard FastAPI best practice, but crucial.
### 5. Scalability: 9
Unlocks the true potential of the application to serve multiple requests concurrently.

**Final Score:**
`(9 × 0.30) + (10 × 0.25) + (9 × 0.20) + (4 × 0.15) + (9 × 0.10) = 2.7 + 2.5 + 1.8 + 0.6 + 0.9 = 8.5`

---
# Prioritization Engine

### 🔥 Now
With a Final Score of **8.5**, this idea falls into the **Breakthrough (Immediate recommendation)** priority bucket. It requires extremely low effort for exceptionally high structural impact.

---
# Execution Planner

### 🎯 Objective
Eliminate Event Loop Starvation by preventing blocking I/O on the main thread in FastAPI endpoints.

### 🧩 Tasks Breakdown
1. Identify `async def` endpoints that execute blocking I/O.
2. Alter the function signature to remove `async` OR wrap blocking I/O calls in `await asyncio.to_thread(...)`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* **File:** `api.py`
* Modify `async def chat_query(...)` to `def chat_query(...)` or wrap `Main.AnswerQes()` with `asyncio.to_thread(...)`.
* Modify `async def submit_assessment(...)` to `def submit_assessment(...)`.
* Modify `async def get_user_profile(...)` to `def get_user_profile(...)`.
* Modify `async def health()` - this is already non-blocking so it can remain `async def` or be switched to `def`.

### ⏱ Time Estimate
1-2 Hours

### 📈 Expected Outcome
Complete resolution of event loop lag spikes during concurrent requests involving Qdrant, LLM inferences, and file reads.

---
# Execution Prompts Generator

### SYSTEM PROMPT
You are a senior software engineer specializing in scalable Python and FastAPI backends.

### TASK PROMPT
Eliminate Event Loop Starvation in the FastAPI application by managing blocking I/O calls appropriately. Review `api.py` and convert `async def` endpoints that utilize synchronous libraries or logic (like file I/O or LangChain `invoke` methods) into standard `def` endpoints, so FastAPI offloads them to a thread pool.

### CONTEXT
The endpoints `chat_query`, `submit_assessment`, and `get_user_profile` currently use `async def` but perform blocking synchronous operations internally (`Main.AnswerQes`, `Main.run_retrieval_pipeline`, `UserProfileModule.load_user_profile`). This blocks the main event loop and degrades concurrency.

### OUTPUT FORMAT
* Code replacements.
* Explanation of the changes.

---
# Feedback Loop

### Evaluate
* Metrics to monitor: Thread blocking metrics, endpoint response time during concurrent requests.
* Check for unintended serialization of requests.

### Store
Logged in `notes.md`.

### Refine
Observe if the underlying libraries (like LangChain or Qdrant) have native `async` support that could be adopted later for true asynchronous handling.
