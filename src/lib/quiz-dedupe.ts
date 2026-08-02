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
/** Question stems repeat more subtly than full questions, so judge them harder. */
const NEAR_STEM = 0.52;

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

/* ---------- stronger, question-aware de-duplication ---------- */

/** A fingerprint of the answer options, order-independent. */
function optionsKey(options: string[]): string {
  return options
    .map((o) => normalizeQ(o))
    .filter(Boolean)
    .sort()
    .join("|");
}

type QLike = { question: string; options: string[] };

/**
 * De-duplicates a generated set of questions against previously asked ones AND
 * against each other. A question is rejected when:
 *  - its stem is identical or highly similar to one already kept, OR
 *  - its option set is exactly the same as one already kept, OR
 *  - the combined stem+options text is a near duplicate.
 *
 * This guarantees the same stem or nearly identical options can never appear
 * twice inside a single generated quiz, even across regenerations.
 */
export function dedupeQuestions<T extends QLike>(items: T[], previous: string[] = []): T[] {
  const stems: string[] = [...previous];
  const combos: string[] = [...previous];
  const optionKeys = new Set<string>();
  const out: T[] = [];

  for (const item of items) {
    const stem = (item.question ?? "").trim();
    if (!stem) continue;
    const combo = `${stem} ${item.options.join(" ")}`;
    const oKey = optionsKey(item.options);

    const stemDupe = stems.some(
      (s) => normalizeQ(s) === normalizeQ(stem) || similarity(s, stem) >= NEAR_STEM,
    );
    if (stemDupe) continue;
    if (oKey && optionKeys.has(oKey)) continue;
    if (isNearDuplicate(combo, combos)) continue;

    stems.push(stem);
    combos.push(combo);
    if (oKey) optionKeys.add(oKey);
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
