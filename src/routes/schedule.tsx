import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, formatDateLong, todayISO, useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sparkles, Clock, CalendarDays } from "lucide-react";
import { useT } from "@/lib/i18n";
import { TrailSpine } from "@/components/PathProgress";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Study Schedule — Study Planner" },
      { name: "description", content: "Auto-generated daily study plan built around your exam dates." },
      { property: "og:title", content: "Study Schedule — Study Planner" },
      { property: "og:description", content: "Auto-generated daily study plan built around your exam dates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://sophia-odyssey.lovable.app/schedule" },
    ],
    links: [{ rel: "canonical", href: "https://sophia-odyssey.lovable.app/schedule" }],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { t, lang } = useT();
  const subjects = useStore((s) => s.subjects);
  const tasks = useStore((s) => s.tasks);
  const hours = useStore((s) => s.hoursPerDay);
  const today = todayISO();
  const locale = lang === "ur" ? "ur-PK" : undefined;

  const grouped = new Map<string, typeof tasks>();
  for (const t of [...tasks].sort((a, b) => a.date.localeCompare(b.date))) {
    if (t.date < today) continue;
    if (!grouped.has(t.date)) grouped.set(t.date, []);
    grouped.get(t.date)!.push(t);
  }

  return (
    <AppShell title={t("scheduleTitle")} subtitle={t("scheduleSubtitle")}>
      <Card className="mb-4 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Clock size={18} className="text-primary" /> {t("hoursPerDay")}
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((h) => (
            <button
              key={h}
              onClick={() => actions.setHoursPerDay(h)}
              className={`h-12 min-w-12 rounded-2xl px-4 text-base font-bold transition ${
                hours === h ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-foreground"
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
        <Label className="mt-4 block text-xs text-muted-foreground">{t("generateHint")}</Label>
        <div className="mt-3 flex gap-2">
          <Button className="h-12 flex-1 text-base" onClick={() => actions.regenerateSchedule()} disabled={subjects.length === 0}>
            <Sparkles size={18} /> {t("generatePlan")}
          </Button>
          {tasks.length > 0 && (
            <Button variant="outline" className="h-12" onClick={() => actions.clearSchedule()}>
              {t("clear")}
            </Button>
          )}
        </div>
      </Card>

      {subjects.length === 0 ? (
        <Card className="border-dashed bg-muted/40 p-8 text-center">
          <p className="font-semibold">{t("noSubjectsYet")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("noSubjectsBuild")}</p>
          <Link
            to="/subjects"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            {t("goToSubjects")}
          </Link>
        </Card>
      ) : grouped.size === 0 ? (
        <Card className="border-dashed bg-muted/40 p-8 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <CalendarDays size={28} />
          </div>
          <p className="font-semibold">{t("noPlanYet")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("noPlanHint")}</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {[...grouped.entries()].map(([date, items]) => (
            <section key={date} className="flex gap-3">
              {/* Journey motif: a dotted trail runs down the timeline */}
              <TrailSpine active={date === today} />
              <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-display text-lg font-semibold">
                  {date === today ? t("today") : formatDateLong(date, locale)}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {t("doneOfTotal", { done: items.filter((i) => i.done).length, total: items.length })}
                </span>
              </div>
              <ul className="space-y-2">
                {items.map((tk) => {
                  const sub = subjects.find((s) => s.id === tk.subjectId);
                  const topic = sub?.topics.find((tp) => tp.id === tk.topicId);
                  if (!sub || !topic) return null;
                  return (
                    <li key={tk.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
                        <Checkbox
                          checked={tk.done}
                          onCheckedChange={() => actions.toggleTask(tk.id)}
                          className="h-6 w-6"
                        />
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: sub.color }} />
                        <div className="min-w-0 flex-1">
                          <div className={`truncate font-semibold ${tk.done ? "text-muted-foreground line-through" : ""}`}>
                            {topic.name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{sub.name}</div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
