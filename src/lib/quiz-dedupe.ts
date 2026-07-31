/**
 * Near-duplicate detection for generated quiz questions / flashcards, plus a
 * small localStorage memory of what a student has already been asked so we can
 * tell Gemini which angles to avoid on the next "Generate New Set".
 */

const STORE_PREFIX = "sophia.asked.";
const MAX_REMEMBERED = 80;

const STOP = new Set([
  "the", "a", "an", "of", "to", "in", "is", "are", "was", "were", "and", "or",
  "for", "on", "at", "by", "with", "what", "which", "who", "how", "why", "does",
  "do", "did", "it", "its", "this", "that", "from", "as", "be", "been", "you",
]);

export function normalizeQ(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): Set<string> {
  return new Set(
    normalizeQ(text)
      .split(" ")
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

/** Jaccard overlap of meaningful words — 1 means identical wording. */
export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  ta.forEach((w) => {
    if (tb.has(w)) shared += 1;
  });
  return shared / (ta.size + tb.size - shared);
}

const NEAR = 0.62;

export function isNearDuplicate(text: string, others: string[]): boolean {
  const norm = normalizeQ(text);
  return others.some((o) => normalizeQ(o) === norm || similarity(text, o) >= NEAR);
}

/**
 * Drops items that repeat something in `previous` or each other.
 * `key` maps an item to the text used for comparison (question + options).
 */
export function dedupeBy<T>(items: T[], key: (item: T) => string, previous: string[]): T[] {
  const seen = [...previous];
  const out: T[] = [];
  for (const item of items) {
    const text = key(item);
    if (!text.trim() || isNearDuplicate(text, seen)) continue;
    seen.push(text);
    out.push(item);
  }
  return out;
}

/* ---------- persistent "already asked" memory ---------- */

export function loadAsked(id: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_PREFIX + id);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function rememberAsked(id: string, questions: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const merged = [...loadAsked(id), ...questions].slice(-MAX_REMEMBERED);
    window.localStorage.setItem(STORE_PREFIX + id, JSON.stringify(merged));
  } catch {
    /* storage full or unavailable — dedupe just degrades to per-session */
  }
}

export function clearAsked(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORE_PREFIX + id);
  } catch {
    /* ignore */
  }
}
