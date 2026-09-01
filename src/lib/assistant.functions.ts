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
- If a topic is complex, break it into small steps.

ANSWER QUALITY:
- Structure longer answers with Markdown headings (\`##\` for the main idea, \`###\` for parts) and short bullet lists.
- Show your reasoning in clear ordered steps when solving or deriving something.
- Include at least one concrete example, worked calculation or everyday analogy where it helps understanding.
- End with a one-line takeaway when the answer is long.
- Use $...$ / $$...$$ for any math notation.`;

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
    const { resolveApiKey } = await import("./ai.server");
    const { callGeminiShared } = await import("./gemini.server");
    const key = resolveApiKey(data.apiKey);

    const contents = data.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // The shared client owns timeout / retry / logging. The assistant needs the
    // full conversation, so history is folded into the parts list.
    const res = await callGeminiShared({
      feature: "askAssistant",
      key,
      systemPrompt: SYSTEM_PROMPT,
      userProvidedKey: Boolean(data.apiKey),
      parts: contents.flatMap((c) => c.parts),
      history: contents,
      temperature: 0.6,
      maxOutputTokens: 6144,
    });

    if (!res.ok) {
      return { reply: res.message, kind: res.kind === "timeout" ? ("error" as const) : res.kind };
    }

    const text = res.text;

    if (res.blockReason) {
      return {
        reply:
          "I can't answer that one — it was blocked by the safety filter. Try rephrasing your question.",
        kind: "blocked" as const,
      };
    }

    if (res.finishReason === "SAFETY" || res.finishReason === "RECITATION") {
      return {
        reply:
          (text.trim() ? text.trim() + "\n\n" : "") +
          "_Response was stopped by the safety filter. Try rephrasing your question._",
        kind: "blocked" as const,
      };
    }

    if (res.finishReason === "MAX_TOKENS") {
      return {
        reply:
          (text.trim() || "\u2026") +
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
