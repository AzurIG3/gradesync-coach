import { AI_MODEL, AI_API_BASE } from "./ai-config";

/** Preferred model for Smart Notes (flash tier, never Pro). */
export const NOTES_MODEL = "gemini-flash-latest";

export type GenMode = "summary" | "details" | "flashcards" | "quiz";

const CHART_HINT = `
If — and ONLY if — the notes contain clearly numeric data that is naturally suited to a bar or line chart (e.g. scores over time, comparisons between items, trends across years), append AT THE END of your reply a single fenced code block tagged \`chart\` with a JSON object:
\`\`\`chart
{"type":"bar","title":"Short title","xKey":"label","yKey":"value","data":[{"label":"A","value":10},{"label":"B","value":20}]}
\`\`\`
Use "type":"line" for trends over time, "bar" for comparisons. Keep data to at most 8 points. If the notes don't have numeric data suited to a chart, DO NOT include a chart block.`;

const HEADING_HINT = `
STRUCTURE the reply with proper Markdown heading levels so it's easy to scan:
- Use \`##\` for the main topic or section.
- Use \`###\` for subtopics under it.
- Use \`####\` only for very small sub-sub-labels (rare).
- Put paragraphs, bullet lists and tables UNDER the matching heading.
- Do not put everything under one heading and do not skip levels (no \`###\` without a parent \`##\`).
- Do NOT use a top-level \`#\` heading — the note already has a title.`;

export const MODE_PROMPTS: Record<GenMode, string> = {
  summary:
    "Summarize the following study notes for a Pakistani Matric (Grade 9-10) student. Use simple words and short sentences. Reply in Markdown: start with a 3-6 sentence overview paragraph, then use `##` / `###` headings to group the main ideas, and put a short bulleted list under each. Use **bold** for key terms. If the notes contain a table of data, you may include a small Markdown table under the relevant heading." +
    HEADING_HINT +
    CHART_HINT,
  details:
    "Pull out the KEY DETAILS a Matric (Grade 9-10) student must remember from the following study notes: important definitions, formulas, dates, names and facts. Reply in Markdown, grouped under `##` / `###` headings by topic, with short bullet points under each heading. Use **bold** for the label and plain text for the explanation. Keep the language simple. If the notes contain tabular data, you may include a small Markdown table." +
    HEADING_HINT +
    CHART_HINT,
  flashcards:
    'Create 8-12 flashcards from the following study notes for a Matric (Grade 9-10) student. Reply with ONLY a valid JSON array, no prose, no code fences. Shape: [{"q":"short question","a":"short simple answer (1-2 sentences)"}]. Do not include any text before or after the JSON.',
  quiz:
    'Create a 5-question multiple-choice practice quiz from the following study notes for a Matric (Grade 9-10) student. Reply with ONLY a valid JSON array, no prose, no code fences. Shape: [{"question":"...","options":["A option","B option","C option","D option"],"answerIndex":0,"explanation":"one short sentence"}]. Exactly 4 options per question. answerIndex is 0-3. Keep the language simple.',
};

export const EXTRACT_PROMPT =
  "Extract ALL readable text content from this file exactly as it appears. Keep headings, lists and line breaks. Do not summarize, do not add any commentary. If the file has no readable text, reply with exactly: NO_TEXT_FOUND";

/** Cleans raw extracted/OCR text into readable notes WITHOUT losing information. */
export const CLEANUP_PROMPT = `You are cleaning up text that was extracted from a scanned page, photo or document. The extraction may contain OCR mistakes from blur, warping, shadows or bad lighting.

Your job:
1. Fix obvious OCR/extraction errors using context: misread words and characters (e.g. "rn" -> "m", "0" -> "O", "l" -> "1"), garbled characters, broken or split sentences, joined words, stray symbols and page artifacts (page numbers, watermark fragments, scan noise).
2. Reformat into clean, well-structured notes: proper paragraphs, correct spacing, correct punctuation and capitalisation, Markdown headings (\`##\` / \`###\`) where the source clearly has headings, and bullet or numbered lists where the source has lists.
3. Keep any tables as Markdown tables. Keep formulas and math as they are (use $...$ / $$...$$ if the source is mathematical).

Strict rules:
- PRESERVE the original meaning and EVERY fact, number, name, date, definition and example. Do NOT summarize, shorten, merge or drop any information.
- Do NOT add new facts, explanations or commentary of your own.
- If a word is truly unreadable, keep your best guess from context rather than inventing new content.
- Reply with ONLY the cleaned text. No preamble, no code fences around the whole answer.`;

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; kind: "rate_limit" | "bad_key" | "error"; message: string };

function friendly(status: number, userProvidedKey: boolean): GeminiResult {
  if (status === 429) {
    return {
      ok: false,
      kind: "rate_limit",
      message:
        "Our AI assistant is a bit busy right now. You can wait a few minutes and try again, or add your own free Gemini API key in Settings for unlimited access.",
    };
  }
  if (status === 401 || status === 403) {
    return {
      ok: false,
      kind: "bad_key",
      message: userProvidedKey
        ? "That API key looks invalid or doesn't have access. Please check the key you saved in Settings."
        : "The app's AI key isn't working right now. You can add your own free Gemini key in Settings to keep going.",
    };
  }
  return {
    ok: false,
    kind: "error",
    message: `Sorry, that didn't work right now (error ${status}). Please try again in a moment.`,
  };
}

/** Single place where Smart Notes talks to the native Gemini endpoint. */
export async function callGemini(
  key: string,
  parts: Part[],
  systemPrompt: string,
  userProvidedKey: boolean,
): Promise<GeminiResult> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
  });

  const models = [NOTES_MODEL, AI_MODEL];
  let last: Response | null = null;

  for (const model of models) {
    const url = `${AI_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (res.ok) {
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text =
        json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      return { ok: true, text: text.trim() };
    }
    last = res;
    // Only fall back to the alternate flash model if this id was rejected.
    if (res.status !== 404) break;
  }

  const status = last?.status ?? 500;
  console.error("Gemini (notes) error:", status, await last?.text().catch(() => ""));
  return friendly(status, userProvidedKey);
}
