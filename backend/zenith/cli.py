"""Chat with Zenith in the terminal:  python -m zenith.cli"""

from __future__ import annotations

import uuid

from .agent import build_agent


def main() -> None:
    agent = build_agent()
    session = uuid.uuid4().hex
    print("Zenith (Zoe). Type 'exit' to quit. Not a substitute for professional care.\n")
    while True:
        try:
            message = input("you  > ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if message.lower() in {"exit", "quit"}:
            break
        if not message:
            continue
        reply = agent.answer(session, message)
        print(f"\nzoe  > {reply.text}\n")
        if reply.sources:
            names = ", ".join(sorted({str(s["source"]) for s in reply.sources}))
            print(f"       sources: {names}\n")


if __name__ == "__main__":
    main()
