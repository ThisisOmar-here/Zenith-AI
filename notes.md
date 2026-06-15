# Observation Engine
### Raw Observation
The application uses global variables (`conversation_history`, `USERPROFILE`) in `Main.py` for state management. Furthermore, the `chat_query` FastAPI endpoint in `api.py` is defined as `async def` but it synchronously calls `Main.AnswerQes` and `Main.run_retrieval_pipeline` which execute blocking synchronous LangChain `invoke` methods.
### Context
`Main.py` (state handling and LLM calls) and `api.py` (`chat_query` API endpoint).
### Frequency
Frequent (occurs on every API request).
### Severity
High (causes state leakage across concurrent users and event loop starvation).

# Insight Engine
### What is happening?
Concurrent requests are sharing the same global `conversation_history` and `USERPROFILE` lists/dicts, leading to cross-talk between different users. Additionally, blocking synchronous LLM operations within `async def` functions are pausing the entire FastAPI event loop.
### Why is it happening?
The architecture was built as a single-user script and later adapted to FastAPI without refactoring state management to be request-scoped or utilizing `asyncio.to_thread()` or `def` for endpoints to handle blocking I/O calls.
### What does it imply?
The product cannot scale beyond a single concurrent user without critical data privacy leaks and extreme latency, fundamentally breaking the SaaS model.

# Idea Generator
### Feature Expansion / System Optimization
Replace global state with request-scoped session management and wrap synchronous LangChain invocations with `asyncio.to_thread()`, or change the FastAPI endpoint to standard `def`. This solves the architectural risk and introduces scale leverage.

# Breakthrough Idea System
### Title
Stateless Scalable Asynchronous Architecture
### Problem
Global state leakage across concurrent requests and event loop starvation due to synchronous blocking LLM calls.
### Insight
Converting single-user stateful scripts to a stateless API requires isolating user context per request and offloading synchronous blocking tasks to thread pools to maintain high concurrency.
### Connected Dots
FastAPI dependency injection, robust session management, and `asyncio.to_thread()` can work together to completely decouple state from the application lifecycle and free the event loop.
### Proposed Change
Refactor `Main.py` to remove `global conversation_history` and `USERPROFILE`. Pass them as arguments injected per request. Wrap `LLM.invoke` calls in `asyncio.to_thread()`.
### Impact
Resolves P0 data privacy issues, scales concurrent request capacity from 1 to thousands, and reduces endpoint latency by eliminating event loop blocking.
### Implementation (Suggestion Only)
1. Remove global variables in `Main.py`.
2. Update functions to accept `history` and `profile` as parameters.
3. Update FastAPI endpoints in `api.py` to fetch state per user session, pass it to `Main.py` functions, and save it.
4. Wrap synchronous LangChain `invoke` operations with `await asyncio.to_thread()`.
### Trade-offs
Increases code complexity and requires a backing store (even if in-memory per-user or database) which may slightly increase single-request latency but drastically improves overall throughput.

# Scoring System
### Impact
10 (Critical for multi-user functionality and scalability).
### Feasibility
8 (Requires significant refactoring but uses standard FastAPI/asyncio features).
### Leverage
9 (Write once, unlocks infinite scaling).
### Novelty
5 (Standard best practice, not conceptually new).
### Scalability
10 (Unblocks infinite parallel requests).
### Final Score Calculation
Final Score = (10 × 0.30) + (9 × 0.25) + (10 × 0.20) + (5 × 0.15) + (8 × 0.10) = 8.8
### Score Interpretation
8.8 -> Breakthrough (Immediate recommendation)

# Prioritization Engine
### 🔥 Now
High score (8.8) + critical for baseline product viability.

# Execution Planner
### Objective
Eliminate global state leakage and resolve event loop starvation to enable multi-user concurrency.
### Tasks Breakdown
1. Identify all references to `global conversation_history` and `USERPROFILE` in `Main.py`.
2. Refactor these functions to accept `conversation_history` and `USERPROFILE` as parameters.
3. Modify FastAPI endpoints in `api.py` to manage state per user and pass it to `Main.py`.
4. Wrap all blocking LangChain `.invoke()` calls in `asyncio.to_thread()`.
### Code-Level Changes (Descriptive Only)
- `Main.py`: Remove lines `conversation_history = []`, `USERPROFILE = {}`. Add `history` and `profile` to signatures of functions. Wrap LLM calls in `asyncio.to_thread()`.
- `api.py`: Retrieve user-specific history and profile in route handlers before calling `Main.py` functions, and save back if modified.
### Time Estimate
2-3 Days
### Expected Outcome
0% data leakage between concurrent users and <5ms event loop blockage.

# Execution Prompts Generator
### SYSTEM PROMPT
You are a Senior Backend Engineer specializing in FastAPI, asyncio, and stateless scalable microservices.
### TASK PROMPT
Refactor the provided `Main.py` and `api.py` code to eliminate global state variables (`conversation_history` and `USERPROFILE`). Ensure all synchronous LangChain LLM calls are wrapped in `asyncio.to_thread()` to prevent event loop blocking.
### CONTEXT
The current AI companion app was ported to FastAPI but retains global variables for state, causing cross-talk between concurrent users. It also performs blocking LLM `.invoke()` calls inside `async def` endpoints. We need to isolate state per request and offload blocking I/O to thread pools.
### OUTPUT FORMAT
- Explanations of changes
- Refactored `Main.py` (code blocks)
- Refactored `api.py` (code blocks)

# Feedback Loop
### Evaluate
Did it improve concurrent user capacity? Are there any race conditions introduced?
### Store
Results will be logged in future Observation cycles.
### Refine
Depending on state size, we may need to introduce Redis instead of in-memory dictionaries for cross-worker scaling.
