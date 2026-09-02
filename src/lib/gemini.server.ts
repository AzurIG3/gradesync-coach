/**
 * SHARED Gemini client — the single place every AI feature talks to Gemini.
 *
 * Handles, once, for all features:
 *  - a consistent per-attempt timeout (45s) inside an overall request budget
 *  - one automatic retry on 503 / transient network failures
 *  - consistent, user-friendly error messages by kind
 *  - consistent health logging: feature, model, status, duration, outcome
 *
 * Behaviour for the user is unchanged: each feature still maps this result to
 * exactly the same reply/kind shape it returned before.
 */
import { AI_API_BASE, AI_MODEL } from "./ai-config";

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

export type GeminiFeature =
  | "askAssistant"
  | "askAboutNote"
  | "extractFileText"
  | "cleanNoteText"
  | "generateFromNote"
  | "generateSectionTest"
  | "classifyChapter"
  | "generateCheatSheet"
  | "transcribeVoiceNote"
  | "generateWeakSpotQuiz"
  | "reexplain";

export type GeminiErrorKind = "rate_limit" | "bad_key" | "timeout" | "error";

export type GeminiOk = {
  ok: true;
  text: string;
  /** Raw finish reason (STOP / MAX_TOKENS / SAFETY / RECITATION), when present. */
  finishReason?: string;
  /** Prompt-level safety block reason, when present. */
  blockReason?: string;
};

export type GeminiErr = {
  ok: false;
  kind: GeminiErrorKind;
  status?: number;
  message: string;
};

export type GeminiResult = GeminiOk | GeminiErr;

export type GeminiCallOptions = {
  /** Which AI feature is calling — used for logging only. */
  feature: GeminiFeature;
  key: string;
  /** Single-turn content. Ignored when `history` is supplied. */
  parts?: Part[];
  /** Multi-turn conversation, used verbatim as `contents`. */
  history?: Array<{ role: string; parts: Part[] }>;
  systemPrompt: string;
  /** True when the student supplied their own key (changes bad-key wording). */
  userProvidedKey: boolean;
  /** Models to try in order; later ones are only tried after a 404. */
  models?: string[];
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  /** Per-attempt timeout. Defaults to 45s. */
  timeoutMs?: number;
  /** Whole-call budget across attempts. Defaults to 58s. */
  budgetMs?: number;
  /** Extra note appended to the timeout message (e.g. photo advice). */
  timeoutMessage?: string;
};

/** Default consistent timeouts, shared by every AI feature. */
export const ATTEMPT_TIMEOUT_MS = 45_000;
export const REQUEST_BUDGET_MS = 58_000;
const RETRY_DELAY_MS = 1_200;

function log(
  feature: GeminiFeature,
  model: string,
  outcome: string,
  ms: number,
  extra?: string,
): void {
  const line = `[ai] feature=${feature} model=${model} outcome=${outcome} ms=${ms}${
    extra ? ` ${extra}` : ""
  }`;
  if (outcome === "ok") console.log(line);
  else console.error(line);
}

function timeoutError(message?: string): GeminiErr {
  return {
    ok: false,
    kind: "timeout",
    message:
      message ??
      "That request reached the processing time limit. Please tap Retry — it usually works on the second try.",
  };
}

function friendly(status: number, userProvidedKey: boolean): GeminiErr {
  if (status === 429) {
    return {
      ok: false,
      kind: "rate_limit",
      status,
      message:
        "Our AI assistant is a bit busy right now. You can wait a few minutes and try again, or add your own free Gemini API key in Settings for unlimited access.",
    };
  }
  if (status === 401 || status === 403) {
    return {
      ok: false,
      kind: "bad_key",
      status,
      message: userProvidedKey
        ? "That API key looks invalid or doesn't have access. Please check the key you saved in Settings."
        : "The app's AI key isn't working right now. You can add your own free Gemini key in Settings to keep going.",
    };
  }
  if (status === 503) {
    return {
      ok: false,
      kind: "error",
      status,
      message:
        "The AI service is temporarily overloaded. We retried once, but it is still unavailable. Please tap Retry in a moment.",
    };
  }
  return {
    ok: false,
    kind: "error",
    status,
    message: `Sorry, that didn't work right now (error ${status}). Please try again in a moment.`,
  };
}

