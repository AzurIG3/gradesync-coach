/**
 * Lightweight mastery tracker.
 *
 * Counts how many times a student answered each topic / question-type
 * correctly, and exposes the weakest topics so quiz rerolls can be biased
 * towards material that still needs work.
 *
 * Everything lives in localStorage — no backend, no extra AI calls.
 */

const KEY = "sophia.mastery.v1";

export type MasteryRow = { correct: number; total: number };
export type MasteryMap = Record<string, MasteryRow>;
type Store = Record<string, MasteryMap>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage full — mastery just stops updating */
  }
}

/** A single answered question: which topic it belonged to and whether it was right. */
export type MasteryEntry = { topic: string; correct: boolean };

export function recordResults(scope: string, entries: MasteryEntry[]): void {
  if (!entries.length) return;
  const store = read();
  const map: MasteryMap = { ...(store[scope] ?? {}) };
  for (const e of entries) {
    const topic = e.topic.trim() || "General";
    const row = map[topic] ?? { correct: 0, total: 0 };
    map[topic] = { correct: row.correct + (e.correct ? 1 : 0), total: row.total + 1 };
  }
  store[scope] = map;
  write(store);
}

export function getMastery(scope: string): MasteryMap {
  return read()[scope] ?? {};
}

export function clearMastery(scope: string): void {
  const store = read();
  delete store[scope];
  write(store);
}

export type MasteryStat = { topic: string; correct: number; total: number; pct: number };

export function masteryStats(scope: string): MasteryStat[] {
  return Object.entries(getMastery(scope))
    .map(([topic, r]) => ({
      topic,
      correct: r.correct,
      total: r.total,
      pct: r.total ? r.correct / r.total : 0,
    }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total);
}

/**
 * Topics the student is weakest at — used to tell the model where to spend
 * more questions on the next generation.
 */
export function weakTopics(scope: string, limit = 6): string[] {
  return masteryStats(scope)
    .filter((s) => s.total > 0 && s.pct < 0.8)
    .slice(0, limit)
    .map((s) => s.topic);
}

/** Topics already answered well — the model should not over-test these. */
export function strongTopics(scope: string, limit = 6): string[] {
  return masteryStats(scope)
    .filter((s) => s.total >= 2 && s.pct >= 0.8)
    .slice(-limit)
    .map((s) => s.topic);
}

/** Every scope that has recorded answers. */
export function masteryScopes(): string[] {
  return Object.keys(read());
}

/**
 * Every topic the student has answered, merged across all quizzes and tests,
 * weakest first. Used by the Mastery screen.
 */
export function allMasteryStats(): MasteryStat[] {
  const merged: MasteryMap = {};
  const store = read();
  for (const map of Object.values(store)) {
    for (const [topic, row] of Object.entries(map ?? {})) {
      const prev = merged[topic] ?? { correct: 0, total: 0 };
      merged[topic] = {
        correct: prev.correct + (row?.correct ?? 0),
        total: prev.total + (row?.total ?? 0),
      };
    }
  }
  return Object.entries(merged)
    .map(([topic, r]) => ({
      topic,
      correct: r.correct,
      total: r.total,
      pct: r.total ? r.correct / r.total : 0,
    }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total);
}

/** Wipes all recorded mastery (used by the "Reset" action on the Mastery screen). */
export function clearAllMastery(): void {
  write({});
}

