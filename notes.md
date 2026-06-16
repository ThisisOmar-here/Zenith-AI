# 📝 Observation Engine
* **Raw Observation:** The application uses global variables (`conversation_history` and `USERPROFILE`) in `Main.py` to manage user state across sessions.
* **Context:** In `Main.py` where `AnswerQes` interacts with the LLM, reads from `USERPROFILE`, and appends to `conversation_history`.
* **Frequency:** Frequent (occurs on every single chat request).
* **Severity:** High (causes state leakage across multiple concurrent user requests, exposing sensitive user data and breaking context).

# 🔍 Insight Engine
* **What is happening?** All concurrent requests share the exact same `conversation_history` and `USERPROFILE` global lists/dicts in the memory of the FastAPI application.
* **Why is it happening?** The system currently lacks session management or request-scoped user state, relying on module-level globals as a shortcut for state management.
* **What does it imply?** In a production environment serving multiple users, User A's history and profile will leak into User B's session. This creates corrupted conversational context, severe privacy breaches, and incorrect AI responses for everyone.

# 🔗 Idea Generator
* **Idea:** Implement a stateless architecture or request-scoped session management where context is retrieved and updated per user.
* **Type:** System Optimization / Architecture Transformation
* **Leverage:** High scale—eliminates a critical bottleneck that prevents the application from serving more than one user at a time safely.

# 💡 Breakthrough Idea System
### 💡 Title
Stateless Context & Session Management Architecture

### 🔍 Problem
Global variables in `Main.py` (`conversation_history`, `USERPROFILE`) cause user state to leak across concurrent requests, making the app unscalable and violating data privacy.

### 🧠 Insight
By making the API stateless and relying on database-backed sessions mapped by a session ID (or passing context directly from the frontend), we can completely eliminate dangerous module-level state.

### 🔗 Connected Dots
Combining a stateless FastAPI architecture with a scalable key-value store (like Redis) or proper database integration allows safe, concurrent multi-tenant usage without sacrificing the rich personalized context of `USERPROFILE`.

### 🚀 Proposed Change
Remove all global state variables from `Main.py`. Pass a `session_id` or `user_id` in the API payload, and load/save the specific user's conversation history and profile from a persistent store per request.

### 📊 Impact
Enables horizontal scaling and multi-user concurrency without data leakage. Solves the most critical technical debt and eliminates severe privacy risks.

### ⚙️ Implementation (Suggestion Only)
1. Add a `session_id` string to the `ChatRequest` model in `api.py`.
2. Refactor `Main.AnswerQes` to accept the `session_id` and load/save history to a persistent store (e.g., Redis or a dedicated database table) instead of appending to a global list.
3. Refactor `USERPROFILE` to be fetched dynamically per user based on the session identifier rather than stored globally.

### ⚠️ Trade-offs
Increases network latency slightly due to fetching state from a database/cache on every request. Requires changes to the frontend client to maintain and pass session IDs.

# 📊 Scoring System
* **Impact:** 10 (Critical for multi-user functionality and privacy)
* **Feasibility:** 8 (Standard web architecture practice, moderate refactoring required)
* **Leverage:** 9 (Unblocks true scalability and concurrent users)
* **Novelty:** 4 (Standard industry practice, not functionally novel but necessary)
* **Scalability:** 10 (Fundamental requirement for horizontal scaling)

**Final Score Calculation:**
Final Score = (10 × 0.30) + (9 × 0.25) + (10 × 0.20) + (4 × 0.15) + (8 × 0.10)
Final Score = 3.0 + 2.25 + 2.0 + 0.60 + 0.80 = **8.65**

# 🧭 Prioritization Engine
* **Priority Bucket:** 🔥 Now (Score: 8.65)
* **Reasoning:** The score exceeds the 8.5 threshold for immediate recommendation. Fixing global state leakage is critical for basic correct functioning in any multi-user environment and must be addressed before further growth.

# ⚙️ Execution Planner (Suggestion Mode Only)
### 🎯 Objective
Eliminate global state leakage by implementing request-scoped user state and session management.

### 🧩 Tasks Breakdown
1. Update API models in `api.py` to accept a session identifier.
2. Replace the global `conversation_history` list with session-based data store retrieval.
3. Replace the global `USERPROFILE` dictionary with a user-specific lookup based on the session identifier.
4. Update `Main.AnswerQes` and related functions to require and use the localized session state instead of globals.

### 🧑‍💻 Code-Level Changes (Descriptive Only)
* **`api.py`**: Modify `ChatRequest` Pydantic model to include an optional `session_id`. Update the `chat_query` endpoint to pass it to `Main.py`.
* **`Main.py`**: Delete `conversation_history` and `USERPROFILE` global declarations. Update the `AnswerQes` signature and logic to fetch and save state locally within the function execution scope using a session store manager.
* **Storage**: Integrate a basic caching layer (e.g., Redis) or segment the existing `user_profile.json` system to maintain state reliably keyed by user between requests.

### ⏱ Time Estimate
2 Days

### 📈 Expected Outcome
Zero state leakage between concurrent requests. 100% isolation of user context, enabling safe multi-tenant capability and paving the way for horizontal scaling.

# 🤖 Execution Prompts Generator
### SYSTEM PROMPT
You are a senior backend software engineer specializing in FastAPI, stateless system design, and scalable AI applications.

### TASK PROMPT
Refactor the global state variables in `Main.py` (`conversation_history` and `USERPROFILE`) into a request-scoped session model using a unique `session_id` passed from the frontend.

### CONTEXT
Currently, the application stores user history and profile data in module-level global variables in `Main.py`. This causes severe state leakage when multiple users hit the FastAPI `/chat/query` endpoint concurrently, mixing their data. We need to isolate state perfectly per user session without breaking existing retrieval capabilities.

### OUTPUT FORMAT
* Code for updated `api.py` Pydantic models and endpoints.
* Code for refactored `Main.py` functions, eliminating globals.
* Explanation of the state persistence strategy (e.g., Redis implementation).
* Integration steps for the frontend client.

# 🔁 Feedback Loop
* **Evaluate:** Does the application still leak history when two distinct users send requests simultaneously? Monitor multi-tenant test cases to ensure strict state isolation.
* **Store:** Results and performance metrics will be logged here upon completion.
* **Refine:** If database retrieval latency is too high during high concurrent load, consider implementing an in-memory distributed caching tier like Redis.
