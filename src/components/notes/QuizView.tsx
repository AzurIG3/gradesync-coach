import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  X,
  RotateCw,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { recordResults } from "@/lib/mastery";
import type { QuizQuestion } from "@/lib/notes-parse";

export type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

type Breakdown = { topic: string; correct: number; total: number; pct: number };

function computeBreakdown(
  questions: QuizQuestion[],
  answers: number[],
): Breakdown[] {
  const map = new Map<string, { correct: number; total: number }>();
  questions.forEach((q, i) => {
    const t = q.topic?.trim() || "Other";
    const row = map.get(t) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (answers[i] === q.answerIndex) row.correct += 1;
    map.set(t, row);
  });
  return [...map.entries()]
    .map(([topic, r]) => ({
      topic,
      correct: r.correct,
      total: r.total,
      pct: r.total ? r.correct / r.total : 0,
    }))
    .sort((a, b) => b.pct - a.pct);
}

export function QuizView({
  questions,
  onRegenerate,
  regenerating,
  difficulty,
  onDifficultyChange,
  masteryScope,
}: {
  questions: QuizQuestion[];
  onRegenerate?: () => void;
  regenerating?: boolean;
  difficulty?: Difficulty;
  onDifficultyChange?: (d: Difficulty) => void;
  masteryScope?: string;
}) {

  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [review, setReview] = useState(false);
  const [showExplanations, setShowExplanations] = useState(true);
  const recordedRef = useRef(false);

  const hasTopics = useMemo(() => questions.some((q) => q.topic), [questions]);
  const hasExplanations = useMemo(() => questions.some((q) => q.explanation), [questions]);

  // Feed the mastery tracker once, as soon as the quiz is finished.
  useEffect(() => {
    if (!done || recordedRef.current || !masteryScope) return;
    recordedRef.current = true;
    recordResults(
      masteryScope,
      questions.map((q, idx) => ({
        topic: q.topic?.trim() || "General",
        correct: answers[idx] === q.answerIndex,
      })),
    );
  }, [done, masteryScope, questions, answers]);


  if (!questions.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn't build a quiz from this response. Try generating again.
      </p>
    );
  }

  const reset = () => {
    setI(0);
    setSelected(null);
    setAnswers([]);
    setDone(false);
    setReview(false);
    recordedRef.current = false;
  };

  const difficultyPicker =
    difficulty && onDifficultyChange ? (
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Difficulty
        </span>
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onDifficultyChange(d.id)}
              aria-pressed={difficulty === d.id}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold transition",
                difficulty === d.id
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    ) : null;


  if (done && !review) {
    const score = answers.reduce(
      (s, a, idx) => s + (a === questions[idx].answerIndex ? 1 : 0),
      0,
    );
    const pct = Math.round((score / questions.length) * 100);
    const breakdown = hasTopics ? computeBreakdown(questions, answers) : [];
    const strong = breakdown.filter((b) => b.pct >= 0.75);
    const weak = breakdown.filter((b) => b.pct < 0.5);
    const okay = breakdown.filter((b) => b.pct >= 0.5 && b.pct < 0.75);

    return (
      <div className="flex flex-col items-center py-4 text-center">
        <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Trophy size={30} />
        </span>
        <h3 className="text-lg font-bold">Quiz complete!</h3>
        <p className="mt-1 text-3xl font-black text-primary">
          {score}/{questions.length}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">You got {pct}% correct</p>

        {hasTopics && breakdown.length > 0 && (
          <div className="mt-6 w-full space-y-4 text-left">
            {strong.length > 0 && (
              <BreakdownGroup
                title="Strong"
                tone="success"
                icon={<TrendingUp size={16} />}
                items={strong}
              />
            )}
            {okay.length > 0 && (
              <BreakdownGroup
                title="Okay"
                tone="warning"
                icon={<Check size={16} />}
                items={okay}
              />
            )}
            {weak.length > 0 && (
              <BreakdownGroup
                title="Needs review"
                tone="danger"
                icon={<AlertTriangle size={16} />}
                items={weak}
              />
            )}
          </div>
        )}

        {hasExplanations && (
          <div className="mt-6 w-full text-left">
            <button
              type="button"
              onClick={() => setShowExplanations((v) => !v)}
              className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold transition hover:bg-muted"
            >
              {showExplanations ? <EyeOff size={13} /> : <Eye size={13} />}
              {showExplanations ? "Hide explanations" : "Show explanations"}
            </button>
            {showExplanations && (
              <ul className="space-y-2">
                {questions.map((qq, idx) => {
                  const right = answers[idx] === qq.answerIndex;
                  return (
                    <li key={idx} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-start gap-2">
                        {right ? (
                          <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                        ) : (
                          <X size={14} className="mt-0.5 shrink-0 text-rose-600" />
                        )}
                        <p className="text-xs font-bold leading-snug">{qq.question}</p>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {qq.options[qq.answerIndex]}
                        </span>
                        {qq.explanation ? ` — ${qq.explanation}` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}



        <div className="mt-6 flex w-full flex-col gap-2">
          <Button
            size="lg"
            className="w-full rounded-xl"
            onClick={() => {
              setReview(true);
              setI(0);
            }}
          >
            Review answers
          </Button>
          <Button variant="outline" size="lg" className="w-full rounded-xl" onClick={reset}>
            <RotateCw size={16} /> Retake quiz
          </Button>
          {onRegenerate && (
            <Button
              variant="secondary"
              size="lg"
              className="w-full rounded-xl"
              disabled={regenerating}
              onClick={onRegenerate}
            >
              <Sparkles size={16} />
              {regenerating ? "Generating new questions…" : "Generate New Set"}
            </Button>
          )}

        </div>
      </div>
    );
  }

  const q = questions[i];

  if (review) {
    const userPick = answers[i];
    return (
      <div>
        <div className="mb-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>
            Review {i + 1} of {questions.length}
          </span>
          <span className={cn(userPick === q.answerIndex ? "text-emerald-600" : "text-rose-600")}>
            {userPick === q.answerIndex ? "Correct" : "Incorrect"}
          </span>
        </div>
        {q.topic && (
          <p className="mb-2 text-xs font-semibold text-primary">From: {q.topic}</p>
        )}
        <h3 className="mb-4 text-base font-bold leading-snug">{q.question}</h3>
        <div className="flex flex-col gap-2">
          {q.options.map((opt, idx) => {
            const isRight = idx === q.answerIndex;
            const isPick = idx === userPick;
            return (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-3 rounded-xl border-2 p-3 text-left text-sm",
                  isRight && "border-emerald-500 bg-emerald-500/10",
                  !isRight && isPick && "border-rose-500 bg-rose-500/10",
                  !isRight && !isPick && "border-border bg-card",
                )}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{opt}</span>
                {isRight && <Check size={16} className="text-emerald-600" />}
                {!isRight && isPick && <X size={16} className="text-rose-600" />}
              </div>
            );
          })}
        </div>
        {q.explanation && (
          <p className="mt-3 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed">
            <span className="font-bold">Why: </span>
            {q.explanation}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            disabled={i === 0}
            onClick={() => setI(i - 1)}
          >
            Previous
          </Button>
          {i < questions.length - 1 ? (
            <Button className="flex-1 rounded-xl" onClick={() => setI(i + 1)}>
              Next
            </Button>
          ) : (
            <Button className="flex-1 rounded-xl" onClick={reset}>
              <RotateCw size={16} /> Retake
            </Button>
          )}
        </div>
      </div>
    );
  }

  const pick = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const nextAnswers = [...answers, idx];
    setAnswers(nextAnswers);
    setTimeout(() => {
      if (i === questions.length - 1) {
        setDone(true);
        setSelected(null);
      } else {
        setI(i + 1);
        setSelected(null);
      }
    }, 900);
  };

  return (
    <div>
      {difficultyPicker}

      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          Question {i + 1} of {questions.length}
        </span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${((i + 1) / questions.length) * 100}%` }}
            />
          </div>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] font-bold text-primary transition hover:bg-muted disabled:opacity-60"
            >
              <Sparkles size={12} />
              {regenerating ? "…" : "New set"}
            </button>
          )}
        </div>
      </div>


      {q.topic && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {q.topic}
        </p>
      )}
      <h3 className="mb-4 text-base font-bold leading-snug">{q.question}</h3>

      <div className="flex flex-col gap-2">
        {q.options.map((opt, idx) => {
          const isCorrect = idx === q.answerIndex;
          const isPicked = idx === selected;
          const showState = selected !== null;
          return (
            <button
              key={idx}
              type="button"
              disabled={showState}
              onClick={() => pick(idx)}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 p-3 text-left text-sm font-medium transition active:scale-[0.99]",
                !showState && "border-border bg-card hover:border-primary/60",
                showState && isCorrect && "border-emerald-500 bg-emerald-500/15",
                showState && isPicked && !isCorrect && "border-rose-500 bg-rose-500/15",
                showState && !isPicked && !isCorrect && "border-border bg-card opacity-60",
              )}
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1">{opt}</span>
              {showState && isCorrect && (
                <Check size={18} className="shrink-0 text-emerald-600" />
              )}
              {showState && isPicked && !isCorrect && (
                <X size={18} className="shrink-0 text-rose-600" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BreakdownGroup({
  title,
  tone,
  icon,
  items,
}: {
  title: string;
  tone: "success" | "warning" | "danger";
  icon: React.ReactNode;
  items: Breakdown[];
}) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  const barClasses =
    tone === "success" ? "bg-emerald-500" : tone === "warning" ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className={cn("rounded-2xl border-2 p-3", toneClasses)}>
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        {icon}
        {title}
      </div>
      <ul className="space-y-2">
        {items.map((b) => (
          <li key={b.topic}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate font-semibold text-foreground">{b.topic}</span>
              <span className="shrink-0 text-xs font-bold text-foreground">
                {b.correct}/{b.total}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/60">
              <div className={cn("h-full", barClasses)} style={{ width: `${b.pct * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
