# Observation Engine

* Raw Observation: The `Main.py` module uses a global `conversation_history` variable and a global `USERPROFILE` variable to store conversational state.
* Context: These are accessed and mutated within the `AnswerQes` function in `Main.py`, which is called by the `/chat/query` FastAPI endpoint in `api.py`.
* Frequency: Frequent (Every time a user sends a message).
* Severity: High (When multiple concurrent users interact with the system, their conversation histories and profiles will interleave, leading to cross-contamination of PII and chat context. This severely limits concurrent users to exactly 1).

* Raw Observation: FastAPI endpoints in `api.py` like `/chat/query` are declared with `async def`, but the underlying LangChain `invoke` methods and Qdrant retriever interactions in `Main.py` are synchronous.
* Context: Inside `Main.py`, `LLM_WITH_TOOLS.invoke`, `retriever.invoke`, and `LLM.invoke` are called.
* Frequency: Frequent (Every chat request).
* Severity: High (An `async def` route executing blocking I/O starves the entire event loop, causing all concurrent requests to hang while waiting for the LLM or vector DB to respond).

# Insight Engine

* What is happening? The application operates entirely in a singleton-like pattern with global mutable variables holding state, and synchronous operations holding up the async event loop.
* Why is it happening? The code was likely written as a single-user prototype script and later wrapped with FastAPI without rearchitecting for web scale.
* What does it imply? The system cannot handle more than a single user at any given time without catastrophic data leakage (users receiving replies intended for other users) and performance degradation (the server blocking entirely). The implied leverage is a complete transformation from a local prototype to a multi-tenant scalable SaaS.

# Idea Generator

* System Optimization & UX Transformation: Session Management and Stateless Execution. Pass a unique session ID with each request. Migrate `conversation_history` and `USERPROFILE` to an in-memory store (like Redis or a Python dictionary keyed by session ID) or pass them in the request payload. This solves the data leakage limitation.
* System Optimization: Asynchronous Execution or Thread Pooling. Convert the `async def` endpoints in `api.py` (like `chat_query` and `submit_assessment`) to standard `def`. This leverages FastAPI's default thread pool, allowing concurrent processing of synchronous, blocking Langchain and file I/O operations without starving the event loop.

# Breakthrough Idea System

### 💡 Title
Stateless Multi-Tenant Conversion & Concurrency Unlock

### 🔍 Problem
The application currently functions as a single-user prototype. Global variables in `Main.py` cause cross-user data leakage, and synchronous Langchain calls inside `async def` FastAPI routes block the entire web server, reducing throughput to exactly one concurrent request.

### 🧠 Insight
The hidden leverage is that the core AI logic is already modularized in `Main.py`. By shifting state management out of global scope and letting FastAPI manage thread-pooling correctly, the application transitions from a localized script into a massively scalable, multi-tenant SaaS backend with minimal refactoring.

