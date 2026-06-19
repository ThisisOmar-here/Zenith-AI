# Observation Engine
## Raw Observation
- `api.py` exposes synchronous LLM QA endpoints but uses `async def`.
- `_merge_assessment_into_profile` restricts feelings to 10 items but doesn't implement a proper FIFO (drops latest).
- Global variables (`conversation_history`, `USERPROFILE`) in `Main.py` manage state.
- Dependencies listed in `Readme.md` aren't properly installed in the environment (FastAPI, Langchain etc).

## Context
- Found in `api.py`, `Main.py`
- Found via memory

## Frequency
- Frequent

## Severity
- High (Event loop starvation, architectural state leakage)

# Insight Engine
## What is happening?
FastAPI `async def` endpoints are running synchronous blocking logic. Global state is used across requests.
## Why is it happening?
Initial prototyping without proper scaling architecture for concurrency or state management.
## What does it imply?
The application is highly susceptible to concurrent request failures, state bleed across different users (making it insecure and unpredictable), and poor performance due to event loop blocking.

# Idea Generator
## System Optimization
Refactor the FastAPI API to use proper threading for synchronous IO operations and encapsulate user state within request-scoped contexts or sessions.

# Breakthrough Idea System
## 💡 Title
Thread-Safe and Asynchronous Architecture Upgrade

## 🔍 Problem
The current application suffers from event loop starvation and architectural state leakage due to blocking operations in `async def` endpoints and reliance on global state variables for user sessions.

## 🧠 Insight
By wrapping blocking calls in thread pools and redesigning state management, we can unlock horizontal scalability and concurrent reliability.

## 🔗 Connected Dots
`async def` endpoints + blocking I/O = Event Loop Starvation.
Global variables (`Main.USERPROFILE`) + Multiple Requests = State Leakage.

## 🚀 Proposed Change
Migrate blocking calls (e.g., `Main.AnswerQes` and `UserProfileModule.load_user_profile`) to `asyncio.to_thread` or redefine endpoints as standard `def`. Transition from global variables to request-scoped dependency injection for user profiles and chat history.

## 📊 Impact
Improved concurrent handling capacity (10x), reduced response latency, and secure/isolated user sessions.

## ⚙️ Implementation (Suggestion Only)
- Change `chat_query` to use `await asyncio.to_thread(Main.AnswerQes, ...)` or change to `def`.
- Remove global `conversation_history` from `Main.py` and implement session/database backed memory.
- Fix the `_merge_assessment_into_profile` logic to correctly manage `feelings` queue limit.

## ⚠️ Trade-offs
Will require significant refactoring of `Main.py` and how testing handles state.

# Scoring System
- Impact: 9
- Feasibility: 7
- Leverage: 8
- Novelty: 5
- Scalability: 10

Final Score = (9 * 0.3) + (8 * 0.25) + (10 * 0.20) + (5 * 0.15) + (7 * 0.10) = 2.7 + 2.0 + 2.0 + 0.75 + 0.70 = 8.15

# Prioritization Engine
- Priority: Next (High Priority, moderate effort)

# Execution Planner
## 🎯 Objective
Eliminate event loop starvation in endpoints and improve state management logic.

## 🧩 Tasks Breakdown
- Refactor `api.py` to wrap synchronous calls.
- Address state leakage in `Main.py`.

## 🧑‍💻 Code-Level Changes (Descriptive Only)
- `api.py`: Use `asyncio.to_thread` for LLM and file I/O operations.
- `Main.py`: Refactor globals into class or context-based state.

## ⏱ Time Estimate
1-2 days.

## 📈 Expected Outcome
System can handle 10x more concurrent users without starvation.

# Execution Prompts Generator
## SYSTEM PROMPT
You are a senior backend Python developer specializing in FastAPI and concurrent architectures.
## TASK PROMPT
Refactor `api.py` and `Main.py` to resolve event loop starvation by offloading blocking operations to thread pools, and remove global state variables to prevent data leakage.
## CONTEXT
The current codebase uses `async def` endpoints with synchronous LangChain calls and file I/O, alongside global variables for chat history.
## OUTPUT FORMAT
Provide the refactored code for `api.py` and `Main.py` with explanations of the threading and state-management changes.

# Feedback Loop
- Evaluate: Check performance under load test (e.g., Locust).
- Store: Log results in `notes.md`.
- Refine: Adjust threading limits or state management based on test results.
