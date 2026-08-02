import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  KeyRound,
  Loader2,
  ClipboardList,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { QuizView, type Difficulty } from "@/components/notes/QuizView";
import { BoardExamView } from "@/components/notes/BoardExamView";
import { getUserApiKey } from "@/lib/ai-config";
import { generateSectionTest } from "@/lib/section-test.functions";
import { useNotes, type Note } from "@/lib/notes-store";
import { parseBoardExam, parseQuiz, type BoardExam, type QuizQuestion } from "@/lib/notes-parse";
import { dedupeQuestions, loadAsked, rememberAsked } from "@/lib/quiz-dedupe";
import { strongTopics, weakTopics } from "@/lib/mastery";
import { cn } from "@/lib/utils";

type Search = { ids?: string };

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

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
          "Combine several of your notes into one longer practice test — quick MCQs or a full board exam style paper.",
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

  const [format, setFormat] = useState<"mcq" | "board">("mcq");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [exam, setExam] = useState<BoardExam | null>(null);
  const [error, setError] = useState<{ message: string; keyIssue: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const masteryScope = `test:${idKey}`;

  // Elapsed-time ticker so the user sees the app is working, not frozen.
  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  async function generate() {
    if (loading || !notes.length) return;
    setLoading(true);
    setError(null);
    setQuestions(null);
    setExam(null);
    const memoryKey = format === "board" ? `board:${idKey}` : `test:${idKey}`;
    try {
      const res = (await generateSectionTest({
        data: {
          notes: notes.map((n) => ({ title: n.title, content: n.content })),
          avoid: loadAsked(memoryKey),
          weak: weakTopics(masteryScope),
          strong: strongTopics(masteryScope),
          difficulty,
          format,
          apiKey: getUserApiKey(),
        },
      })) as
        | { ok: true; text: string }
        | { ok: false; kind: "rate_limit" | "bad_key" | "error"; message: string };
      if (!res.ok) {
        setError({ message: res.message, keyIssue: res.kind !== "error" });
        return;
      }

      if (format === "board") {
        const paper = parseBoardExam(res.text);
        if (!paper) {
          setError({
            message: "We couldn't build a board paper from these notes. Please try again.",
            keyIssue: false,
          });
          return;
        }
        // De-duplicate the MCQ section within itself and across past papers.
        const cleaned: BoardExam = {
          ...paper,
          sections: paper.sections.map((s) => ({
            ...s,
            questions: (() => {
              const mcqs = s.questions.filter((q) => q.type === "mcq");
              if (mcqs.length < 2) return s.questions;
              const kept = dedupeQuestions(mcqs, loadAsked(memoryKey));
              const keep = new Set((kept.length ? kept : mcqs).map((q) => q.question));
              return s.questions.filter((q) => q.type !== "mcq" || keep.has(q.question));
            })(),
          })),
        };
        rememberAsked(
          memoryKey,
          cleaned.sections.flatMap((s) => s.questions.map((q) => q.question)),
        );
        setExam(cleaned);
        setAttempt((a) => a + 1);
        return;
      }

      const all = parseQuiz(res.text);
      const fresh = dedupeQuestions(all, loadAsked(memoryKey));
      const parsed = fresh.length ? fresh : dedupeQuestions(all);
      if (!parsed.length) {
        setError({
          message: "We couldn't build a test from these notes. Try selecting different ones.",
          keyIssue: false,
        });
        return;
      }
      rememberAsked(memoryKey, parsed.map((q) => q.question));
      setQuestions(parsed);
      setAttempt((a) => a + 1);
    } catch (e) {
      console.error(e);
      setError({
        message: "Sorry, we couldn't build the test right now. Please try again.",
        keyIssue: false,
      });
    } finally {
      setLoading(false);
    }
  }

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
  const started = Boolean(questions || exam);
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
      title={format === "board" ? "Board Exam Paper" : "Full Section Test"}
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

      {!started && !loading && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <GraduationCap size={16} className="text-primary" /> Board Exam mode
          </p>
          <div className="mb-4 flex gap-1 rounded-full bg-muted p-1">
            {(
              [
                { id: "mcq" as const, label: "Quick MCQs" },
                { id: "board" as const, label: "Board paper" },
              ]
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setFormat(m.id)}
                aria-pressed={format === m.id}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition",
                  format === m.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            {format === "board"
              ? "A real board-style paper: Section A MCQs, Section B short questions and Section C long questions, with marks and a time limit."
              : "A single set of multiple-choice questions spread evenly across your notes."}
          </p>

          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Difficulty
          </p>
          <div className="mb-4 flex gap-1 rounded-full bg-muted p-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                aria-pressed={difficulty === d.id}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition",
                  difficulty === d.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>

          <Button size="lg" className="w-full rounded-xl text-sm font-bold" onClick={generate}>
            <Sparkles size={18} />
            {format === "board" ? "Generate board paper" : "Generate test"}
          </Button>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-border bg-card px-4 py-6">
          <div className="flex items-center gap-3">
            <Loader2 className="shrink-0 animate-spin text-primary" size={20} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                Building your {format === "board" ? "board paper" : "test"} from {notes.length} note
                {notes.length === 1 ? "" : "s"}…
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
          <Button size="lg" className="mt-3 w-full rounded-xl" onClick={generate}>
            Try again
          </Button>
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

      {questions && !loading && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <QuizView
            key={`q${attempt}`}
            questions={questions}
            regenerating={loading}
            onRegenerate={generate}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            masteryScope={masteryScope}
          />
        </section>
      )}

      {exam && !loading && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3">
            <h2 className="text-base font-bold leading-snug">{exam.title}</h2>
            <p className="text-xs text-muted-foreground">
              {exam.totalMarks} marks · {exam.timeLimitMinutes} minutes
              {exam.instructions ? ` · ${exam.instructions}` : ""}
            </p>
          </div>
          <BoardExamView
            key={`b${attempt}`}
            exam={exam}
            regenerating={loading}
            onRegenerate={generate}
            masteryScope={masteryScope}
          />
        </section>
      )}
    </AppShell>
  );
}
