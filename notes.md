# 🧠 Observation Engine

### Raw Observation 1: Global State Leakage
* **Raw Observation:** The application uses global variables (`conversation_history` and `USERPROFILE`) in `Main.py` to manage user state.
* **Context:** `Main.py`, specifically lines defining and updating `conversation_history` and `USERPROFILE`.
* **Frequency:** Frequent (Occurs on every user interaction).
* **Severity:** High (Architectural risk of state leakage across multiple concurrent requests, leading to users seeing other users' data or mixing histories).

### Raw Observation 2: Synchronous Blocking I/O in Async Context
* **Raw Observation:** FastAPI endpoints in `api.py` (`/chat/query`, etc.) are defined using `async def`, but they call synchronous blocking I/O functions (like `Main.AnswerQes`, which uses synchronous LangChain `invoke` and `requests`).
* **Context:** `api.py` and `Main.py` integration.
* **Frequency:** Frequent (Occurs on every chat request).
* **Severity:** Medium (Causes FastAPI event loop to block, significantly reducing concurrency and scalability).

### Raw Observation 3: CORS Vulnerability
* **Raw Observation:** The CORS configuration in `api.py` can potentially allow wildcard origins ('*') when `allow_credentials=True` if `ALLOW_ALL_ORIGINS` is set to true.
* **Context:** `api.py` CORS middleware setup.
* **Frequency:** Rare (Depends on environment variable configuration).
* **Severity:** High (CSRF vulnerability if wildcard origins are used with credentials).

---

# 🔍 Insight Engine

### Insight 1: State Management Crisis
* **What is happening?** User state (conversation history and profile) is stored in global variables within a singleton module (`Main.py`).
* **Why is it happening?** Likely due to rapid prototyping without considering multi-tenant web server concurrency.
* **What does it imply?** The application cannot safely scale beyond a single user at a time. Concurrency will lead to data corruption, privacy breaches, and incorrect AI responses. This is a critical blocker for any SaaS model. Hidden leverage: Moving state to a database or Redis immediately unlocks horizontal scalability.

### Insight 2: Concurrency Bottleneck
* **What is happening?** Asynchronous endpoints are executing synchronous, long-running tasks (LLM calls via LangChain, Qdrant retrieval, HTTP requests).
* **Why is it happening?** LangChain's default `invoke` methods are synchronous, and the FastAPI routing was set to `async def` by default without realizing the blocking nature of the underlying calls.
* **What does it imply?** The server will handle only one request at a time effectively, queuing others and causing timeouts under even mild load. Hidden leverage: Changing endpoints to standard `def` (to use FastAPI's thread pool) or converting internal logic to native `async` unlocks the true concurrency potential of FastAPI without major architectural rewrites.

---

# 🔗 Idea Generator

### Idea 1: Stateless AI Core + Redis Session Management (System Optimization)
* Solve limitation: Global state leakage.
* Leverage: Infinite scalability. By making `Main.py` stateless and passing session data per request, the application can scale across multiple worker processes or nodes.

### Idea 2: Thread-Pool Routing Shift (System Optimization)
* Solve limitation: Event loop blocking.
* Leverage: Immediate concurrency boost. Changing `async def` to `def` for endpoints wrapping synchronous logic requires minimal code changes but drastically improves throughput.

---

# 💡 Breakthrough Idea System

## 💡 Title: The Stateless Scalability Transformation

### 🔍 Problem
The application currently stores user session data (`conversation_history` and `USERPROFILE`) in global variables within `Main.py`, and blocks the FastAPI event loop by running synchronous LLM and DB calls inside `async def` endpoints. This prevents concurrent usage and risks catastrophic data leakage between users.

### 🧠 Insight
The core value of Zenith AI is the personalized interaction, which currently breaks if multiple users connect. The quickest path to enterprise-grade scalability isn't rewriting the entire AI logic, but decoupling state from the logic and aligning FastAPI's concurrency model with the synchronous nature of the underlying AI libraries.

### 🔗 Connected Dots
Combining Insight 1 (State leakage) and Insight 2 (Concurrency bottleneck) points to a unified architectural flaw: the system acts like a single-threaded local script rather than a multi-tenant web server.

### 🚀 Proposed Change
1.  **Refactor `Main.py` to be stateless:** Pass `conversation_history` and `USERPROFILE` as arguments to functions like `AnswerQes` rather than maintaining them as globals.
2.  **Implement Session Storage:** Use a lightweight, fast storage mechanism (e.g., Redis or an in-memory dictionary keyed by session ID for an MVP) to manage state per user session.
3.  **Correct Endpoint Definitions:** Change `async def` to `def` in `api.py` for endpoints that call synchronous blocking functions (`/chat/query`, `/user/assessment`).

### 📊 Impact
*   **Security & Privacy:** Eliminates the risk of users seeing each other's data (100% reduction in state leakage).
*   **Scalability:** Allows the application to handle multiple concurrent users, a prerequisite for SaaS.
*   **Performance:** Unblocks the event loop, reducing latency and timeouts under load.

### ⚙️ Implementation (Suggestion Only)
*   Update `Main.AnswerQes` to accept `conversation_history` and `USERPROFILE` as parameters and return the updated history/profile alongside the answer.
*   In `api.py`, introduce a session ID (e.g., via cookies or headers). Maintain a dict mapping `session_id` to `{"history": [], "profile": {}}`.
*   In `api.py`, change `@app.post("/chat/query") async def chat_query...` to `@app.post("/chat/query") def chat_query...`. Apply the same to other endpoints calling `Main.py` synchronously.
*   Ensure CORS configuration explicitly rejects `allow_origins=["*"]` when `allow_credentials=True`.

### ⚠️ Trade-offs
*   Slight increase in memory usage if storing many sessions in memory (mitigated by using Redis later).
*   Requires managing session expiration to prevent memory leaks.

---

# 📊 Scoring System

### Idea: The Stateless Scalability Transformation

1. **Impact:** 10 (Critical for multi-user functionality and security).
2. **Feasibility:** 8 (Straightforward refactoring, no complex new technologies required for MVP).
3. **Leverage:** 9 (Small code changes unlock massive scaling potential).
4. **Novelty:** 2 (Standard web architecture practice).
5. **Scalability:** 10 (Removes the primary bottleneck to scaling).

**Final Score Calculation:**
(10 × 0.30) + (9 × 0.25) + (10 × 0.20) + (2 × 0.15) + (8 × 0.10)
= 3.0 + 2.25 + 2.0 + 0.30 + 0.80
= **8.35**

---

# 🧭 Prioritization Engine

### Idea: The Stateless Scalability Transformation
* **Score:** 8.35
* **Bucket:** 🔥 **Next (High Priority)**
* **Reasoning:** It falls into the 7-8.4 range. While critical for a SaaS product, it requires careful implementation to avoid breaking existing logic. It is the immediate next step for robust deployment.

---

# ⚙️ Execution Planner (Suggestion Mode Only)

## Execution Plan: Implement Stateless Architecture and Thread-Pool Routing

### 🎯 Objective
Eliminate global state leakage and event loop blocking to enable safe, concurrent multi-user interactions.

### 🧩 Tasks Breakdown
1.  **Remove Globals:** In `Main.py`, remove the global declarations of `conversation_history` and `USERPROFILE`.
2.  **Update Function Signatures:** Modify `AnswerQes` in `Main.py` to accept `history` and `profile` as arguments: `def AnswerQes(query: str, history: list, profile: dict)`. Ensure it returns the response text, updated history, and updated profile.
3.  **Implement Session Manager:** In `api.py`, create a simple in-memory session store (e.g., a dictionary) or integrate Redis.
4.  **Update Endpoints:** In `api.py`, modify `/chat/query` and other endpoints to retrieve session data before calling `AnswerQes`, and save the updated data afterward.
5.  **Change Async to Sync:** In `api.py`, change `async def chat_query` to `def chat_query` (and similarly for other blocking endpoints) to utilize FastAPI's thread pool.
6.  **Fix CORS:** Add a check in `api.py` to raise an error or override if `ALLOW_ALL_ORIGINS=True` is combined with `allow_credentials=True`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
*   **File: `Main.py`**
    *   Delete `conversation_history: list = []` and `USERPROFILE = {}`.
    *   Update `AnswerQes(query: str)` to `AnswerQes(query: str, session_history: list, session_profile: dict)`.
    *   Remove `global USERPROFILE` and `global conversation_history` declarations.
    *   Return a tuple: `(final_answer_content, session_history, session_profile)`.
*   **File: `api.py`**
    *   Add a dependency or middleware to extract a session identifier (e.g., user ID or session cookie).
    *   Change `async def chat_query...` to `def chat_query...`.
    *   In `chat_query`, fetch the state, call `Main.AnswerQes`, update the state, and return the response.

### ⏱ Time Estimate
*   1 - 2 Days

### 📈 Expected Outcome
*   0 instances of user data cross-contamination under concurrent load.
*   Significant reduction in endpoint timeouts during simultaneous requests.

---

# 🤖 Execution Prompts Generator

### SYSTEM PROMPT
You are a senior backend engineer specializing in FastAPI, Python, and scalable web architectures.

### TASK PROMPT
Refactor the provided `Main.py` and `api.py` to remove global state variables and fix event-loop blocking issues.

### CONTEXT
The current implementation of Zenith AI uses global variables (`conversation_history` and `USERPROFILE`) in `Main.py` to store state, which causes data leakage between concurrent requests. Additionally, FastAPI endpoints in `api.py` are defined as `async def` but execute synchronous blocking operations (LangChain LLM calls), starving the event loop.

### OUTPUT FORMAT
Provide the refactored code for `Main.py` and `api.py`.
* Ensure `Main.py` is entirely stateless. State must be passed into its functions.
* Ensure synchronous endpoints in `api.py` are defined with `def` instead of `async def`.
* Include a simple, temporary in-memory session management system in `api.py` to handle the state.
* Ensure no global variables are used for user state.