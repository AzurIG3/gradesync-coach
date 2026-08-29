/**
 * SINGLE SOURCE OF TRUTH for AI (Gemini) configuration.
 *
 * Key resolution order used by every AI feature (Study Assistant, Smart Notes, ...):
 *   1. The user's own key saved in Settings (localStorage, this file)
 *   2. The project key stored as the GEMINI_API_KEY secret (server-side fallback)
 *
 * To later move to a full "bring your own key" system, only this file and
 * `resolveApiKey()` in src/lib/ai.server.ts need to change.
 */

export const AI_MODEL = "gemini-flash-latest";
/** Faster/cheaper model for bulk generation (section tests). */
export const AI_MODEL_FAST = "gemini-flash-lite-latest";
export const AI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** localStorage key where an optional user-supplied API key is kept. */
export const USER_API_KEY_STORAGE_KEY = "study-planner-ai-key";

export function getUserApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(USER_API_KEY_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function setUserApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const clean = key.trim();
    if (clean) localStorage.setItem(USER_API_KEY_STORAGE_KEY, clean);
    else localStorage.removeItem(USER_API_KEY_STORAGE_KEY);
  } catch {}
}

/**
 * True when the student has saved their OWN Gemini key in Settings.
 * Own-key users hit their personal Google quota, so the app must NOT add any
 * extra throttling (chat cooldowns, one-file-at-a-time extraction) on top —
 * Google enforces the real rate limits on their end.
 */
export function hasOwnApiKey(): boolean {
  return getUserApiKey().length > 0;
}

/** Basic shape check so obvious typos are caught before a request is made. */
export function looksLikeApiKey(key: string): boolean {
  const k = key.trim();
  return k.length >= 20 && k.length <= 200 && /^[A-Za-z0-9_\-]+$/.test(k);
}
