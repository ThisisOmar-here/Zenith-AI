# Knowledge base

Zenith grounds its advice in documents you index here. Each folder is a retrieval category, and its name must match one of the categories in `backend/zenith/retrieval.py`.

The notes in these folders are short, original summaries of widely taught techniques, included so the app works out of the box. Replace or extend them with material you have the right to use: your own notes, public-domain texts, or openly licensed resources. Do not commit copyrighted books.

Index everything with:

```bash
cd backend
python -m zenith.ingest ../knowledge
```

Supported formats: `.pdf`, `.md`, `.txt`. Re-running the command updates existing chunks instead of duplicating them.
