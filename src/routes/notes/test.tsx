import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, KeyRound, Loader2, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { QuizView } from "@/components/notes/QuizView";
import { getUserApiKey } from "@/lib/ai-config";
import { generateSectionTest } from "@/lib/section-test.functions";
import { useNotes, type Note } from "@/lib/notes-store";
import { parseQuiz, type QuizQuestion } from "@/lib/notes-parse";

type Search = { ids?: string };

export const Route = createFileRoute("/notes/test")({
  component: SectionTestPage,
  validateSearch: (s: Record<string, unknown>): Search => ({
    ids: typeof s.ids === "string" ? s.ids : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Full Section Test — Matric Study Planner" },
      {
        name: "description",
        content:
          "Combine several of your notes into one longer practice test with a per-note breakdown of what to revise.",
      },
      { property: "og:title", content: "Full Section Test — Matric Study Planner" },
      {
        property: "og:description",
        content: "One longer quiz built from multiple notes, with per-note results.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SectionTestPage() {
  const { ids } = Route.useSearch();
  const navigate = useNavigate();
  const idKey = ids ?? "";
  const idList = useMemo<string[]>(() => idKey.split(",").filter(Boolean), [idKey]);
  const allNotes = useNotes<Note[]>((all: Note[]) => all);
  const notes = useMemo<Note[]>(
    () =>
      idList
        .map((id: string) => allNotes.find((n: Note) => n.id === id))
        .filter((n: Note | undefined): n is Note => Boolean(n)),
    [idList, allNotes],
  );



  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [error, setError] = useState<{ message: string; keyIssue: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Elapsed-time ticker so the user sees the app is working, not frozen.
  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!notes.length) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setQuestions(null);
      try {
        const res = (await generateSectionTest({
          data: {
            notes: notes.map((n) => ({ title: n.title, content: n.content })),
            apiKey: getUserApiKey(),
          },
        })) as
          | { ok: true; text: string }
          | { ok: false; kind: "rate_limit" | "bad_key" | "error"; message: string };
        if (cancelled) return;
        if (!res.ok) {
          setError({ message: res.message, keyIssue: res.kind !== "error" });
          return;
        }
        const parsed = parseQuiz(res.text);
        if (!parsed.length) {
          setError({
            message: "We couldn't build a test from these notes. Try selecting different ones.",
            keyIssue: false,
          });
          return;
        }
        setQuestions(parsed);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError({
            message: "Sorry, we couldn't build the test right now. Please try again.",
            keyIssue: false,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, notes]);

  if (!idList.length || !notes.length) {
    return (
      <AppShell title="Section Test" subtitle="No notes selected">
        <p className="mb-4 text-sm text-muted-foreground">
          Pick two or more notes from Smart Notes to build a combined test.
        </p>
        <Button asChild size="lg" className="w-full rounded-xl">
          <Link to="/notes">Go to Smart Notes</Link>
        </Button>
      </AppShell>
    );
  }

  const totalChars = notes.reduce((s, n) => s + n.content.length, 0);
  const progressStage =
    elapsed < 6
      ? "Reading your notes…"
      : elapsed < 18
        ? "Thinking up good questions…"
        : elapsed < 40
          ? "Almost there — writing the last few…"
          : "Just a bit longer, hang tight…";

  return (
    <AppShell
      title="Full Section Test"
      subtitle={`${notes.length} notes combined`}
      hideAssistantFab
    >
      <Link
        to="/notes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft size={16} /> Back to notes
      </Link>

      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <ClipboardList size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">Testing you on</p>
            <p className="text-xs text-muted-foreground">
              You'll get a per-note breakdown at the end.
            </p>
          </div>
        </div>
        <ul className="mt-2 space-y-1 text-sm">
          {notes.map((n) => (
            <li key={n.id} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span className="truncate">{n.title}</span>
            </li>
          ))}
        </ul>
      </div>

      {loading && (
        <div className="rounded-2xl border border-border bg-card px-4 py-6">
          <div className="flex items-center gap-3">
            <Loader2 className="shrink-0 animate-spin text-primary" size={20} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                Building your test from {notes.length} note{notes.length === 1 ? "" : "s"}…
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {progressStage} This can take up to a minute for large notes.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] font-bold tabular-nums text-muted-foreground">
              {elapsed}s
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(95, (elapsed / 60) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {(totalChars / 1000).toFixed(0)}k characters of study material · one combined AI request
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full rounded-xl"
            disabled
          >
            Working…
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <KeyRound size={18} />
            </span>
            <p className="text-sm leading-relaxed">{error.message}</p>
          </div>
          {error.keyIssue && (
            <>
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
            </>
          )}
          <Button
            variant="outline"
            size="lg"
            className="mt-3 w-full rounded-xl"
            onClick={() => navigate({ to: "/notes" })}
          >
            Back to notes
          </Button>
        </div>
      )}

      {questions && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <QuizView questions={questions} />
        </section>
      )}
    </AppShell>
  );
}
