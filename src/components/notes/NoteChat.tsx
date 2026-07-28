import { useEffect, useRef, useState } from "react";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/notes/Markdown";
import { askAboutNote } from "@/lib/note-chat.functions";
import { getUserApiKey } from "@/lib/ai-config";

type Msg = { role: "user" | "assistant"; content: string };

export function NoteChat({
  noteTitle,
  noteContent,
}: {
  noteTitle: string;
  noteContent: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = (await askAboutNote({
        data: {
          messages: next,
          noteContent,
          noteTitle,
          apiKey: getUserApiKey(),
        },
      })) as { reply: string; kind: "ok" | "rate_limit" | "bad_key" | "error" };
      if (res.kind !== "ok") setError(res.reply);
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      console.error(e);
      setError("Sorry, that didn't work. Please try again.");
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "Sorry, I couldn't answer just now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
          <MessageCircle size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold">Ask about this note</h2>
          <p className="truncate text-xs text-muted-foreground">
            Answers use this note as context.
          </p>
        </div>
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && !loading && (
          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            Try: <em>"Explain this in simple words"</em>,{" "}
            <em>"Why does this formula work?"</em>, or{" "}
            <em>"Give me a real-life example"</em>.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                : "mr-auto max-w-[92%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm"
            }
          >
            {m.role === "assistant" ? <Markdown>{m.content}</Markdown> : m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" size={14} /> Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mt-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask a question about this note…"
          disabled={loading}
          rows={1}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
        />
        <Button
          type="submit"
          size="icon"
          disabled={loading || !input.trim()}
          className="h-11 w-11 shrink-0 rounded-xl"
          aria-label="Send"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        </Button>
      </form>
    </section>
  );
}
