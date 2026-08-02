import { createServerFn } from "@tanstack/react-start";
import { AI_API_BASE, AI_MODEL_FAST } from "./ai-config";

function str(v: unknown, max = 200_000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function strList(v: unknown, cap = 40): string[] {
  return Array.isArray(v)
    ? v.map((a) => str(a, 300).trim()).filter(Boolean).slice(-cap)
    : [];
}

type NoteInput = { title: string; content: string };

/**
 * Generate a longer combined test across multiple notes in ONE Gemini call.
 *
 * Two formats:
 *  - "mcq"   — the classic Full Section Test (flat JSON array of MCQs).
 *  - "board" — a Board Exam style paper with sections, marks and a time limit.
 *
 * Each question is tagged with its source note title so we can show a per-note
 * breakdown and feed the mastery tracker.
 */
export const generateSectionTest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    const raw = o.notes;
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error("At least one note is required");
    }
    const notes: NoteInput[] = raw
      .map((n) => {
        const nn = (n ?? {}) as Record<string, unknown>;
        return { title: str(nn.title, 200).trim(), content: str(nn.content, 40_000) };
      })
      .filter((n) => n.title && n.content.trim());
    if (!notes.length) throw new Error("Selected notes have no readable content");
    const rawDiff = str(o.difficulty, 10);
    const difficulty = (["easy", "medium", "hard"].includes(rawDiff) ? rawDiff : "medium") as
      | "easy"
      | "medium"
      | "hard";
    const format = str(o.format, 10) === "board" ? ("board" as const) : ("mcq" as const);
    return {
      notes,
      avoid: strList(o.avoid),
      weak: strList(o.weak, 8),
      strong: strList(o.strong, 8),
      difficulty,
      format,
      apiKey: str(o.apiKey, 200).trim(),
    };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey } = await import("./ai.server");
    const { buildAvoidBlock, buildFocusBlock, difficultyHint, WITHIN_SET_HINT } = await import(
      "./notes.server"
    );
    const key = resolveApiKey(data.apiKey);

    // Scale question count with total content length: ~1 question per ~1500 chars, clamped 8-15.
    // Fewer questions = faster generation.
    const total = data.notes.reduce((s, n) => s + n.content.length, 0);
    const desired = Math.max(8, Math.min(15, Math.round(total / 1500) || 8));

    // Tighter per-note budget keeps the prompt small so the model responds faster.
    const perNoteBudget = Math.max(1500, Math.floor(24_000 / data.notes.length));
    const combined = data.notes
      .map(
        (n, i) =>
          `=== NOTE ${i + 1}: ${n.title} ===\n${n.content.slice(0, perNoteBudget)}`,
      )
      .join("\n\n");

    // Distribute questions across notes as evenly as possible.
    const base = Math.floor(desired / data.notes.length);
    const remainder = desired - base * data.notes.length;
    const perNoteCounts = data.notes.map(
      (n, i) => `- "${n.title}": ${base + (i < remainder ? 1 : 0)} questions`,
    );

    const shared = `${WITHIN_SET_HINT}${difficultyHint(data.difficulty)}${buildFocusBlock(
      data.weak,
      data.strong,
    )}

[variation seed: ${Math.random().toString(36).slice(2, 10)} — produce a different selection of questions than any previous attempt]${buildAvoidBlock(data.avoid)}`;

    const mcqPrompt = `You are creating a FULL SECTION TEST for a Pakistani Matric (Grade 9-10) student. You have ${data.notes.length} separate notes.

Create EXACTLY ${desired} multiple-choice questions in total, drawn from ALL the notes together. Use these per-note question counts:
${perNoteCounts.join("\n")}

RULES:
- Every question must be answerable from the note it's tagged to.
- The "topic" field MUST match the note's title exactly (case and spelling).
- Exactly 4 options per question. "answerIndex" is 0-3.
- Keep the language simple, short sentences. Keep explanations to one short sentence that says WHY the answer is right, using only facts from the notes.
- VARIETY IS REQUIRED: spread questions across the WHOLE of each note (beginning, middle and end) and mix question types (definition, application, cause/effect, comparison, numeric).
- Reply with ONLY a valid JSON array — no prose, no code fences, nothing before or after.

Shape:
[{"question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"one short sentence","topic":"exact note title"}]
${shared}`;

    const mcqCount = Math.max(6, Math.round(desired * 0.6));
    const shortCount = Math.max(3, Math.round(desired * 0.35));
    const longCount = 2;

    const boardPrompt = `You are setting a BOARD EXAM STYLE PRACTICE PAPER for a Pakistani Matric (Grade 9-10) student, in the style of a real board paper. You have ${data.notes.length} separate notes.

Build the paper from ALL the notes together, spreading questions evenly across these notes: ${data.notes
      .map((n) => `"${n.title}"`)
      .join(", ")}.

The paper must have EXACTLY these three sections:
1. "Section A — Objective (MCQs)": ${mcqCount} multiple-choice questions, 1 mark each.
2. "Section B — Short Questions": ${shortCount} short-answer questions, 3 marks each. Give a concise model answer (2-4 sentences).
3. "Section C — Long Questions": ${longCount} long-answer questions, 8 marks each. Give a structured model answer (a short paragraph plus 3-5 key points the student must include).

RULES:
- Every question must be answerable from the notes only.
- The "topic" field MUST match the source note's title exactly (case and spelling).
- MCQs have exactly 4 options and "answerIndex" 0-3, plus a one-sentence "explanation".
- Short and long questions have "modelAnswer" (and "keyPoints" for long questions).
- Set "timeLimitMinutes" to a realistic time for this paper, and "totalMarks" to the sum of all marks.
- Keep the language simple. Reply with ONLY a valid JSON object — no prose, no code fences.

Shape:
{"title":"Board Exam Style Practice Paper","timeLimitMinutes":60,"totalMarks":40,"instructions":"Attempt all questions.","sections":[{"name":"Section A — Objective (MCQs)","instructions":"Choose the correct option.","questions":[{"type":"mcq","question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"one short sentence","topic":"exact note title","marks":1}]},{"name":"Section B — Short Questions","instructions":"Answer briefly.","questions":[{"type":"short","question":"...","modelAnswer":"2-4 sentences","topic":"exact note title","marks":3}]},{"name":"Section C — Long Questions","instructions":"Answer in detail.","questions":[{"type":"long","question":"...","modelAnswer":"short paragraph","keyPoints":["...","..."],"topic":"exact note title","marks":8}]}]}
${shared}`;

    const systemPrompt = data.format === "board" ? boardPrompt : mcqPrompt;

    // The "-lite-latest" alias always points at the current fast model, so this
    // never breaks when Google retires a dated model id (which returns 404).
    const url = `${AI_API_BASE}/models/${AI_MODEL_FAST}:generateContent?key=${encodeURIComponent(
      key,
    )}`;
    // Hard timeout so the UI is never stuck waiting forever on a hung request.
    const controller = new AbortController();
    const TIMEOUT_MS = 90_000;
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: combined }] }],
          generationConfig: {
            temperature: 0.95,
            topP: 0.95,
            maxOutputTokens: data.format === "board" ? 6144 : 2560,
            responseMimeType: "application/json",
          },
        }),
      });
    } catch (err) {
      clearTimeout(timer);
      const aborted = (err as { name?: string })?.name === "AbortError";
      console.error("Section test fetch failed:", err);
      return {
        ok: false as const,
        kind: "error" as const,
        message: aborted
          ? "The AI took too long to reply. Try fewer notes, or try again in a moment."
          : "We couldn't reach the AI. Check your connection and try again.",
      };
    }
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Section test error:", res.status, errText);
      if (res.status === 429) {
        return {
          ok: false as const,
          kind: "rate_limit" as const,
          message:
            "Our AI is a bit busy right now. Please wait a moment or add your own free Gemini key in Settings.",
        };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          ok: false as const,
          kind: "bad_key" as const,
          message: data.apiKey
            ? "That API key looks invalid. Please check the key in Settings."
            : "The app's AI key isn't working. Add your own free Gemini key in Settings.",
        };
      }
      return {
        ok: false as const,
        kind: "error" as const,
        message: `Sorry, that didn't work (error ${res.status}). Please try again.`,
      };
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return { ok: true as const, text: text.trim() };
  });
