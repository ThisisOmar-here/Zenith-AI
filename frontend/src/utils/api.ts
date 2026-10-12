// Client for the Zenith FastAPI backend.
// In development, Vite proxies /api to http://localhost:8000 (see vite.config.ts).
// Set VITE_API_URL to point a deployed frontend at a deployed backend.

export interface Source {
  source: string | null;
  page?: number | string | null;
  category?: string | null;
}

export interface ChatReply {
  session_id: string;
  reply: string;
  mode: 'direct' | 'grounded' | 'crisis' | 'demo';
  category?: string | null;
  sources: Source[];
}

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export async function sendChat(message: string, sessionId?: string, signal?: AbortSignal): Promise<ChatReply> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
    signal,
  });
  if (!res.ok) throw new Error(`Zenith API returned ${res.status}`);
  return res.json();
}

export async function resetSession(sessionId: string): Promise<void> {
  try {
    await fetch(`${API_URL}/api/session/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  } catch {
    /* the backend may be offline in demo mode */
  }
}

// ---------- demo mode ----------
// Used only when no backend is reachable (for example the static preview).
// Every demo reply is labelled in the UI so it is never mistaken for the real model.

const CRISIS = [/kill(ing)? my ?self/i, /suicid/i, /end (my|it all)/i, /want to die/i, /self[- ]?harm/i, /hurt my ?self/i, /انتحار|اموت|أموت/];

const DEMO_REPLIES: Array<[RegExp, string]> = [
  [/sleep|insomnia|night/i, "Your brain is treating bedtime like a board meeting 😤\n\nOne thing that helps: a two-minute brain-dump on paper before bed, so your mind knows the thoughts are saved.\n\nWhat does your last hour before bed usually look like?"],
  [/procrastinat|lazy|motivat|focus|study/i, "Procrastination is usually your brain picking comfort over effort, not a character flaw.\n\nTry this: set a five-minute timer and commit only to starting. Momentum tends to carry you once you move.\n\nWhat's the task you've been avoiding the hardest?"],
  [/anx|stress|panic|overwhelm|worr/i, "That sounds like a lot to carry 💙\n\nA quick reset you can do anywhere: name 5 things you see, 4 you hear, 3 you can touch. It pulls your attention back to the room.\n\nWhat tends to set it off most often?"],
  [/lonely|alone|friend/i, "Feeling alone can be really heavy.\n\nOne small step: send one low-pressure message today, even just \"saw this and thought of you\".\n\nWho is someone you've lost touch with but still think about?"],
];

export function demoReply(message: string, sessionId?: string): ChatReply {
  const id = sessionId ?? `demo-${Math.random().toString(36).slice(2, 10)}`;
  if (CRISIS.some((p) => p.test(message))) {
    return {
      session_id: id,
      mode: 'crisis',
      sources: [],
      reply:
        "I'm really glad you told me, and I'm taking it seriously. You deserve support from a real person right now.\n\nIf you might act on these thoughts or you're in danger, please call your local emergency number now.\n\nYou can also talk to a trained listener for free and in confidence: find a crisis line in your country at findahelpline.com.",
    };
  }
  const hit = DEMO_REPLIES.find(([pattern]) => pattern.test(message));
  return {
    session_id: id,
    mode: 'demo',
    sources: [],
    reply:
      hit?.[1] ??
      "Thanks for sharing that with me.\n\nTell me a bit more: is this something you want to talk through, or are you looking for a practical next step?",
  };
}
