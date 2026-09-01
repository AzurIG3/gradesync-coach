import { createServerFn } from "@tanstack/react-start";

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
    const { callGeminiShared } = await import("./gemini.server");
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

    // Smart Notes always uses the flash tier; shared client handles the rest.
    const res = await callGeminiShared({
      feature: "askAboutNote",
      key,
      systemPrompt,
      userProvidedKey: Boolean(data.apiKey),
      parts: contents.flatMap((c) => c.parts),
      history: contents,
      temperature: 0.4,
      maxOutputTokens: 900,
    });

    if (!res.ok) {
      return { reply: res.message, kind: res.kind === "timeout" ? ("error" as const) : res.kind };
    }
    return {
      reply: res.text.trim() || "Sorry, I couldn't answer that. Try rephrasing?",
      kind: "ok" as const,
    };
  });
