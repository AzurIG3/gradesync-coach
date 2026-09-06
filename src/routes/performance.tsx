import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, Clock, Timer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { withPageBoundary } from "@/components/PageErrorBoundary";
import {
  byFeature,
  clearAiCalls,
  featureLabel,
  formatMs,
  summarise,
  useAiCalls,
} from "@/lib/ai-metrics";

export const Route = createFileRoute("/performance")({
  component: withPageBoundary(PerformancePage, "performance"),
  head: () => ({
    meta: [
      { title: "AI performance — Matric Study Planner" },
      {
        name: "description",
        content:
          "See how many of your notes requests succeeded, timed out or failed, plus the average time each one took.",
      },
      { property: "og:title", content: "AI performance — Matric Study Planner" },
      {
        property: "og:description",
        content: "A simple dashboard of successes, timeouts, failures and average response time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-primary"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "bad"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <span className={`flex items-center gap-1.5 text-xs font-semibold ${color}`}>
        <Icon size={14} /> {label}
      </span>
      <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
    </div>
  );
}

function PerformancePage() {
  const calls = useAiCalls();
  const s = summarise(calls);
  const groups = byFeature(calls);
  const recent = calls.slice(0, 12);

  return (
    <AppShell
      title="AI performance"
      subtitle="How your last few hundred AI requests actually behaved on this device."
    >
      <div className="space-y-4">
        <Button variant="ghost" className="h-10 px-2" asChild>
          <Link to="/settings">
            <ArrowLeft size={18} /> Back to settings
          </Link>
        </Button>

        {s.total === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Activity size={22} />
            </span>
            <h2 className="text-base font-bold">Nothing measured yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a note or make a summary, and every request will show up here.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={CheckCircle2} label="Succeeded" value={`${s.ok}`} tone="good" />
              <Stat icon={Timer} label="Timed out" value={`${s.timeout}`} tone="warn" />
              <Stat icon={AlertTriangle} label="Failed" value={`${s.error}`} tone="bad" />
              <Stat icon={Clock} label="Average time" value={formatMs(s.avgMs)} />
            </div>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-base font-bold">Overall</h2>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${s.successRate}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {s.successRate}% of {s.total} request{s.total === 1 ? "" : "s"} worked first time.
                Successful ones took {formatMs(s.avgOkMs)} on average; the slowest took{" "}
                {formatMs(s.slowestMs)}.
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-base font-bold">By feature</h2>
              <div className="-mx-1 overflow-x-auto">
                <table className="min-w-[30rem] text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="px-2 py-1.5">Feature</th>
                      <th className="px-2 py-1.5">Done</th>
                      <th className="px-2 py-1.5">Timed out</th>
                      <th className="px-2 py-1.5">Failed</th>
                      <th className="px-2 py-1.5">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(({ feature, summary }) => (
                      <tr key={feature} className="border-t border-border">
                        <td className="px-2 py-2 font-semibold">{featureLabel(feature)}</td>
                        <td className="px-2 py-2 font-mono">{summary.ok}</td>
                        <td className="px-2 py-2 font-mono">{summary.timeout}</td>
                        <td className="px-2 py-2 font-mono">{summary.error}</td>
                        <td className="px-2 py-2 font-mono">{formatMs(summary.avgMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="sm:hidden mt-2 text-xs text-muted-foreground">
                Swipe the table sideways to see all columns →
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-base font-bold">Most recent</h2>
              <ul className="space-y-2">
                {recent.map((c, i) => (
                  <li
                    key={`${c.at}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate font-semibold">{featureLabel(c.feature)}</span>
                    <span className="flex shrink-0 items-center gap-2 font-mono text-xs">
                      <span
                        className={
                          c.outcome === "ok"
                            ? "text-primary"
                            : c.outcome === "timeout"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-destructive"
                        }
                      >
                        {c.outcome === "ok" ? "done" : c.outcome === "timeout" ? "timed out" : "failed"}
                      </span>
                      <span className="text-muted-foreground">{formatMs(c.ms)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                variant="ghost"
                className="mt-3 h-9 px-2 text-xs text-destructive"
                onClick={() => clearAiCalls()}
              >
                Clear history
              </Button>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
