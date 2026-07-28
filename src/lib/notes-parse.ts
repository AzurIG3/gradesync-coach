export type Flashcard = { q: string; a: string };
export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
};

/** Extract the first JSON array from a model response, tolerating code fences and prose. */
function extractJsonArray(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through */
  }
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function parseFlashcards(raw: string): Flashcard[] {
  const data = extractJsonArray(raw);
  if (Array.isArray(data)) {
    const cards = data
      .map((c: unknown) => {
        const o = (c ?? {}) as Record<string, unknown>;
        const q = typeof o.q === "string" ? o.q : typeof o.question === "string" ? o.question : "";
        const a = typeof o.a === "string" ? o.a : typeof o.answer === "string" ? o.answer : "";
        return { q: q.trim(), a: a.trim() };
      })
      .filter((c) => c.q && c.a);
    if (cards.length) return cards;
  }
  // Legacy fallback: "Q: ...\nA: ..."
  const cards: Flashcard[] = [];
  const blocks = raw.split(/\n\s*\n/);
  for (const b of blocks) {
    const m = b.match(/Q\s*:\s*([\s\S]*?)\n\s*A\s*:\s*([\s\S]*)/i);
    if (m) cards.push({ q: m[1].trim(), a: m[2].trim() });
  }
  return cards;
}

export function parseQuiz(raw: string): QuizQuestion[] {
  const data = extractJsonArray(raw);
  if (!Array.isArray(data)) return [];
  return data
    .map((q: unknown) => {
      const o = (q ?? {}) as Record<string, unknown>;
      const question = typeof o.question === "string" ? o.question.trim() : "";
      const options = Array.isArray(o.options)
        ? o.options.map((x) => String(x)).filter(Boolean)
        : [];
      const answerIndex = typeof o.answerIndex === "number" ? o.answerIndex : -1;
      const explanation = typeof o.explanation === "string" ? o.explanation : undefined;
      return { question, options, answerIndex, explanation };
    })
    .filter(
      (q) => q.question && q.options.length >= 2 && q.answerIndex >= 0 && q.answerIndex < q.options.length,
    );
}
