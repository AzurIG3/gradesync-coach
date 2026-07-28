import { AI_API_BASE, AI_MODEL, looksLikeApiKey } from "./ai-config";

/**
 * Resolves the Gemini API key for a request: the user's own key (from Settings)
 * if provided, otherwise the project key stored in secrets.
 * This is the ONLY place the project key is read.
 */
export function resolveApiKey(userKey?: string): string {
  const own = (userKey ?? "").trim();
  if (own && looksLikeApiKey(own)) return own;
  const projectKey = process.env.GEMINI_API_KEY;
  if (!projectKey) throw new Error("Missing GEMINI_API_KEY");
  return projectKey;
}

export function generateContentUrl(apiKey: string): string {
  return `${AI_API_BASE}/models/${AI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
}
