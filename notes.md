# Observation Engine
- Raw Observation: The `chat_query` and `submit_assessment` endpoints in `api.py` are defined as `async def` but execute fully synchronous, blocking operations like `Main.AnswerQes()`, `Main.run_retrieval_pipeline()`, and `UserProfileModule.load_user_profile()`.
- Context: FastAPI / Uvicorn routing system executing requests on the main event loop thread.
- Frequency: Frequent (occurs on every single chat and assessment request).
- Severity: High (causes severe event loop starvation; concurrent requests cannot be processed while a single chat query is waiting for the LLM response).

# Insight Engine
- What is happening?: FastAPI runs `async def` endpoints on the main event loop. Because the internal logic (LangChain LLM calls, file I/O) is purely synchronous, the main event loop is blocked.
- Why is it happening?: The developer assumed `async def` would make the endpoint concurrent. However, in FastAPI, if an endpoint uses `async def` but runs blocking synchronous code without offloading it, it blocks the entire server.
- What does it imply?: The application cannot scale beyond a single active user. If 5 users query the AI simultaneously, they will be queued serially. This is a massive architectural bottleneck for the 'SaaS Builder' trying to scale this product.

# Idea Generator
- Feature Expansion: No
- System Optimization: Yes
- Solve a real limitation: Resolves the critical inability to handle concurrent users due to event loop starvation.
- Introduce leverage: Instantly enables vertical scaling and multi-user concurrency without refactoring the massive, synchronous LangChain codebase.
- Logic: FastAPI has an internal thread pool designed specifically for synchronous endpoints. By simply dropping the `async` keyword, FastAPI will automatically route these heavy, blocking calls to worker threads, freeing the main event loop to accept and route new connections.

# Breakthrough Idea System
## 💡 Title
Unblock the Event Loop for Scalable Concurrency

## 🔍 Problem
The AI application fails to handle multiple concurrent users. Long-running AI generation and retrieval operations completely freeze the FastAPI event loop because they are synchronous functions incorrectly placed inside `async def` endpoints.

## 🧠 Insight
We don't need a massive asynchronous rewrite to fix concurrency. FastAPI has built-in mechanisms to handle synchronous blocking code. By changing the endpoint definitions from `async def` to `def`, or by offloading the blocking calls to a thread pool via `asyncio.to_thread()`, we achieve multi-tenant concurrency instantly.

## 🔗 Connected Dots
`api.py` `async def` endpoints + synchronous LLM/file I/O in `Main.py` and `UserProfile.py` = Complete event loop starvation = Unscalable SaaS.

## 🚀 Proposed Change
Modify the critical endpoints in `api.py` (`chat_query`, `submit_assessment`, `get_history`, `get_user_profile`) to be standard synchronous `def` functions.

## 📊 Impact
- Eliminates event loop starvation entirely.
- Allows multiple users to interact with the AI companion concurrently.
- Significantly reduces P99 latency under load.

## ⚙️ Implementation (Suggestion Only)
1. Open `api.py`.
2. Locate `@app.post("/chat/query") async def chat_query(payload: ChatRequest):`.
3. Remove `async` so it becomes `@app.post("/chat/query") def chat_query(payload: ChatRequest):`.
4. Apply the same change to `/chat/history`, `/user/assessment`, and `/user/profile` endpoints.
5. (Optional but recommended) In `Main.py`, be careful with global state `conversation_history` and `USERPROFILE` which might leak across threads, though `def` solves the immediate blocking issue.

## ⚠️ Trade-offs
Using a thread pool increases memory consumption per concurrent request compared to true `asyncio`. It also exposes the application to race conditions if global variables (like `conversation_history` in `Main.py`) are modified concurrently by multiple users, requiring further state management isolation (e.g., passing session IDs).

# Scoring System
### 1. Impact
Score: 9 (Critical enabler for scaling beyond a single user)
### 2. Feasibility
Score: 10 (Requires removing a single keyword from 4 lines of code)
### 3. Leverage
Score: 9 (Massive outcome from extremely low effort)
### 4. Novelty
Score: 4 (Standard architectural best practice)
### 5. Scalability
Score: 8 (Unblocks concurrent scaling, though constrained by thread pool limits)

Final Score = (9 × 0.30) + (9 × 0.25) + (8 × 0.20) + (4 × 0.15) + (10 × 0.10)
Final Score = 2.70 + 2.25 + 1.60 + 0.60 + 1.00 = 8.15

# Prioritization Engine
Priority Bucket: ⚡ Next
Rationale: High score (8.15) + extremely fast execution. Essential for any SaaS deployment.

# Execution Planner (Suggestion Mode Only)
### 🎯 Objective
Eliminate event loop starvation to enable concurrent API request handling.

### 🧩 Tasks Breakdown
1. Identify all `async def` endpoints in `api.py` that perform synchronous operations.
2. Convert these endpoint definitions from `async def` to `def`.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
- File: `api.py`
- Change: Remove the `async` keyword from the `chat_query`, `get_history`, `submit_assessment`, and `get_user_profile` endpoint function definitions.

### ⏱ Time Estimate
15 minutes

### 📈 Expected Outcome
The application will successfully handle multiple concurrent requests without the server becoming completely unresponsive to new requests.

# Execution Prompts Generator
### SYSTEM PROMPT
You are a senior backend engineer specializing in FastAPI performance and concurrency optimization.

### TASK PROMPT
Refactor the FastAPI endpoints to prevent event loop starvation caused by synchronous blocking operations.

### CONTEXT
The application uses FastAPI. The endpoints `chat_query`, `get_history`, `submit_assessment`, and `get_user_profile` in `api.py` are currently defined as `async def`, but they wrap purely synchronous, blocking operations (like LangChain LLM generation and file I/O). This architectural flaw causes the entire event loop to block, preventing the application from handling concurrent requests.

### OUTPUT FORMAT
Provide the precise code changes required in `api.py` to change the endpoints to standard synchronous `def` functions, allowing FastAPI to execute them safely in its internal thread pool. Do not rewrite the LangChain logic.

# Feedback Loop
### Evaluate
- Pending execution. The change is expected to drastically improve throughput under multi-user load. We must watch out for global state bleed in `Main.py` across the new concurrent threads.
### Store
- Stored analysis and plan in `notes.md`.
### Refine
- If thread pool limitations occur under extreme load, a future iteration should involve refactoring `Main.py` to use LangChain's native async functions (`agenerate`, `ainvoke`).
