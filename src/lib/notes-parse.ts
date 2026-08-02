export type Flashcard = { q: string; a: string };
export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
  topic?: string;
};

export type ChartSpec = {
  type: "bar" | "line";
  title?: string;
  xKey: string;
  yKey: string;
  data: Array<Record<string, string | number>>;
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
      const topic =
        typeof o.topic === "string" && o.topic.trim()
          ? o.topic.trim()
          : typeof o.note === "string" && o.note.trim()
            ? o.note.trim()
            : undefined;
      return { question, options, answerIndex, explanation, topic };
    })
    .filter(
      (q) => q.question && q.options.length >= 2 && q.answerIndex >= 0 && q.answerIndex < q.options.length,
    );
}

/**
 * Pull an optional ```chart ... ``` block out of a Markdown response.
 * Returns the parsed chart (or null) plus the Markdown with the block removed.
 */
export function extractChart(raw: string): { chart: ChartSpec | null; markdown: string } {
  const re = /```chart\s*([\s\S]*?)```/i;
  const m = raw.match(re);
  if (!m) return { chart: null, markdown: raw };
  const body = m[1].trim();
  const markdown = raw.replace(re, "").trim();
  try {
    const parsed = JSON.parse(body) as Partial<ChartSpec>;
    if (
      (parsed.type === "bar" || parsed.type === "line") &&
      typeof parsed.xKey === "string" &&
      typeof parsed.yKey === "string" &&
      Array.isArray(parsed.data) &&
      parsed.data.length > 0
    ) {
      return {
        chart: {
          type: parsed.type,
          title: typeof parsed.title === "string" ? parsed.title : undefined,
          xKey: parsed.xKey,
          yKey: parsed.yKey,
          data: parsed.data as ChartSpec["data"],
        },
        markdown,
      };
    }
  } catch {
    /* ignore malformed chart block */
  }
  return { chart: null, markdown };
}

/* ---------------- Board exam style paper ---------------- */

export type BoardQuestion = {
  type: "mcq" | "short" | "long";
  question: string;
  options: string[];
  answerIndex: number;
  modelAnswer?: string;
  keyPoints?: string[];
  explanation?: string;
  topic?: string;
  marks: number;
};

export type BoardSection = {
  name: string;
  instructions?: string;
  questions: BoardQuestion[];
};

export type BoardExam = {
  title: string;
  instructions?: string;
  timeLimitMinutes: number;
  totalMarks: number;
  sections: BoardSection[];
};

function extractJsonObject(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through */
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function parseBoardExam(raw: string): BoardExam | null {
  const data = extractJsonObject(raw) as Record<string, unknown> | null;
  if (!data || typeof data !== "object") return null;
  const rawSections = Array.isArray(data.sections) ? data.sections : [];

  const sections: BoardSection[] = rawSections
    .map((s: unknown) => {
      const o = (s ?? {}) as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name.trim() : "";
      const questions = (Array.isArray(o.questions) ? o.questions : [])
        .map((q: unknown): BoardQuestion | null => {
          const qq = (q ?? {}) as Record<string, unknown>;
          const question = typeof qq.question === "string" ? qq.question.trim() : "";
          if (!question) return null;
          const rawType = typeof qq.type === "string" ? qq.type.toLowerCase() : "";
          const options = Array.isArray(qq.options)
            ? qq.options.map((x) => String(x)).filter(Boolean)
            : [];
          const type: BoardQuestion["type"] =
            rawType === "mcq" || rawType === "short" || rawType === "long"
              ? (rawType as BoardQuestion["type"])
              : options.length >= 2
                ? "mcq"
                : "short";
          const answerIndex = typeof qq.answerIndex === "number" ? qq.answerIndex : -1;
          if (type === "mcq" && (options.length < 2 || answerIndex < 0 || answerIndex >= options.length)) {
            return null;
          }
          return {
            type,
            question,
            options,
            answerIndex,
            modelAnswer:
              typeof qq.modelAnswer === "string"
                ? qq.modelAnswer.trim()
                : typeof qq.answer === "string"
                  ? qq.answer.trim()
                  : undefined,
            keyPoints: Array.isArray(qq.keyPoints)
              ? qq.keyPoints.map((x) => String(x)).filter(Boolean)
              : undefined,
            explanation: typeof qq.explanation === "string" ? qq.explanation : undefined,
            topic: typeof qq.topic === "string" && qq.topic.trim() ? qq.topic.trim() : undefined,
            marks:
              typeof qq.marks === "number" && qq.marks > 0
                ? qq.marks
                : type === "mcq"
                  ? 1
                  : type === "short"
                    ? 3
                    : 8,
          };
        })
        .filter((q): q is BoardQuestion => q !== null);
      return { name: name || "Section", instructions: typeof o.instructions === "string" ? o.instructions : undefined, questions };
    })
    .filter((s) => s.questions.length > 0);

  if (!sections.length) return null;

  const computedMarks = sections.reduce(
    (sum, s) => sum + s.questions.reduce((a, q) => a + q.marks, 0),
    0,
  );
  const time = typeof data.timeLimitMinutes === "number" && data.timeLimitMinutes > 0
    ? Math.round(data.timeLimitMinutes)
    : Math.max(20, Math.round(computedMarks * 1.5));

  return {
    title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : "Board Exam Style Practice Paper",
    instructions: typeof data.instructions === "string" ? data.instructions : undefined,
    timeLimitMinutes: time,
    totalMarks:
      typeof data.totalMarks === "number" && data.totalMarks > 0 ? data.totalMarks : computedMarks,
    sections,
  };
}
