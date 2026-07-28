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

    // Scale question count with total content length: ~1 question per ~1200 chars, clamped 10-20.
    const total = data.notes.reduce((s, n) => s + n.content.length, 0);
    const desired = Math.max(10, Math.min(20, Math.round(total / 1200) || 10));

    // Give each note a per-note character budget so a huge note doesn't crowd out short ones.
    const perNoteBudget = Math.max(2000, Math.floor(45_000 / data.notes.length));
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
- Keep the language simple, short sentences.
- Cover a mix of easy, medium and slightly harder questions.
- Reply with ONLY a valid JSON array — no prose, no code fences, nothing before or after.

Shape:
[{"question":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"one short sentence","topic":"exact note title"}]`;

    const url = `${AI_API_BASE}/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      key,
    )}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: combined }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

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
