import { useMemo, useSyncExternalStore } from "react";
import { Flame, Clock, CheckCircle2 } from "lucide-react";
import { activityByDay, sessionTotals, subscribeSessions, type DayActivity } from "@/lib/sessions";
import { cn } from "@/lib/utils";

const LEVEL_CLASS: Record<number, string> = {
  0: "bg-muted",
  1: "bg-primary/25",
  2: "bg-primary/45",
  3: "bg-primary/70",
  4: "bg-primary",
};

function useActivity(days: number) {
  const version = useSyncExternalStore(
    subscribeSessions,
    () => localStorage.getItem("sophia.sessions.v1") ?? "",
    () => "",
  );
  return useMemo(() => {
    void version;
    return { days: activityByDay(days), totals: sessionTotals() };
  }, [version, days]);
}

function label(d: DayActivity): string {
  const bits: string[] = [];
  if (d.focusMinutes) bits.push(`${d.focusMinutes} min focus`);
  if (d.tasks) bits.push(`${d.tasks} task${d.tasks === 1 ? "" : "s"}`);
  return `${d.date}: ${bits.length ? bits.join(", ") : "no study activity"}`;
}

/** Calendar heatmap of completed focus sessions and tasks. */
export function StudyHeatmap({ days = 182 }: { days?: number }) {
  const { days: rows, totals } = useActivity(days);

  // Split into week columns starting on Sunday.
  const weeks = useMemo(() => {
    const out: (DayActivity | null)[][] = [];
    let week: (DayActivity | null)[] = [];
    rows.forEach((d, idx) => {
      const dow = new Date(`${d.date}T00:00:00`).getDay();
      if (idx === 0) week = Array.from({ length: dow }, () => null);
      week.push(d);
      if (week.length === 7) {
        out.push(week);
        week = [];
      }
    });
    if (week.length) {
      while (week.length < 7) week.push(null);
      out.push(week);
    }
    return out;
  }, [rows]);

  const monthLabels = useMemo(
    () =>
      weeks.map((w) => {
        const first = w.find(Boolean);
        if (!first) return "";
        const d = new Date(`${first.date}T00:00:00`);
        return d.getDate() <= 7 ? d.toLocaleDateString(undefined, { month: "short" }) : "";
      }),
    [weeks],
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-bold">Study session history</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Every completed focus session and finished task, over the last {Math.round(days / 30)} months.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat icon={Clock} value={`${Math.round(totals.focusMinutes / 60)}h`} label="Focus time" />
        <Stat icon={CheckCircle2} value={String(totals.tasks)} label="Tasks done" />
        <Stat icon={Flame} value={String(totals.activeDays)} label="Active days" />
      </div>

      <div className="mt-4 -mx-1 overflow-x-auto px-1 pb-1">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-1">
            {monthLabels.map((m, i) => (
              <span key={i} className="w-3 text-[9px] font-bold text-muted-foreground">
                {m}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            {weeks.map((w, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {w.map((d, di) =>
                  d ? (
                    <span
                      key={di}
                      title={label(d)}
                      aria-label={label(d)}
                      className={cn("h-3 w-3 rounded-[3px]", LEVEL_CLASS[d.level])}
                    />
                  ) : (
                    <span key={di} className="h-3 w-3 rounded-[3px] bg-transparent" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] font-semibold text-muted-foreground">
        Less
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={cn("h-3 w-3 rounded-[3px]", LEVEL_CLASS[l])} />
        ))}
        More
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  value,
  label: text,
}: {
  icon: typeof Clock;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <Icon size={16} className="mx-auto mb-1 text-primary" />
      <div className="text-lg font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-[11px] font-semibold text-muted-foreground">{text}</div>
    </div>
  );
}
