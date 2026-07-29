import { createServerFn } from "@tanstack/react-start";


type ChatMsg = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are a friendly AI Study Assistant for Pakistani Matric (Grade 9-10) students.

RULES:
- Only help with study-related and academic questions relevant to Matric subjects (Math, Physics, Chemistry, Biology, English, Urdu, Islamiat, Pakistan Studies, Computer Science, etc.).
- If the student asks something off-topic (games, gossip, unrelated chat), politely redirect them back to studying in one short sentence.
- Keep answers CONCISE, SIMPLE, and easy to understand. Use short sentences and everyday words.
- Avoid overly technical language unless the student specifically asks for it.
- Use small examples where helpful. Use bullet points or numbered steps for explanations.
- Answers should be exam-appropriate for the Matric level.
- If a topic is complex, break it into small steps.`;

function isValidMsg(m: unknown): m is ChatMsg {
  if (!m || typeof m !== "object") return false;
  const r = (m as { role?: unknown }).role;
  const c = (m as { content?: unknown }).content;
  return (r === "user" || r === "assistant") && typeof c === "string";
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid input");
    const messages = (input as { messages?: unknown }).messages;
    if (!Array.isArray(messages) || !messages.every(isValidMsg)) {
      throw new Error("messages must be an array of {role, content}");
    }
    const rawKey = (input as { apiKey?: unknown }).apiKey;
    const apiKey = typeof rawKey === "string" ? rawKey.trim().slice(0, 200) : "";
    return { messages: messages as ChatMsg[], apiKey };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey, generateContentUrl } = await import("./ai.server");
    const key = resolveApiKey(data.apiKey);

    const contents = data.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const url = generateContentUrl(key);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
      }),
    });


    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      if (res.status === 429) {
        return {
          reply:
            "Our AI assistant is a bit busy right now. You can wait a few minutes and try again, or add your own free Gemini API key in Settings for unlimited access.",
          kind: "rate_limit" as const,
        };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          reply: data.apiKey
            ? "That API key looks invalid or doesn't have access. Please check the key you saved in Settings."
            : "The app's AI key isn't working right now. You can add your own free Gemini key in Settings to keep going.",
          kind: "bad_key" as const,
        };
      }
      return {
        reply: `Sorry, the assistant is unavailable right now (error ${res.status}). Please try again in a moment.`,
        kind: "error" as const,
      };
    }


    const json = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      promptFeedback?: { blockReason?: string };
    };
    const candidate = json.candidates?.[0];
    const text =
      candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const finish = candidate?.finishReason;
    const blocked = json.promptFeedback?.blockReason;

    if (blocked) {
      return {
        reply:
          "I can't answer that one — it was blocked by the safety filter. Try rephrasing your question.",
        kind: "blocked" as const,
      };
    }

    if (finish === "SAFETY" || finish === "RECITATION") {
      return {
        reply:
          (text.trim() ? text.trim() + "\n\n" : "") +
          "_Response was stopped by the safety filter. Try rephrasing your question._",
        kind: "blocked" as const,
      };
    }

    if (finish === "MAX_TOKENS") {
      return {
        reply:
          (text.trim() || "…") +
          "\n\n_Response was cut off because it got too long. Tap Continue to keep going._",
        kind: "truncated" as const,
      };
    }

    if (!text.trim()) {
      return {
        reply:
          "Sorry, I couldn't come up with an answer. Tap retry or try rephrasing.",
        kind: "error" as const,
      };
    }

    return { reply: text.trim(), kind: "ok" as const };
  });

