import { createServerFn } from "@tanstack/react-start";

function str(v: unknown, max = 200_000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function strList(v: unknown, cap = 40, max = 300): string[] {
  return Array.isArray(v)
    ? v.map((a) => str(a, max).trim()).filter(Boolean).slice(0, cap)
    : [];
}

/** Re-explain an answer more simply (or deeper), optionally with an analogy. */
export const reexplain = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    const answer = str(o.answer, 20_000);
    if (!answer.trim()) throw new Error("Nothing to explain");
    const rawDepth = str(o.depth, 12);
    const depth = (["simple", "standard", "advanced"].includes(rawDepth) ? rawDepth : "simple") as
      | "simple"
      | "standard"
      | "advanced";
    return {
      question: str(o.question, 4_000),
      answer,
      depth,
      analogy: o.analogy !== false,
      mode: str(o.mode, 12) === "continue" ? ("continue" as const) : ("explain" as const),
      apiKey: str(o.apiKey, 200).trim(),
    };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey } = await import("./ai.server");
    const { callGemini } = await import("./notes.server");
    const { reexplainSystem, CONTINUE_PROMPT, DEPTH_PROMPTS } = await import("./ai-extra.server");
    const key = resolveApiKey(data.apiKey);
    const system =
      data.mode === "continue"
        ? `${CONTINUE_PROMPT}\n\nDEPTH: ${DEPTH_PROMPTS[data.depth]}`
        : reexplainSystem(data.depth, data.analogy);
    const parts = [
      {
        text:
          (data.question ? `STUDENT'S QUESTION:\n${data.question}\n\n` : "") +
          `PREVIOUS ANSWER:\n${data.answer}`,
      },
    ];
    return callGemini(key, parts, system, Boolean(data.apiKey), {
      temperature: 0.6,
      maxOutputTokens: 4096,
    });
  });

/** Classify which syllabus chapter a cleaned note belongs to. */
export const classifyChapter = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    const text = str(o.text, 12_000);
    const chapters = strList(o.chapters, 60, 160);
    if (!text.trim()) throw new Error("Note is empty");
    if (!chapters.length) throw new Error("No chapters to match");
    return { text, chapters, apiKey: str(o.apiKey, 200).trim() };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey } = await import("./ai.server");
    const { callGemini } = await import("./notes.server");
    const { CLASSIFY_PROMPT } = await import("./ai-extra.server");
    const key = resolveApiKey(data.apiKey);
    const list = data.chapters.map((c, i) => `${i + 1}. ${c}`).join("\n");
    const res = await callGemini(
      key,
      [{ text: `CHAPTER LIST:\n${list}\n\nNOTE CONTENT:\n${data.text.slice(0, 8_000)}` }],
      CLASSIFY_PROMPT,
      Boolean(data.apiKey),
      { temperature: 0, maxOutputTokens: 64 },
    );
    if (!res.ok) return res;
    const guess = res.text.trim().replace(/^["'\d.\s]+|["']+$/g, "").trim();
    const match =
      data.chapters.find((c) => c.toLowerCase() === guess.toLowerCase()) ??
      data.chapters.find(
        (c) =>
          guess.length > 3 &&
          (c.toLowerCase().includes(guess.toLowerCase()) ||
            guess.toLowerCase().includes(c.toLowerCase())),
      );
    return { ok: true as const, text: match ?? "" };
  });

/** Condensed cheat sheet across a subject's notes (one combined call). */
export const generateCheatSheet = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    const raw = o.notes;
    if (!Array.isArray(raw) || !raw.length) throw new Error("No notes selected");
    const notes = raw
      .map((n) => {
        const nn = (n ?? {}) as Record<string, unknown>;
        return { title: str(nn.title, 200).trim(), content: str(nn.content, 40_000) };
      })
      .filter((n) => n.content.trim());
    if (!notes.length) throw new Error("Selected notes have no readable content");
    return {
      subject: str(o.subject, 120).trim() || "Subject",
      notes,
      apiKey: str(o.apiKey, 200).trim(),
    };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey } = await import("./ai.server");
    const { callGemini } = await import("./notes.server");
    const { CHEATSHEET_PROMPT } = await import("./ai-extra.server");
    const key = resolveApiKey(data.apiKey);
    const budget = Math.max(2_000, Math.floor(40_000 / data.notes.length));
    const combined = data.notes
      .map((n, i) => `=== NOTE ${i + 1}: ${n.title || "Untitled"} ===\n${n.content.slice(0, budget)}`)
      .join("\n\n");
    return callGemini(
      key,
      [{ text: `SUBJECT: ${data.subject}\n\n${combined}` }],
      CHEATSHEET_PROMPT,
      Boolean(data.apiKey),
      { temperature: 0.3, maxOutputTokens: 6144 },
    );
  });

/** Transcribe a recorded voice note. */
export const transcribeVoiceNote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    const audio = str(o.data, 12_000_000);
    const mimeType = str(o.mimeType, 200) || "audio/webm";
    if (!audio) throw new Error("Missing audio");
    return { data: audio, mimeType, apiKey: str(o.apiKey, 200).trim() };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey } = await import("./ai.server");
    const { callGemini } = await import("./notes.server");
    const { TRANSCRIBE_PROMPT } = await import("./ai-extra.server");
    const key = resolveApiKey(data.apiKey);
    return callGemini(
      key,
      [{ inlineData: { mimeType: data.mimeType, data: data.data } }],
      TRANSCRIBE_PROMPT,
      Boolean(data.apiKey),
      { temperature: 0.1, maxOutputTokens: 8192 },
    );
  });

/** Build a quiz that targets the student's mastery-tracked weak topics. */
export const generateWeakSpotQuiz = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    const topics = strList(o.topics, 12, 120);
    if (!topics.length) throw new Error("No weak topics yet");
    const rawDiff = str(o.difficulty, 10);
    const difficulty = (["easy", "medium", "hard"].includes(rawDiff) ? rawDiff : "medium") as
      | "easy"
      | "medium"
      | "hard";
    return {
      topics,
      scores: strList(o.scores, 12, 120),
      context: str(o.context, 24_000),
      difficulty,
      avoid: strList(o.avoid, 40, 300),
      apiKey: str(o.apiKey, 200).trim(),
    };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey } = await import("./ai.server");
    const { callGemini, buildAvoidBlock, difficultyHint, WITHIN_SET_HINT } = await import(
      "./notes.server"
    );
    const { weakSpotSystem } = await import("./ai-extra.server");
    const key = resolveApiKey(data.apiKey);
    const count = Math.max(6, Math.min(12, data.topics.length * 2));
    const system =
      weakSpotSystem() +
      ` Produce exactly ${count} questions.` +
      WITHIN_SET_HINT +
      difficultyHint(data.difficulty);
    const nonce = Math.random().toString(36).slice(2, 10);
    const scoreLines = data.scores.length ? `\n\nPAST SCORES:\n${data.scores.join("\n")}` : "";
    const context = data.context.trim()
      ? `\n\nSOURCE MATERIAL FROM THE STUDENT'S OWN NOTES (prefer these facts):\n${data.context.slice(0, 24_000)}`
      : "";
    return callGemini(
      key,
      [
        {
          text: `WEAK TOPICS:\n${data.topics.map((t, i) => `${i + 1}. ${t}`).join("\n")}${scoreLines}${context}${buildAvoidBlock(
            data.avoid,
          )}\n\n[variation seed: ${nonce}]`,
        },
      ],
      system,
      Boolean(data.apiKey),
      { temperature: 0.95, topP: 0.95, maxOutputTokens: 4096 },
    );
  });
