/**
 * Very small spaced-repetition scheduler for flashcards (Leitner boxes).
 *
 * Cards the student marks "Didn't know" drop to box 0 and come back first;
 * cards they keep getting right move up a box and are shown less often.
 * Everything is keyed by deck + question text and stored in localStorage.
 */

import type { Flashcard } from "./notes-parse";

const KEY = "sophia.srs.v1";

export interface CardStat {
  box: number; // 0 = hardest / due first, 4 = well known
  right: number;
  wrong: number;
  lastSeen: number;
  dueAt: number;
}

type Store = Record<string, Record<string, CardStat>>;

const INTERVAL_MS = [0, 10 * 60_000, 60 * 60_000, 24 * 3_600_000, 4 * 24 * 3_600_000];

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(s: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function cardKey(c: Flashcard): string {
  return c.q.trim().toLowerCase().slice(0, 120);
}

export function getDeckStats(deck: string): Record<string, CardStat> {
  return read()[deck] ?? {};
}

export function statFor(deck: string, card: Flashcard): CardStat | undefined {
  return getDeckStats(deck)[cardKey(card)];
}

export function recordCard(deck: string, card: Flashcard, knew: boolean): void {
  const store = read();
  const map = { ...(store[deck] ?? {}) };
  const k = cardKey(card);
  const prev: CardStat = map[k] ?? { box: 0, right: 0, wrong: 0, lastSeen: 0, dueAt: 0 };
  const box = knew ? Math.min(4, prev.box + 1) : 0;
  map[k] = {
    box,
    right: prev.right + (knew ? 1 : 0),
    wrong: prev.wrong + (knew ? 0 : 1),
    lastSeen: Date.now(),
    dueAt: Date.now() + INTERVAL_MS[box],
  };
  store[deck] = map;
  write(store);
}

/**
 * Orders a deck for review: due + frequently-wrong cards first, well-known
 * cards last. Stable for cards with no history (they keep their original order).
 */
export function scheduleDeck(deck: string, cards: Flashcard[]): Flashcard[] {
  const stats = getDeckStats(deck);
  const now = Date.now();
  return cards
    .map((c, i) => {
      const s = stats[cardKey(c)];
      // Lower priority number = shown earlier.
      let priority: number;
      if (!s) priority = 1; // fresh cards come right after overdue ones
      else if (s.dueAt <= now) priority = -1 + s.box * 0.1 - s.wrong * 0.05;
      else priority = 5 + s.box + (s.dueAt - now) / 86_400_000;
      return { c, i, priority };
    })
    .sort((a, b) => a.priority - b.priority || a.i - b.i)
    .map((x) => x.c);
}

export function deckSummary(
  deck: string,
  cards: Flashcard[],
): { due: number; learning: number; known: number } {
  const stats = getDeckStats(deck);
  const now = Date.now();
  let due = 0;
  let learning = 0;
  let known = 0;
  for (const c of cards) {
    const s = stats[cardKey(c)];
    if (!s) due += 1;
    else if (s.box >= 4 && s.dueAt > now) known += 1;
    else if (s.dueAt <= now) due += 1;
    else learning += 1;
  }
  return { due, learning, known };
}

export function resetDeck(deck: string): void {
  const store = read();
  delete store[deck];
  write(store);
}
