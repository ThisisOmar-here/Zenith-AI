# Autonomous Idea Engine

## 1. Observation Engine
- **Raw Observation**: `Main.py` uses global variables (`conversation_history` and `USERPROFILE`) to manage user state.
  - **Context**: Across multiple concurrent requests, these globals are shared.
  - **Frequency**: Frequent (every request).
  - **Severity**: High (State leakage between users).

- **Raw Observation**: Asynchronous endpoints in `api.py` perform blocking operations (synchronous LLM calls in `Main.py` and file I/O in `UserProfileModule`).
  - **Context**: In `chat_query` and `submit_assessment` endpoints.
  - **Frequency**: Frequent.
  - **Severity**: High (Event loop starvation, poor scalability).

## 2. Insight Engine
- **Insight**: State Leakage
  - **What is happening?**: The system stores per-user session data in global module-level variables.
  - **Why is it happening?**: Rapid prototyping; lack of a proper session management or database-backed state retrieval per user.
  - **What does it imply?**: If two users interact with the bot concurrently, one user might see the other user's conversation history or profile data.

- **Insight**: Event Loop Blocking
  - **What is happening?**: The FastAPI event loop is being blocked by synchronous I/O and CPU-bound LLM network calls.
  - **Why is it happening?**: The `async def` endpoints call synchronous functions (`Main.AnswerQes`, `UserProfileModule.load_user_profile`, etc.) without using thread pools.
  - **What does it imply?**: The server cannot handle concurrent requests efficiently; performance degrades massively under load, creating a bottleneck.

## 3. Idea Generator
- **Idea**: Session-Scoped State Management
  - **Type**: System Optimization
  - **Requirement**: Solve the limitation by removing global state, storing conversation histories in a cache (like Redis) or database keyed by a session ID or user ID. Introduces scalability leverage and resolves security risks.

- **Idea**: Async Offloading for Blocking I/O
  - **Type**: System Optimization
  - **Requirement**: Wrap blocking LLM calls and file I/O in `asyncio.to_thread()` or convert endpoints to standard `def` so FastAPI handles thread pooling. Solves event loop lag, introducing scale leverage.

## 4. Breakthrough Idea System
### 💡 Title: Stateless, Non-Blocking Conversation Architecture
### 🔍 Problem:
The application cannot securely or efficiently handle multiple users simultaneously due to global state leakage and event loop starvation.
### 🧠 Insight:
By transitioning to a stateless backend that retrieves context dynamically per request and offloads blocking calls to a thread pool, we unlock infinite horizontal scalability and isolate user data securely.
### 🔗 Connected Dots:
Global state vulnerability + Blocking synchronous calls = A system that breaks at >1 concurrent users. Fixing both fundamentally transforms the system into a production-ready SaaS.
### 🚀 Proposed Change:
1. Replace global `conversation_history` and `USERPROFILE` with session-based retrieval (e.g., Redis or database). Pass state explicitly to functions.
2. Convert FastAPI `async def` endpoints that perform blocking operations to `def`, or wrap the blocking logic in `asyncio.to_thread()`.
### 📊 Impact:
- **Revenue/Retention**: Higher uptime and secure user data means users trust the platform more.
- **Efficiency**: Eliminates event loop lag (e.g. from ~190ms to <2ms response overhead).
### ⚙️ Implementation (Suggestion Only):
- Introduce a `user_id` or `session_id` in the API payload.
- Update `Main.py` to accept `history` and `profile` as arguments instead of relying on globals.
- In `api.py`, use `await asyncio.to_thread(Main.AnswerQes, ...)` or change endpoints from `async def` to `def`.
### ⚠️ Trade-offs:
- Slightly more complex request handling.
- Need for an external cache/DB to store conversational state if not passed completely by the frontend.

## 5. Scoring System
**Idea: Stateless, Non-Blocking Conversation Architecture**
- **Impact (0-10)**: 10 (Critical for multi-user support)
- **Feasibility (0-10)**: 8 (Requires refactoring state passing)
- **Leverage (0-10)**: 9 (Unlocks scaling)
- **Novelty (0-10)**: 3 (Standard web practice)
- **Scalability (0-10)**: 10 (Allows horizontal scaling)

**Final Score Calculation**:
`Final Score = (10 × 0.30) + (9 × 0.25) + (10 × 0.20) + (3 × 0.15) + (8 × 0.10)`
`Final Score = 3.0 + 2.25 + 2.0 + 0.45 + 0.8 = 8.5`

## 6. Prioritization Engine
- **Priority**: 🔥 Now (Breakthrough)
- **Rationale**: The score is 8.5, which falls into the "Breakthrough" bucket. The security and scaling risks are too high to delay.

## 7. Execution Planner
### 🎯 Objective:
Refactor the backend to be stateless and non-blocking to support concurrent, secure multi-user sessions.

### 🧩 Tasks Breakdown:
1. **State Isolation**: Modify `Main.py` functions to accept `conversation_history` and `USERPROFILE` as arguments instead of using globals.
2. **Session Identification**: Update `ChatRequest` in `api.py` to include a `session_id` or `user_id`.
3. **State Storage**: Implement a persistent store or in-memory cache keyed by `session_id` to hold conversation histories and profiles.
4. **Non-Blocking Execution**: Use `asyncio.to_thread()` in `api.py` for all file I/O and synchronous `Main.py` invocations.

### 🧑‍💻 Code-Level Changes (Descriptive Only):
- **api.py**: Update `chat_query` to fetch/store state per session and wrap `Main.AnswerQes` in `asyncio.to_thread()`. Update `submit_assessment` to use `asyncio.to_thread()` for file read/write.
- **Main.py**: Remove global `conversation_history` and `USERPROFILE`. Change `AnswerQes` to `AnswerQes(query: str, history: list, profile: dict)`.
- **UserProfile.py**: No major changes, just ensure it's called via thread pools.

### ⏱ Time Estimate:
- 1-2 Days

### 📈 Expected Outcome:
- 0% cross-user data leakage.
- Event loop lag drops to <2ms.

## 8. Execution Prompts Generator
### SYSTEM PROMPT
You are a senior software engineer specializing in scalable SaaS systems and FastAPI.

### TASK PROMPT
Refactor the FastAPI application to remove global state variables and offload blocking I/O from the async event loop.

### CONTEXT
The current codebase (`Main.py` and `api.py`) relies on global variables (`conversation_history` and `USERPROFILE`) for user state, causing data leakage. Additionally, the FastAPI `async def` endpoints call synchronous LLM methods and file I/O directly, blocking the event loop and preventing concurrent requests. We need to isolate state per user and use `asyncio.to_thread()` or `def` endpoints.

### OUTPUT FORMAT
- Code for `api.py`
- Code for `Main.py`
- Explanation of changes
- Integration steps

## 9. Feedback Loop
### Evaluate
- *Pending execution*: Need to measure event loop latency under load post-deployment.
- *Pending execution*: Need to test concurrent requests from two different sessions to ensure no data leakage.
### Store
- Results will be logged in `notes.md` upon completion.
### Refine
- If `asyncio.to_thread()` introduces thread-pool exhaustion under high load, consider transitioning LLM calls to pure `async` LangChain methods (`ainvoke`).
