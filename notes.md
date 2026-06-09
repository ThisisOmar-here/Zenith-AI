# Observation Engine
- **Raw Observation**: Global variables `conversation_history` and `USERPROFILE` in `Main.py` are used to manage state across FastAPI requests.
- **Context**: `Main.py` (lines 232, 271) uses `global conversation_history`. `api.py` imports `Main.py` and calls `Main.AnswerQes` on endpoints, causing all requests to share this state.
- **Frequency**: Frequent (Occurs on every request to the LLM)
- **Severity**: High (State leakage between concurrent users, massive privacy risk, prevents horizontal scaling)

# Insight Engine
- **What is happening?**: User conversation history and profile data are stored in global variables inside the application's runtime memory.
- **Why is it happening?**: The backend was likely originally built as a single-user CLI or script and was later wrapped with FastAPI without refactoring the state management for concurrency.
- **What does it imply?**: If two users interact with the AI simultaneously, User B could see User A's conversation history, or User A's data gets saved to User B's profile. This completely breaks data isolation.

# Idea Generator
- **Idea Type**: System Optimization
- **Description**: Migrate state management from global variables to a session-based or user-scoped state manager.
- **Solve a real limitation**: Fixes critical cross-user data leakage.
- **Introduce leverage**: Unlocks the ability to safely deploy the application to multiple users and scale horizontally.
- **Explainable logically**: Moving state to request-scoped contexts prevents global mutation collisions.

# Breakthrough Idea System
## 💡 Title: Stateless Request Architecture (Session-based State Management)
## 🔍 Problem
Global variables (`conversation_history`, `USERPROFILE`) in `Main.py` leak data between users in the FastAPI app.
## 🧠 Insight
To scale beyond a single user, the application must completely decouple user state from application runtime memory.
## 🔗 Connected Dots
The global state makes it impossible to deploy multiple replicas. Moving state to a database or per-session cache enables both privacy and scalability.
## 🚀 Proposed Change
Refactor `Main.py` to accept session IDs and fetch/update `conversation_history` and `USERPROFILE` from a state store rather than using global variables.
## 📊 Impact
High (Resolves a critical privacy/security vulnerability, allows horizontal scaling).
## ⚙️ Implementation (Suggestion Only)
1. Pass `session_id` or `user_id` from `api.py` to `Main.AnswerQes`.
2. In `Main.py`, replace global variable usage with a state retrieval function `get_state(user_id)`.
3. Store state in a thread-safe dictionary keyed by `user_id`, or preferably an external store like Redis.
4. Pass state explicitly through function parameters.
## ⚠️ Trade-offs
Requires significant refactoring of function signatures in `Main.py`. Adds a dependency on a state store or increases memory overhead if using a dictionary.

# Scoring System
- **Impact**: 10 (Fixes data leak, essential for production)
- **Feasibility**: 7 (Requires tracing and refactoring multiple functions)
- **Leverage**: 9 (Unlocks scaling and multi-user support)
- **Novelty**: 2 (Standard software engineering practice)
- **Scalability**: 10 (Directly enables horizontal scaling)

Final Score = (10 × 0.30) + (9 × 0.25) + (10 × 0.20) + (2 × 0.15) + (7 × 0.10)
Final Score = 3.0 + 2.25 + 2.0 + 0.3 + 0.7 = 8.25

# Prioritization Engine
- **Priority**: ⚡ Next (High Priority - Score: 8.25)
- High score + moderate effort to refactor the state management.

# Execution Planner
## 🎯 Objective
Eliminate global state variables in `Main.py` to prevent cross-user data leakage.
## 🧩 Tasks Breakdown
1. Modify `api.py` to extract and pass a unique `user_id` to `Main.AnswerQes`.
2. Create a state manager in `Main.py` (e.g., a dictionary mapping `user_id` to state).
3. Refactor `Main.AnswerQes` and related functions to retrieve and update the state using `user_id`.
## 🧑‍💻 Code-Level Changes (Descriptive Only)
- `Main.py`: Remove `conversation_history = []` and `global conversation_history`. Add `STATE_STORE = {}`. Update `AnswerQes(query: str, user_id: str)`.
- `api.py`: Update the endpoint calling `Main.AnswerQes` to pass `user_id`.
## ⏱ Time Estimate
4-6 Hours
## 📈 Expected Outcome
Zero data leakage between concurrent user sessions.

# Execution Prompts Generator
### SYSTEM PROMPT
You are a senior Python backend engineer specializing in FastAPI and concurrent systems.
### TASK PROMPT
Refactor `Main.py` to remove the use of global variables (`conversation_history` and `USERPROFILE`) and replace them with a user-specific state management system.
### CONTEXT
The current implementation of `Main.py` uses global variables to store conversation history and user profile data. Since this is imported by `api.py` (FastAPI), concurrent requests mutate the same global state, causing data leakage between users.
### OUTPUT FORMAT
- Updated `Main.py` code
- Updated `api.py` code
- Brief explanation of the state management approach

# Feedback Loop
- **Evaluate**: Did it resolve state leakage across concurrent requests? Were there any performance regressions?
- **Store**: Results to be appended here in `notes.md` after implementation.
- **Refine**: If memory becomes an issue, migrate from an in-memory dictionary to Redis.