/**
 * Calls Gemini's generateContent with shared timeout / retry / logging.
 * Never throws for expected failures — always resolves to a GeminiResult.
 */
export async function callGeminiShared(opts: GeminiCallOptions): Promise<GeminiResult> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: opts.systemPrompt }] },
    contents: opts.history?.length
      ? opts.history
      : [{ role: "user", parts: opts.parts ?? [] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      ...(opts.topP !== undefined ? { topP: opts.topP } : {}),
      maxOutputTokens: opts.maxOutputTokens ?? 2048,
      ...(opts.responseMimeType ? { responseMimeType: opts.responseMimeType } : {}),
    },
  });

  const models = [...new Set(opts.models?.length ? opts.models : [AI_MODEL])];
  const attemptTimeout = opts.timeoutMs ?? ATTEMPT_TIMEOUT_MS;
  const deadline = Date.now() + (opts.budgetMs ?? REQUEST_BUDGET_MS);

  let lastStatus: number | null = null;
  let lastBody = "";
  let lastFailure: GeminiErr | null = null;
  const overallStart = Date.now();

  for (let m = 0; m < models.length; m += 1) {
    const model = models[m];
    const isLastModel = m === models.length - 1;
    const url = `${AI_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(opts.key)}`;
    // Leave time for the fallback model when there is one, so a model that
    // hangs upstream can't eat the whole budget.
    const perModelTimeout = isLastModel
      ? attemptTimeout
      : Math.min(attemptTimeout, Math.floor(attemptTimeout * 0.7));
    let tryNextModel = false;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const remaining = deadline - Date.now();
      if (remaining <= 1_000) {
        log(opts.feature, model, "budget_exhausted", Date.now() - overallStart);
        return lastFailure ?? timeoutError(opts.timeoutMessage);
      }

      const startedAt = Date.now();
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(Math.min(perModelTimeout, remaining)),
        });
      } catch (e) {
        const ms = Date.now() - startedAt;
        const name = (e as { name?: string })?.name;
        const aborted = name === "AbortError" || name === "TimeoutError";
        log(
          opts.feature,
          model,
          aborted ? "timeout" : "network_error",
          ms,
          `attempt=${attempt} err=${String((e as Error)?.message ?? e)}`,
        );
        lastFailure = aborted
          ? timeoutError(opts.timeoutMessage)
          : {
              ok: false,
              kind: "error",
              message: "We couldn't reach the AI service. Check your connection and try again.",
            };
        // One retry for a transient network failure; a hung/timed-out model is
        // retried on the next model in the list instead.
        if (!aborted && attempt === 1 && deadline - Date.now() > 5_000) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        tryNextModel = true;
        break;
      }

      const ms = Date.now() - startedAt;

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
            finishReason?: string;
          }>;
          promptFeedback?: { blockReason?: string };
        };
        const candidate = json.candidates?.[0];
        const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        log(
          opts.feature,
          model,
          "ok",
          ms,
          `attempt=${attempt} chars=${text.length} finish=${candidate?.finishReason ?? "-"}`,
        );
        return {
          ok: true,
          text: text.trim(),
          ...(candidate?.finishReason ? { finishReason: candidate.finishReason } : {}),
          ...(json.promptFeedback?.blockReason
            ? { blockReason: json.promptFeedback.blockReason }
            : {}),
        };
      }

      lastStatus = res.status;
      lastBody = await res.text().catch(() => "");
      log(opts.feature, model, `http_${res.status}`, ms, `attempt=${attempt}`);
      lastFailure = friendly(res.status, opts.userProvidedKey);

      if (res.status === 503 && attempt === 1 && deadline - Date.now() > 5_000) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      // A rejected model id, an overloaded model or a server error is worth
      // trying on the next model; key/quota/request errors are not.
      tryNextModel = res.status === 404 || res.status === 503 || res.status >= 500;
      break;
    }

    if (!tryNextModel) break;
    if (!isLastModel && deadline - Date.now() > 5_000) {
      console.warn(`[ai] feature=${opts.feature} falling back from ${model}`);
      continue;
    }
    break;
  }

  const status = lastStatus ?? 500;
  log(opts.feature, models.join(","), "failed", Date.now() - overallStart, `status=${status}`);
  if (lastBody) console.error(`[ai] feature=${opts.feature} body=${lastBody.slice(0, 500)}`);
  return lastFailure ?? friendly(status, opts.userProvidedKey);
}

