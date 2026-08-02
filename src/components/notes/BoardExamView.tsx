import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock, Eye, RotateCw, Sparkles, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { recordResults } from "@/lib/mastery";
import type { BoardExam, BoardQuestion } from "@/lib/notes-parse";

type Flat = { q: BoardQuestion; sectionName: string };

/** Self-marks for written answers: full, half or no marks. */
type SelfMark = "full" | "half" | "none";

const MARK_VALUE: Record<SelfMark, number> = { full: 1, half: 0.5, none: 0 };

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function BoardExamView({
  exam,
  onRegenerate,
  regenerating,
  masteryScope,
}: {
  exam: BoardExam;
  onRegenerate?: () => void;
  regenerating?: boolean;
  masteryScope?: string;
}) {
  const flat = useMemo<Flat[]>(
    () =>
      exam.sections.flatMap((s) => s.questions.map((q) => ({ q, sectionName: s.name }))),
    [exam],
  );

  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [written, setWritten] = useState<Record<number, string>>({});
  const [marks, setMarks] = useState<Record<number, SelfMark>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);
  const [left, setLeft] = useState(exam.timeLimitMinutes * 60);
  const recordedRef = useRef(false);

  // Exam clock — counts down, then hands the paper in automatically.
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          setDone(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [done]);

  const scored = useMemo(
    () =>
      flat.map((f, idx) => {
        if (f.q.type === "mcq") {
          const right = picks[idx] === f.q.answerIndex;
          return { ...f, earned: right ? f.q.marks : 0, right };
        }
        const mark = marks[idx] ?? "none";
        return { ...f, earned: f.q.marks * MARK_VALUE[mark], right: mark === "full" };
      }),
    [flat, picks, marks],
  );

  useEffect(() => {
    if (!done || recordedRef.current || !masteryScope) return;
    recordedRef.current = true;
    recordResults(
      masteryScope,
      scored.map((s) => ({ topic: s.q.topic?.trim() || "General", correct: s.right })),
    );
  }, [done, masteryScope, scored]);

  function reset() {
    setI(0);
    setPicks({});
    setWritten({});
    setMarks({});
    setRevealed({});
    setDone(false);
    setLeft(exam.timeLimitMinutes * 60);
    recordedRef.current = false;
  }

  if (!flat.length) {
    return (
      <p className="text-sm text-muted-foreground">
        This paper came back empty. Try generating it again.
      </p>
    );
  }

  if (done) {
    const earned = scored.reduce((s, q) => s + q.earned, 0);
    const total = scored.reduce((s, q) => s + q.q.marks, 0);
    const pct = total ? Math.round((earned / total) * 100) : 0;
    return (
      <div className="flex flex-col items-center py-2 text-center">
        <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Trophy size={30} />
        </span>
        <h3 className="text-lg font-bold">Paper finished!</h3>
        <p className="mt-1 text-3xl font-black text-primary">
          {earned % 1 === 0 ? earned : earned.toFixed(1)}/{total}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{pct}% of the total marks</p>

        <div className="mt-6 w-full space-y-4 text-left">
          {exam.sections.map((s) => {
            const rows = scored.filter((r) => r.sectionName === s.name);
            const got = rows.reduce((a, r) => a + r.earned, 0);
            const max = rows.reduce((a, r) => a + r.q.marks, 0);
            return (
              <div key={s.name} className="rounded-2xl border border-border bg-card p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-bold">{s.name}</p>
                  <span className="shrink-0 text-xs font-bold text-muted-foreground">
                    {got % 1 === 0 ? got : got.toFixed(1)}/{max}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${max ? (got / max) * 100 : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex w-full flex-col gap-2">
          <Button variant="outline" size="lg" className="w-full rounded-xl" onClick={reset}>
            <RotateCw size={16} /> Retake this paper
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
              {regenerating ? "Making a new paper…" : "New paper"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const current = flat[i];
  const q = current.q;
  const isLast = i === flat.length - 1;
  const showAnswer = revealed[i] ?? false;
  const canGoNext =
    q.type === "mcq" ? picks[i] !== undefined : (marks[i] ?? undefined) !== undefined;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-primary">
            {current.sectionName}
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            Question {i + 1} of {flat.length} · {q.marks} mark{q.marks === 1 ? "" : "s"}
          </p>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold tabular-nums",
            left < 60 ? "bg-rose-500/15 text-rose-600" : "bg-muted text-muted-foreground",
          )}
        >
          <Clock size={12} /> {mmss(left)}
        </span>
      </div>

      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((i + 1) / flat.length) * 100}%` }}
        />
      </div>

      <h3 className="mb-4 text-base font-bold leading-snug">{q.question}</h3>

      {q.type === "mcq" ? (
        <div className="flex flex-col gap-2">
          {q.options.map((opt, idx) => {
            const picked = picks[i] === idx;
            const isRight = idx === q.answerIndex;
            const answered = picks[i] !== undefined;
            return (
              <button
                key={idx}
                type="button"
                disabled={answered}
                onClick={() => setPicks((p) => ({ ...p, [i]: idx }))}
                className={cn(
                  "flex items-start gap-3 rounded-xl border-2 p-3 text-left text-sm font-medium transition active:scale-[0.99]",
                  !answered && "border-border bg-card hover:border-primary/60",
                  answered && isRight && "border-emerald-500 bg-emerald-500/15",
                  answered && picked && !isRight && "border-rose-500 bg-rose-500/15",
                  answered && !picked && !isRight && "border-border bg-card opacity-60",
                )}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{opt}</span>
                {answered && isRight && <Check size={18} className="shrink-0 text-emerald-600" />}
                {answered && picked && !isRight && (
                  <X size={18} className="shrink-0 text-rose-600" />
                )}
              </button>
            );
          })}
          {picks[i] !== undefined && q.explanation && (
            <p className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed">
              <span className="font-bold">Why: </span>
              {q.explanation}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={written[i] ?? ""}
            onChange={(e) => setWritten((w) => ({ ...w, [i]: e.target.value }))}
            rows={q.type === "long" ? 8 : 4}
            placeholder={
              q.type === "long"
                ? "Write your detailed answer here…"
                : "Write your short answer here…"
            }
            className="rounded-xl text-sm"
          />
          {!showAnswer ? (
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}
            >
              <Eye size={16} /> Show model answer
            </Button>
          ) : (
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Model answer
              </p>
              <p className="text-sm leading-relaxed">
                {q.modelAnswer ?? "No model answer was provided for this question."}
              </p>
              {q.keyPoints && q.keyPoints.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {q.keyPoints.map((k, idx) => (
                    <li key={idx}>{k}</li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs font-bold">How much did you get right?</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "full", label: "All of it" },
                    { id: "half", label: "Some of it" },
                    { id: "none", label: "Missed it" },
                  ] as { id: SelfMark; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMarks((s) => ({ ...s, [i]: m.id }))}
                    aria-pressed={marks[i] === m.id}
                    className={cn(
                      "rounded-xl border-2 px-2 py-2 text-xs font-bold transition",
                      marks[i] === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
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
        {isLast ? (
          <Button
            className="flex-1 rounded-xl"
            disabled={!canGoNext}
            onClick={() => setDone(true)}
          >
            Hand in paper
          </Button>
        ) : (
          <Button className="flex-1 rounded-xl" disabled={!canGoNext} onClick={() => setI(i + 1)}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
