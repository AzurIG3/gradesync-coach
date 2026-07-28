import { AI_MODEL, AI_API_BASE } from "./ai-config";

/** Preferred model for Smart Notes (flash tier, never Pro). */
export const NOTES_MODEL = "gemini-2.5-flash";

export type GenMode = "summary" | "details" | "flashcards" | "quiz";

export const MODE_PROMPTS: Record<GenMode, string> = {
  summary:
    "Summarize the following study notes for a Pakistani Matric (Grade 9-10) student. Use simple words and short sentences. Reply in Markdown: a 3-6 sentence summary paragraph, then a bulleted list of 3-5 main ideas. Use **bold** for key terms.",
  details:
    "Pull out the KEY DETAILS a Matric (Grade 9-10) student must remember from the following study notes: important definitions, formulas, dates, names and facts. Reply in Markdown as short bullet points, using **bold** for the label and plain text for the explanation. Keep the language simple.",
  flashcards:
    'Create 8-12 flashcards from the following study notes for a Matric (Grade 9-10) student. Reply with ONLY a valid JSON array, no prose, no code fences. Shape: [{"q":"short question","a":"short simple answer (1-2 sentences)"}]. Do not include any text before or after the JSON.',
  quiz:
    'Create a 5-question multiple-choice practice quiz from the following study notes for a Matric (Grade 9-10) student. Reply with ONLY a valid JSON array, no prose, no code fences. Shape: [{"question":"...","options":["A option","B option","C option","D option"],"answerIndex":0,"explanation":"one short sentence"}]. Exactly 4 options per question. answerIndex is 0-3. Keep the language simple.',
};

export const EXTRACT_PROMPT =
  "Extract ALL readable text content from this file exactly as it appears. Keep headings, lists and line breaks. Do not summarize, do not add any commentary. If the file has no readable text, reply with exactly: NO_TEXT_FOUND";

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
