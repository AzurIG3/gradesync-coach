import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, currentStreak, daysBetween, formatDateLong, todayISO, useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarClock, Plus, Sparkles, BookOpen, Timer, Flame } from "lucide-react";
import { useT } from "@/lib/i18n";
import { DottedTrail } from "@/components/PathProgress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://sophia-odyssey.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://sophia-odyssey.lovable.app/" }],
  }),
  component: Home,
});

const QUOTES_EN = [
  "Small steps every day beat cramming any day.",
  "You don't have to be perfect — just keep going.",
  "One topic at a time. You've got this.",
  "Progress, not pressure.",
  "Study smart. Rest well. Repeat.",
];
const QUOTES_UR = [
  "روز کے چھوٹے قدم ایک ہی دن کی رٹنے سے بہتر ہیں۔",
  "کامل ہونا ضروری نہیں — بس چلتے رہو۔",
  "ایک وقت میں ایک باب۔ آپ کر سکتے ہیں۔",
  "دباؤ نہیں، پیش رفت۔",
  "سمجھ کر پڑھو۔ اچھی نیند لو۔ دہراؤ۔",
];

function Home() {
  const { t, lang } = useT();
  const subjects = useStore((s) => s.subjects);
  const tasks = useStore((s) => s.tasks);
  const streak = useStore(currentStreak);
  const today = todayISO();

  const upcoming = [...subjects]
    .filter((s) => daysBetween(today, s.examDate) >= 0)
    .sort((a, b) => a.examDate.localeCompare(b.examDate))[0];

  const todaysTasks = tasks.filter((t) => t.date === today);
  const tomorrow = tasks.filter((t) => t.date === addDay(today, 1));
  const quotes = lang === "ur" ? QUOTES_UR : QUOTES_EN;
  const quote = quotes[new Date().getDate() % quotes.length];
  const locale = lang === "ur" ? "ur-PK" : undefined;
  // The server and the phone can be on different dates/timezones, so only
  // render the formatted date after hydration to avoid a mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <AppShell title={t("hello")} subtitle={mounted ? formatDateLong(today, locale) : undefined}>
      {streak > 0 && (
        <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-gold/40 bg-gold/15 px-4 py-1.5 text-sm font-bold text-foreground">
          <Flame size={16} className="text-gold" />
          {t("streak", { n: streak })}
          <DottedTrail total={7} filled={Math.min(streak, 7)} />
        </div>
      )}

      {/* Exam countdown hero */}
      <Card className="journey-gradient mb-4 overflow-hidden border-0 p-6 text-primary-foreground shadow-lift">
        <div className="flex items-center gap-2 text-sm font-semibold opacity-90">
          <CalendarClock size={18} /> {t("nextExam")}
        </div>
        {upcoming ? (
          <div className="mt-2">
            <div className="text-2xl font-extrabold">{upcoming.name}</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-5xl font-black leading-none">
                {Math.max(0, daysBetween(today, upcoming.examDate))}
              </span>
              <span className="text-lg font-semibold opacity-90">{t("daysToGo")}</span>
            </div>
            <div className="mt-1 text-sm opacity-90">{formatDateLong(upcoming.examDate, locale)}</div>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-base opacity-95">{t("noExamsYet")}</p>
            <Link
              to="/subjects"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-primary-foreground/30"
            >
              <Plus size={18} /> {t("addSubjectAction")}
            </Link>
          </div>
        )}
      </Card>

      {/* Start Study Session */}
      <Link
        to="/timer"
        className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-card p-4 shadow-sm active:scale-[0.99]"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Timer size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold">{t("startSession")}</div>
          <div className="truncate text-xs text-muted-foreground">{t("startSessionHint")}</div>
        </div>
        <span className="text-xl text-muted-foreground">›</span>
      </Link>

      {tomorrow.length > 0 && (
        <div className="mb-4 rounded-2xl border border-warning/40 bg-warning/15 px-4 py-3 text-sm">
          <span className="font-bold">{t("headsUp")}</span>{" "}
          {t(tomorrow.length === 1 ? "tomorrowTasks" : "tomorrowTasksPlural", { n: tomorrow.length })}
        </div>
      )}

      {/* Today's tasks */}
      <section className="mb-4">
        <h2 className="mb-3 font-display text-xl font-semibold">{t("todaysTasks")}</h2>
        {todaysTasks.length === 0 ? (
          <Card className="border-dashed bg-muted/40 p-6 text-center">
            <p className="text-sm text-muted-foreground">{t("noTasksToday")}</p>
            <Link
              to="/schedule"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              <Sparkles size={16} /> {t("makeMyPlan")}
            </Link>
          </Card>
        ) : (
          <ul className="space-y-2">
            {todaysTasks.map((tk) => {
              const sub = subjects.find((s) => s.id === tk.subjectId);
              const topic = sub?.topics.find((tp) => tp.id === tk.topicId);
              if (!sub || !topic) return null;
              return (
                <li key={tk.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm active:scale-[0.99]">
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
        )}
      </section>

      <div className="mb-4">
        <WeeklyInsights compact />
      </div>

      {/* Quote */}
      <Card className="border-0 bg-gradient-to-br from-secondary to-accent/60 p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card/70">
            <BookOpen size={20} className="text-secondary-foreground" />
          </div>
          <p className="text-sm font-medium leading-relaxed text-secondary-foreground">"{quote}"</p>
        </div>
      </Card>
    </AppShell>
  );
}

function addDay(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
