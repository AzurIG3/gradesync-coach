/**
 * Study session history.
 *
 * Records completed focus sessions and completed daily tasks so the Progress
 * screen can draw a calendar heatmap of real study activity. localStorage only.
 */

const KEY = "sophia.sessions.v1";

export type SessionKind = "focus" | "task";
export interface SessionEntry {
  /** ISO date (YYYY-MM-DD) in local time. */
  date: string;
  kind: SessionKind;
  /** Minutes of focus for "focus" entries; 0 for tasks. */
  minutes: number;
  at: string;
}

function read(): SessionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SessionEntry[]) : [];
  } catch {
    return [];
  }
}

function write(rows: SessionEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    // Keep roughly a year of history.
    window.localStorage.setItem(KEY, JSON.stringify(rows.slice(-2000)));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();
export function subscribeSessions(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function logSession(kind: SessionKind, minutes = 0): void {
  const rows = read();
  rows.push({ date: localDateISO(), kind, minutes: Math.max(0, Math.round(minutes)), at: new Date().toISOString() });
  write(rows);
}

export function getSessions(): SessionEntry[] {
  return read();
}

export function clearSessions(): void {
  write([]);
}

export type DayActivity = {
  date: string;
  focusMinutes: number;
  focusSessions: number;
  tasks: number;
  /** 0-4 intensity used by the heatmap. */
  level: 0 | 1 | 2 | 3 | 4;
};

function intensity(focusMinutes: number, tasks: number): 0 | 1 | 2 | 3 | 4 {
  const score = focusMinutes + tasks * 15;
  if (score <= 0) return 0;
  if (score < 25) return 1;
  if (score < 60) return 2;
  if (score < 120) return 3;
  return 4;
}

/** Activity for the last `days` days, oldest first. */
export function activityByDay(days = 182): DayActivity[] {
  const rows = read();
  const byDate = new Map<string, { focusMinutes: number; focusSessions: number; tasks: number }>();
  for (const r of rows) {
    const cur = byDate.get(r.date) ?? { focusMinutes: 0, focusSessions: 0, tasks: 0 };
    if (r.kind === "focus") {
      cur.focusMinutes += r.minutes;
      cur.focusSessions += 1;
    } else {
      cur.tasks += 1;
    }
    byDate.set(r.date, cur);
  }

  const out: DayActivity[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = localDateISO(d);
    const v = byDate.get(date) ?? { focusMinutes: 0, focusSessions: 0, tasks: 0 };
    out.push({ date, ...v, level: intensity(v.focusMinutes, v.tasks) });
  }
  return out;
}

export function sessionTotals(): {
  focusMinutes: number;
  focusSessions: number;
  tasks: number;
  activeDays: number;
} {
  const rows = read();
  const dates = new Set(rows.map((r) => r.date));
  return {
    focusMinutes: rows.filter((r) => r.kind === "focus").reduce((s, r) => s + r.minutes, 0),
    focusSessions: rows.filter((r) => r.kind === "focus").length,
    tasks: rows.filter((r) => r.kind === "task").length,
    activeDays: dates.size,
  };
}
