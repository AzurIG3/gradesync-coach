import { createServerFn } from "@tanstack/react-start";

function str(v: unknown, max = 200_000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

/** Extract raw text from an uploaded PDF or image (base64) using Gemini. */
export const extractFileText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    const data = str(o.data, 12_000_000);
    const mimeType = str(o.mimeType, 200);
    if (!data || !mimeType) throw new Error("Missing file data");
    return { data, mimeType, apiKey: str(o.apiKey, 200).trim() };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey } = await import("./ai.server");
    const { callGemini, EXTRACT_PROMPT } = await import("./notes.server");
    const key = resolveApiKey(data.apiKey);
    return callGemini(
      key,
      [{ inlineData: { mimeType: data.mimeType, data: data.data } }],
      EXTRACT_PROMPT,
      Boolean(data.apiKey),
    );
  });

/** Clean up raw extracted/OCR text into well-structured notes (no summarising). */
export const cleanNoteText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    const text = str(o.text, 60_000);
    if (!text.trim()) throw new Error("Nothing to clean");
    return { text, apiKey: str(o.apiKey, 200).trim() };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey } = await import("./ai.server");
    const { callGemini, CLEANUP_PROMPT } = await import("./notes.server");
    const key = resolveApiKey(data.apiKey);
    return callGemini(key, [{ text: data.text }], CLEANUP_PROMPT, Boolean(data.apiKey), {
      temperature: 0.2,
      maxOutputTokens: 8192,
    });
  });


/** Generate a summary / key details / flashcards / quiz from note text. */
export const generateFromNote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    const mode = str(o.mode, 20);
    if (!["summary", "details", "flashcards", "quiz"].includes(mode)) {
      throw new Error("Invalid mode");
    }
    const text = str(o.text, 60_000);
    if (!text.trim()) throw new Error("Note is empty");
    return { mode: mode as "summary" | "details" | "flashcards" | "quiz", text, apiKey: str(o.apiKey, 200).trim() };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey } = await import("./ai.server");
    const { callGemini, MODE_PROMPTS } = await import("./notes.server");
    const key = resolveApiKey(data.apiKey);
    return callGemini(
      key,
      [{ text: data.text }],
      MODE_PROMPTS[data.mode],
      Boolean(data.apiKey),
    );
  });
