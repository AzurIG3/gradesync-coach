import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, TrendingDown, TrendingUp, Clock, CalendarCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatHours, weeklyInsights, type WeeklyInsights as Insights } from "@/lib/insights";
import { subscribeSessions } from "@/lib/sessions";

/** This week at a glance: study time, consistency, strongest & weakest topic. */
export function WeeklyInsights({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<Insights | null>(null);

  useEffect(() => {
    const refresh = () => setData(weeklyInsights());
    refresh();
    return subscribeSessions(refresh);
  }, []);

  if (!data) return null;

  if (!data.hasData) {
    return (
      <Card className="border-dashed bg-muted/40 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Sparkles size={16} className="text-primary" /> Weekly insights
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Finish a focus session or a quiz and your weekly summary will appear here.
        </p>
      </Card>
    );
  }

  const up = (data.deltaPct ?? 0) >= 0;

  return (
    <Card className="border-0 bg-gradient-to-br from-secondary to-accent/50 p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Sparkles size={16} className="text-primary" /> Weekly insights
        </h2>
        {data.deltaPct !== null && (
          <span
            className={`flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-bold ${
              up ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {up ? "+" : ""}
            {data.deltaPct}% vs last week
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-background/70 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <Clock size={12} /> Study time
          </div>
          <div className="mt-0.5 text-lg font-black">{formatHours(data.focusMinutes)}</div>
        </div>
        <div className="rounded-xl bg-background/70 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <CalendarCheck size={12} /> Active days
          </div>
          <div className="mt-0.5 text-lg font-black">{data.activeDays}/7</div>
        </div>
      </div>

      {!compact && (
        <p className="mt-2 text-xs text-muted-foreground">
          {data.sessions} focus {data.sessions === 1 ? "session" : "sessions"} · {data.tasks} tasks
          ticked off
        </p>
      )}

      {(data.strongest || data.weakest) && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {data.strongest && (
            <li>
              <span className="font-bold text-primary">Strongest:</span> {data.strongest.topic} (
              {Math.round(data.strongest.pct * 100)}%)
            </li>
          )}
          {data.weakest && data.weakest.topic !== data.strongest?.topic && (
            <li>
              <span className="font-bold">Needs review:</span> {data.weakest.topic} (
              {Math.round(data.weakest.pct * 100)}%)
            </li>
          )}
        </ul>
      )}

      {data.weakest && (
        <Link
          to="/notes/weak"
          className="mt-3 inline-flex text-xs font-bold text-primary underline"
        >
          Practise my weak spots
        </Link>
      )}
    </Card>
  );
}
