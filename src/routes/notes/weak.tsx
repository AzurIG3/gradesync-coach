import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { QuizView, type Difficulty } from "@/components/notes/QuizView";
import { allMasteryStats } from "@/lib/mastery";
import { useNotes } from "@/lib/notes-store";
import { parseQuiz, type QuizQuestion } from "@/lib/notes-parse";
import { dedupeQuestions, loadAsked, rememberAsked } from "@/lib/quiz-dedupe";
import { generateWeakSpotQuiz } from "@/lib/ai-extra.functions";
import { getUserApiKey } from "@/lib/ai-config";
import { cn } from "@/lib/utils";
import { withPageBoundary } from "@/components/PageErrorBoundary";

const TITLE = "Quiz My Weak Spots — Sophia Odyssey";
const DESC =
  "Practise the topics you keep getting wrong, pulled from your own notes and quiz history.";
const SCOPE = "weak-spots";

export const Route = createFileRoute("/notes/weak")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://sophia-odyssey.lovable.app/notes/weak" },
    ],
    links: [{ rel: "canonical", href: "https://sophia-odyssey.lovable.app/notes/weak" }],
  }),
  component: withPageBoundary(WeakSpotsPage, "weak-spots"),
});

const DIFFS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

function WeakSpotsPage() {
  const notes = useNotes((n) => n);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gen, setGen] = useState(0);

  // Weakest tracked topics across every subject and note.
  const weak = useMemo(
    () =>
      allMasteryStats()
        .filter((s) => s.total >= 1 && s.pct < 0.8)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 6),
    [],
  );

  const context = useMemo(() => {
    if (!weak.length || !notes.length) return "";
    const needles = weak.map((w) => w.topic.toLowerCase());
    const relevant = notes.filter((n) =>
      needles.some(
        (t) =>
          n.title.toLowerCase().includes(t) ||
          n.chapter?.toLowerCase().includes(t) ||
          n.content.toLowerCase().includes(t),
      ),
    );
    const pool = (relevant.length ? relevant : notes).slice(0, 5);
    const budget = Math.floor(20_000 / Math.max(1, pool.length));
    return pool
      .map((n) => `=== ${n.title} ===\n${n.content.slice(0, budget)}`)
      .join("\n\n");
  }, [notes, weak]);

  async function build() {
    setLoading(true);
    setError("");
    try {
      const res = await generateWeakSpotQuiz({
        data: {
          topics: weak.map((w) => w.topic),
          scores: weak.map((w) => `${w.topic}: ${w.correct}/${w.total}`),
          context,
          difficulty,
          avoid: loadAsked(SCOPE),
          apiKey: getUserApiKey(),
        },
      });
      if (!res.ok) {
        setError(res.message ?? "Couldn't build that quiz right now.");
        return;
      }
      const fresh = dedupeQuestions(parseQuiz(res.text), loadAsked(SCOPE));
      if (!fresh.length) {
        setError("The AI didn't return any new questions. Please try again.");
        return;
      }
      rememberAsked(
        SCOPE,
        fresh.map((q) => q.question),
      );
      setQuestions(fresh);
      setGen((g) => g + 1);
    } catch {
      setError("Couldn't reach the AI right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Quiz my weak spots" subtitle="Targeted practice from your weakest topics">
      <Link
        to="/progress"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft size={16} /> Back to progress
      </Link>

      {weak.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <p className="font-semibold">No weak spots tracked yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Take a quiz or a full section test first — we'll then build practice from the topics you
            keep missing.
          </p>
          <Button asChild className="mt-4 rounded-xl">
            <Link to="/notes">Go to Smart Notes</Link>
          </Button>
        </section>
      ) : questions ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <QuizView
            key={`w${gen}`}
            questions={questions}
            regenerating={loading}
            onRegenerate={build}
            difficulty={difficulty}
            onDifficultyChange={(d) => {
              setDifficulty(d);
              void build();
            }}
            masteryScope={SCOPE}
          />
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">Your weakest topics</h2>
          <ul className="mt-3 space-y-2">
            {weak.map((w) => (
              <li
                key={w.topic}
                className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-semibold">{w.topic}</span>
                <span className="shrink-0 text-xs font-bold text-muted-foreground">
                  {w.correct}/{w.total}
                </span>
              </li>
            ))}
          </ul>

          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Difficulty
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DIFFS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                className={cn(
                  "rounded-xl border py-2.5 text-xs font-bold transition",
                  difficulty === d.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>

          {error ? (
            <p className="mt-3 text-sm font-semibold text-destructive">{error}</p>
          ) : null}

          <Button
            size="lg"
            className="mt-4 w-full rounded-2xl py-6 text-base font-bold"
            disabled={loading}
            onClick={build}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Building your practice quiz…
              </>
            ) : (
              <>
                <Target size={20} /> Generate weak-spot quiz
              </>
            )}
          </Button>
        </section>
      )}
    </AppShell>
  );
}
