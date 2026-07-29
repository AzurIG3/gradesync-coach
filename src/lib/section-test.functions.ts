import { createServerFn } from "@tanstack/react-start";
import { AI_API_BASE } from "./ai-config";

function str(v: unknown, max = 200_000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

type NoteInput = { title: string; content: string };

/**
 * Generate a longer combined MCQ test across multiple notes in ONE Gemini call.
 * The model tags each question with its source note title so we can show a per-note breakdown.
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
    return { notes, apiKey: str(o.apiKey, 200).trim() };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey } = await import("./ai.server");
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

    const systemPrompt = `You are creating a FULL SECTION TEST for a Pakistani Matric (Grade 9-10) student. You have ${data.notes.length} separate notes.

Create EXACTLY ${desired} multiple-choice questions in total, drawn from ALL the notes together. Use these per-note question counts:
${perNoteCounts.join("\n")}

RULES:
- Every question must be answerable from the note it's tagged to.
- The "topic" field MUST match the note's title exactly (case and spelling).
- Exactly 4 options per question. "answerIndex" is 0-3.
- Keep the language simple, short sentences. Keep explanations to one short sentence.
- Cover a mix of easy, medium and slightly harder questions.
- Reply with ONLY a valid JSON array — no prose, no code fences, nothing before or after.

Shape:
[{"question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"one short sentence","topic":"exact note title"}]`;

    // gemini-2.5-flash-lite is meaningfully faster than gemini-2.5-flash for
    // structured MCQ generation and produces equivalent quality here.
    const url = `${AI_API_BASE}/models/gemini-2.5-flash-lite:generateContent?key=${encodeURIComponent(
      key,
    )}`;
    // Hard timeout so the UI is never stuck waiting forever on a hung request.
    const controller = new AbortController();
    const TIMEOUT_MS = 75_000;
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
            temperature: 0.4,
            maxOutputTokens: 2560,
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
