import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles, KeyRound, ExternalLink, RotateCcw, ArrowDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { askAssistant } from "@/lib/assistant.functions";
import { getUserApiKey } from "@/lib/ai-config";
import { Markdown } from "@/components/notes/Markdown";
import { useStore, daysBetween, todayISO } from "@/lib/store";
import { useNotes } from "@/lib/notes-store";

type Msg = { role: "user" | "assistant"; content: string; kind?: string };



export const Route = createFileRoute("/assistant")({
  component: AssistantPage,
  head: () => ({
    meta: [
      { title: "AI Study Assistant — Matric Study Planner" },
      {
        name: "description",
        content:
          "Ask simple study questions and get clear, exam-friendly answers for Matric subjects.",
      },
      { property: "og:title", content: "AI Study Assistant" },
      {
        property: "og:description",
        content: "Your friendly Matric study helper — ask anything about your subjects.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSentRef = useRef<number>(0);
  const COOLDOWN_MS = 2500;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function runRequest(history: Msg[]) {
    setLoading(true);
    setCooldown(Math.ceil(COOLDOWN_MS / 1000));
    try {
      const res = await askAssistant({ data: { messages: history, apiKey: getUserApiKey() } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply, kind: res.kind }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Oops — I couldn't reach the assistant. Tap Retry to try again.",
          kind: "error",
        },
      ]);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const sinceLast = Date.now() - lastSentRef.current;
    if (sinceLast < COOLDOWN_MS) return;
    lastSentRef.current = Date.now();
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    await runRequest(next);
  }

  async function retryLast() {
    if (loading) return;
    // Drop trailing assistant messages until the last user message.
    let cutoff = messages.length;
    while (cutoff > 0 && messages[cutoff - 1].role === "assistant") cutoff--;
    if (cutoff === 0) return;
    const trimmed = messages.slice(0, cutoff);
    setMessages(trimmed);
    lastSentRef.current = Date.now();
    await runRequest(trimmed);
  }

  async function continueLast() {
    if (loading) return;
    const next: Msg[] = [...messages, { role: "user", content: "Please continue where you left off." }];
    setMessages(next);
    lastSentRef.current = Date.now();
    await runRequest(next);
  }

  const subjects = useStore((s) => s.subjects);
  const notes = useNotes((n) => n);
  const suggestions = useMemo(() => buildSuggestions(subjects, notes), [subjects, notes]);


  return (
    <AppShell title="Study Assistant" subtitle="Ask anything about your subjects">
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 220px)" }}>
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto pb-4"
          style={{ maxHeight: "calc(100vh - 260px)" }}
        >
          {messages.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Sparkles size={24} />
              </div>
              <p className="text-base font-semibold">Ask me anything about your subjects!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                I keep answers short and simple for Matric students.
              </p>
              <div className="mt-4 space-y-2 text-left">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground transition hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.kind === "rate_limit" || m.kind === "bad_key" ? (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <KeyRound size={18} />
                  </span>
                  <p className="text-sm leading-relaxed">{m.content}</p>
                </div>
                <Button asChild size="lg" className="mt-3 w-full rounded-xl text-sm font-bold">
                  <Link to="/settings">Add my own key in Settings</Link>
                </Button>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary underline"
                >
                  How to get a free key <ExternalLink size={12} />
                </a>
              </div>
            ) : (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "whitespace-pre-wrap bg-primary text-primary-foreground"
                      : "bg-card text-foreground border border-border"
                  }`}
                >
                  {m.role === "assistant" ? <Markdown>{m.content}</Markdown> : m.content}
                </div>
              </div>
            ),
          )}


          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                Thinking…
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-24 mt-2 flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask me anything about your subjects!"
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            onClick={send}
            disabled={loading || !input.trim() || cooldown > 0}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
            aria-label="Send message"
          >
            {cooldown > 0 && !loading ? (
              <span className="text-xs">{cooldown}</span>
            ) : (
              <Send size={18} />
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

const GENERIC_POOL = [
  "Explain Newton's laws simply",
  "Help me understand photosynthesis",
  "Tips for memorizing Urdu poetry",
  "Give me a quick study plan for tomorrow",
  "How do I stay focused while studying?",
  "Explain the water cycle in simple words",
  "Best way to memorize math formulas?",
  "Summarize World War II in 5 points",
];

type SubjectLike = { name: string; examDate?: string };
type NoteLike = { title: string; createdAt: string };

function buildSuggestions(subjects: SubjectLike[], notes: NoteLike[]): string[] {
  const pool: string[] = [];
  const today = todayISO();

  const upcomingExams = subjects
    .filter((s) => s.examDate && daysBetween(today, s.examDate) >= 0)
    .sort((a, b) => daysBetween(today, a.examDate!) - daysBetween(today, b.examDate!));

  for (const s of upcomingExams.slice(0, 3)) {
    const days = daysBetween(today, s.examDate!);
    pool.push(
      days <= 7
        ? `Help me prepare for my ${s.name} exam in ${days} day${days === 1 ? "" : "s"}`
        : `Help me prepare for my ${s.name} exam`,
    );
  }

  const recentNotes = [...notes]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 3);
  for (const n of recentNotes) {
    const topic = n.title.replace(/\.[^.]+$/, "").trim();
    if (topic) pool.push(`Explain "${topic}" simply`);
  }

  for (const s of subjects.slice(0, 3)) {
    pool.push(`Give me quick revision tips for ${s.name}`);
  }

  if (pool.length < 3) {
    for (const g of GENERIC_POOL) {
      if (!pool.includes(g)) pool.push(g);
      if (pool.length >= 8) break;
    }
  }

  // Rotate based on time so returning users see variety.
  const unique = Array.from(new Set(pool)).slice(0, 8);
  const bucket = Math.floor(Date.now() / (1000 * 60 * 60 * 6)); // rotates every 6h
  const start = unique.length ? bucket % unique.length : 0;
  return Array.from({ length: Math.min(3, unique.length) }, (_, i) => unique[(start + i) % unique.length]);
}

