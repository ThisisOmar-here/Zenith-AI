// Tracks which wellness activities were opened, per day, in this browser only.

const KEY = 'zenith-activity-log';

type Log = Record<string, string[]>; // YYYY-MM-DD -> activity ids opened that day

const day = (d: Date) => d.toISOString().slice(0, 10);

function read(): Log {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function recordActivity(id: string): void {
  try {
    const log = read();
    const today = day(new Date());
    log[today] = [...(log[today] ?? []), id];
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* storage unavailable: stats simply stay at zero */
  }
}

export function activityStats(): { today: number; distinct: number; streak: number } {
  const log = read();
  const today = log[day(new Date())]?.length ?? 0;
  const distinct = new Set(Object.values(log).flat()).size;
  let streak = 0;
  const cursor = new Date();
  while (log[day(cursor)]?.length) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { today, distinct, streak };
}
