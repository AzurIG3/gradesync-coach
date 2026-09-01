import { createServerFn } from "@tanstack/react-start";

function str(v: unknown, max = 200_000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function strList(v: unknown, cap = 40): string[] {
  return Array.isArray(v)
    ? v.map((a) => str(a, 300).trim()).filter(Boolean).slice(-cap)
    : [];
}

/**
 * Extract text from an uploaded PDF or image (base64) using Gemini.
 * With `clean: true` the extraction and the cleanup pass happen in ONE call.
 */
export const extractFileText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    const data = str(o.data, 12_000_000);
    const mimeType = str(o.mimeType, 200);
    if (!data || !mimeType) throw new Error("Missing file data");
    return {
      data,
      mimeType,
      clean: o.clean !== false,
      apiKey: str(o.apiKey, 200).trim(),
    };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey } = await import("./ai.server");
    const { callGemini, EXTRACT_PROMPT, EXTRACT_CLEAN_PROMPT } = await import("./notes.server");
    const key = resolveApiKey(data.apiKey);
    return callGemini(
      key,
      [{ inlineData: { mimeType: data.mimeType, data: data.data } }],
      data.clean ? EXTRACT_CLEAN_PROMPT : EXTRACT_PROMPT,
      Boolean(data.apiKey),
      {
        feature: "extractFileText",
        timeoutMessage:
          "Reading that file reached the processing time limit. Please tap Retry — a smaller or clearer photo is usually faster.",
        ...(data.clean ? { temperature: 0.2, maxOutputTokens: 8192 } : {}),
      },
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
      feature: "cleanNoteText",
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
    const rawDiff = str(o.difficulty, 10);
    const difficulty = (["easy", "medium", "hard"].includes(rawDiff) ? rawDiff : "medium") as
      | "easy"
      | "medium"
      | "hard";
    return {
      mode: mode as "summary" | "details" | "flashcards" | "quiz",
      text,
      avoid: strList(o.avoid),
      weak: strList(o.weak, 8),
      strong: strList(o.strong, 8),
      difficulty,
      apiKey: str(o.apiKey, 200).trim(),
    };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey } = await import("./ai.server");
    const {
      callGemini,
      MODE_PROMPTS,
      buildAvoidBlock,
      buildFocusBlock,
      difficultyHint,
      WITHIN_SET_HINT,
    } = await import("./notes.server");
    const key = resolveApiKey(data.apiKey);
    const varied = data.mode === "quiz" || data.mode === "flashcards";
    const system = varied
      ? MODE_PROMPTS[data.mode] +
        WITHIN_SET_HINT +
        difficultyHint(data.difficulty) +
        buildFocusBlock(data.weak, data.strong)
      : MODE_PROMPTS[data.mode];
    // A per-run nonce nudges the model off its "default" set of questions.
    const nonce = Math.random().toString(36).slice(2, 10);
    const parts = varied
      ? [
          {
            text: `${data.text}${buildAvoidBlock(data.avoid)}\n\n[variation seed: ${nonce} — produce a different selection of questions than any previous attempt]`,
          },
        ]
      : [{ text: data.text }];
    return callGemini(
      key,
      parts,
      system,
      Boolean(data.apiKey),
      varied
        ? { feature: "generateFromNote", temperature: 0.95, topP: 0.95 }
        : { feature: "generateFromNote" },
    );
  });