### 🔗 Connected Dots
Combining thread-pool utilization (FastAPI's `def` vs `async def`) with session-keyed state management eliminates both the concurrency bottleneck and the PII leakage simultaneously.

### 🚀 Proposed Change
1. Remove global `conversation_history` and `USERPROFILE` from `Main.py`.
2. Change the signature of `AnswerQes` to accept a `session_id` and maintain state per user, potentially using a session-store or passing state from the client.
3. Change FastAPI endpoints in `api.py` that call synchronous operations from `async def` to `def` (e.g. `@app.post("/chat/query") def chat_query...`), moving blocking operations into Starlette's threadpool.

### 📊 Impact
- Scalability leaps from 1 concurrent user to hundreds or thousands (bound only by API limits and server resources).
- Retention and trust increase, as the risk of users seeing each other's sensitive health queries is fully mitigated.

### ⚙️ Implementation (Suggestion Only)
- In `api.py`: Modify `@app.post("/chat/query") async def chat_query` to `@app.post("/chat/query") def chat_query`.
- In `Main.py`: Introduce a `SessionManager` class or a simple `dict` keyed by `session_id` (passed from the client or generated via JWT). Store `conversation_history` and `USERPROFILE` in this structure rather than as global module variables. Pass `session_id` through from `api.py` to `Main.py` functions.

### ⚠️ Trade-offs
In-memory session storage (a `dict` keyed by session ID) limits the application to a single backend worker node. To scale horizontally to multiple nodes, an external cache like Redis would eventually be required.

# Scoring System

### 1. Impact
10 - It prevents severe data leakage and PII exposure between users, making the application safe for public release. It directly impacts growth and retention.

### 2. Feasibility
8 - Changing FastAPI endpoints to `def` is trivial. Moving state to a session dictionary requires careful plumbing of `session_id` but is structurally simple.

### 3. Leverage
9 - The output (a multi-tenant system) is immensely more valuable than the input (a few hours of refactoring).

### 4. Novelty
5 - Standard backend architecture, but profoundly transformative for this specific codebase.

### 5. Scalability
9 - Unlocks the fundamental bottleneck holding back scale.

Final Score Calculation:
(10 × 0.30) + (9 × 0.25) + (9 × 0.20) + (5 × 0.15) + (8 × 0.10)
= 3.0 + 2.25 + 1.8 + 0.75 + 0.8
= 8.6

# Prioritization Engine

Priority Bucket: 🔥 Now (Breakthrough)
Score: 8.6

# Execution Planner

### 🎯 Objective
Transform the system to support concurrent, multi-tenant usage without state leakage or event-loop blocking.

### 🧩 Tasks Breakdown
1. Update FastAPI endpoints to use thread pools for blocking operations.
2. Abstract global state into a session-aware structure.
3. Update all function signatures in `Main.py` and `api.py` to correctly propagate user state based on a session identifier.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
- `api.py`:
  - Change `async def chat_query` to `def chat_query`.
  - Extract a `session_id` from the request (e.g. from headers or a cookie).
- `Main.py`:
  - Delete `conversation_history = []` and `USERPROFILE = {}`.
  - Create a state store `USER_SESSIONS = {}`.
  - Update `AnswerQes(query: str, session_id: str)` to fetch the user's specific history and profile from `USER_SESSIONS[session_id]`.

### ⏱ Time Estimate
4 Hours

### 📈 Expected Outcome
System successfully processes simultaneous requests from multiple users without mixing chat histories or hanging the server.

# Execution Prompts Generator

### SYSTEM PROMPT
You are a senior backend engineer specializing in FastAPI, Python concurrency, and scalable AI infrastructure.

### TASK PROMPT
Refactor the provided `Main.py` and `api.py` files to eliminate global state leakage and resolve event loop blocking.
1. Convert the global `conversation_history` and `USERPROFILE` variables in `Main.py` into a session-keyed dictionary to support multiple concurrent users safely.
2. Change the FastAPI endpoints in `api.py` that perform synchronous Langchain/LLM calls from `async def` to `def` so they run in a thread pool.
3. Modify the Pydantic models and request objects to accept and utilize a `session_id` string.

### CONTEXT
The current system stores conversation history in a global list, meaning concurrent requests overwrite and leak data between users. Furthermore, synchronous AI model calls are run within `async def` routes, blocking the main event loop and limiting the server to handling one request at a time.

### OUTPUT FORMAT
Provide the complete updated code for `api.py` and `Main.py` with inline comments explaining the state management and concurrency changes.

# Feedback Loop

### Evaluate
- Run a load test (e.g. using Locust or Apache Bench) to simulate 10 concurrent users.
- Validate that the server handles the requests concurrently and that each user receives only their own chat history and profile.

### Store
- Log the metrics (response times, error rates) in `notes.md` after the test.

### Refine
- If memory usage scales too high due to in-memory session dictionaries, pivot the idea towards integrating Redis for distributed session storage.