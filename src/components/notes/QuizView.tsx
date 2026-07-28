import { useState } from "react";
import { Check, X, RotateCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/notes-parse";

export function QuizView({ questions }: { questions: QuizQuestion[] }) {
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [review, setReview] = useState(false);

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
  };

  if (done && !review) {
    const score = answers.reduce(
      (s, a, idx) => s + (a === questions[idx].answerIndex ? 1 : 0),
      0,
    );
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Trophy size={30} />
        </span>
        <h3 className="text-lg font-bold">Quiz complete!</h3>
        <p className="mt-1 text-3xl font-black text-primary">
          {score}/{questions.length}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          You got {pct}% correct
        </p>
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
          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-xl"
            onClick={reset}
          >
            <RotateCw size={16} /> Retake quiz
          </Button>
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
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          Question {i + 1} of {questions.length}
        </span>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((i + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

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
