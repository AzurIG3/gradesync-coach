import { useMemo, useState } from "react";
import { Brain, RotateCcw, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { allMasteryStats, clearAllMastery } from "@/lib/mastery";
import { cn } from "@/lib/utils";

function tone(pct: number) {
  if (pct >= 0.8) return { bar: "bg-emerald-500", label: "Strong", text: "text-emerald-600" };
  if (pct >= 0.5) return { bar: "bg-amber-500", label: "Getting there", text: "text-amber-600" };
  return { bar: "bg-rose-500", label: "Needs review", text: "text-rose-600" };
}

/**
 * Visible mastery screen: every topic the student has been quizzed on across
 * notes quizzes, section tests and board papers — weakest first.
 */
export function MasteryPanel() {
  const [gen, setGen] = useState(0);
  const stats = useMemo(() => allMasteryStats(), [gen]);

  const answered = stats.reduce((s, r) => s + r.total, 0);
  const correct = stats.reduce((s, r) => s + r.correct, 0);
  const overall = answered ? Math.round((correct / answered) * 100) : 0;

  if (!stats.length) {
    return (
      <Card className="mt-6 border-dashed bg-muted/40 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Brain size={24} />
        </div>
        <p className="font-semibold">No mastery data yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Finish a quiz or a section test and your strongest and weakest topics will show up here.
        </p>
      </Card>
    );
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Brain size={18} className="text-primary" /> Mastery by topic
          </h2>
          <p className="text-xs text-muted-foreground">
            {correct}/{answered} questions correct ({overall}%) across {stats.length} topic
            {stats.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 rounded-xl text-xs"
          onClick={() => {
            clearAllMastery();
            setGen((g) => g + 1);
          }}
        >
          <RotateCcw size={13} /> Reset
        </Button>
      </div>

      <ul className="space-y-2">
        {stats.map((s) => {
          const t = tone(s.pct);
          return (
            <li key={s.topic} className="rounded-2xl border border-border bg-card p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-bold">{s.topic}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs font-bold">
                  <span className={cn(t.text)}>{Math.round(s.pct * 100)}%</span>
                  <span className="text-muted-foreground">
                    {s.correct}/{s.total}
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full", t.bar)} style={{ width: `${s.pct * 100}%` }} />
              </div>
              <p className={cn("mt-1 flex items-center gap-1 text-[11px] font-semibold", t.text)}>
                <TrendingUp size={11} /> {t.label}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
