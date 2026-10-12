# Safety and privacy

Zenith is a well-being companion. It is not therapy, medical advice or an emergency service, and it says so in the interface.

## How crisis messages are handled

1. **Deterministic screen before any model call.** `backend/zenith/safety.py` checks every message against English and Arabic patterns for suicide, self-harm, harm to others and danger at home. A match skips the language model entirely and returns a fixed reply that points to local emergency services and [findahelpline.com](https://findahelpline.com), in the user's language.
2. **System prompt rules.** For anything the patterns miss, the prompt tells the model to stay brief, take it seriously, point to real help, and not to replace help with coping tips. It also bans diagnosing and medication advice.
3. **Visible in the UI.** Crisis replies are styled as support resources, and every chat screen shows a short note on what Zoe is and is not.

Pattern matching will miss some phrasings and flag some false positives. Both trade-offs are covered by tests in `backend/tests/test_safety.py`; extend them when you add patterns.

## Privacy

- No location lookup, IP collection or analytics.
- Conversations are held in memory per session on the server and are lost on restart. `DELETE /api/session/{id}` clears one.
- The optional user profile (`ZENITH_STORE_PROFILES`) is off by default and only records what the user stated.
- Assessment answers, gratitude entries and activity stats stay in the browser's local storage.

## Reporting a problem

If Zenith gives a harmful or unsafe reply, please open an issue with the message that caused it (remove anything personal).
