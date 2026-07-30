import { createServerFn } from "@tanstack/react-start";
import { AI_API_BASE, AI_MODEL } from "./ai-config";

type ChatMsg = { role: "user" | "assistant"; content: string };

function isValidMsg(m: unknown): m is ChatMsg {
  if (!m || typeof m !== "object") return false;
  const r = (m as { role?: unknown }).role;
  const c = (m as { content?: unknown }).content;
  return (r === "user" || r === "assistant") && typeof c === "string";
}

function str(v: unknown, max = 200_000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

/** Chat grounded in a single note's extracted content. */
export const askAboutNote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    const noteContent = str(o.noteContent, 60_000);
    if (!noteContent.trim()) throw new Error("Missing note content");
    const messages = o.messages;
    if (!Array.isArray(messages) || !messages.every(isValidMsg)) {
      throw new Error("messages must be an array of {role, content}");
    }
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      throw new Error("Last message must be from the user");
    }
    return {
      noteContent,
      messages: messages as ChatMsg[],
      noteTitle: str(o.noteTitle, 200),
      apiKey: str(o.apiKey, 200).trim(),
    };
  })
  .handler(async ({ data }) => {
    const { resolveApiKey } = await import("./ai.server");
    const key = resolveApiKey(data.apiKey);

    const systemPrompt = `You are a friendly AI tutor for a Pakistani Matric (Grade 9-10) student. You are helping them understand ONE specific note they uploaded${
      data.noteTitle ? ` titled "${data.noteTitle}"` : ""
    }.

RULES:
- Base every answer on the note content provided below. If the answer is not in the note, say so briefly and give a short general Matric-level explanation only if it is directly related.
- Keep answers SHORT, SIMPLE, and easy for a Matric student. Short sentences, everyday words.
- Use Markdown: **bold** for key terms, small bullet lists or numbered steps when helpful.
- Do not invent facts that contradict the note.
- If the student asks something clearly off-topic (games, gossip, unrelated), gently steer back to the note in one sentence.

--- NOTE CONTENT START ---
${data.noteContent}
--- NOTE CONTENT END ---`;

    const contents = data.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Smart Notes always uses the flash tier.
    const url = `${AI_API_BASE}/models/${AI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Note chat error:", res.status, errText);
      if (res.status === 429) {
        return {
          reply:
            "Our AI is a bit busy right now. Please wait a moment or add your own free Gemini key in Settings.",
          kind: "rate_limit" as const,
        };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          reply: data.apiKey
            ? "That API key looks invalid. Please check the key in Settings."
            : "The app's AI key isn't working right now. Add your own free Gemini key in Settings.",
          kind: "bad_key" as const,
        };
      }
      return {
        reply: `Sorry, that didn't work (error ${res.status}). Please try again.`,
        kind: "error" as const,
      };
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return {
      reply: text.trim() || "Sorry, I couldn't answer that. Try rephrasing?",
      kind: "ok" as const,
    };
  });
