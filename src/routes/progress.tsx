import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { subjectProgress, useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { PathProgress } from "@/components/PathProgress";
import { MasteryPanel } from "@/components/notes/MasteryPanel";
import { StudyHeatmap } from "@/components/StudyHeatmap";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";
import { useT } from "@/lib/i18n";


export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Study Planner" },
      { name: "description", content: "See how much of each subject you have completed." },
      { property: "og:title", content: "Progress — Study Planner" },
      { property: "og:description", content: "See how much of each subject you have completed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://sophia-odyssey.lovable.app/progress" },
    ],
    links: [{ rel: "canonical", href: "https://sophia-odyssey.lovable.app/progress" }],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { t } = useT();
  const subjects = useStore((s) => s.subjects);

  const totalTopics = subjects.reduce((n, s) => n + s.topics.length, 0);
  const doneTopics = subjects.reduce(
    (n, s) => n + s.topics.filter((t) => t.status === "completed").length,
    0,
  );
  const overall = totalTopics === 0 ? 0 : Math.round((doneTopics / totalTopics) * 100);

  const size = 180;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <AppShell title={t("progressTitle")} subtitle={t("progressSubtitle")}>
      <Card className="mb-6 flex flex-col items-center border-0 bg-gradient-to-br from-secondary via-secondary to-accent p-6 shadow-soft">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" stroke="rgba(255,255,255,0.5)" />
            <circle
              cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none"
              stroke="var(--color-primary)"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c - (overall / 100) * c}
              style={{ transition: "stroke-dashoffset 500ms" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-black">{overall}%</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("overall")}</div>
          </div>
        </div>
        <p className="mt-3 text-sm font-medium text-secondary-foreground">
          {t("topicsCompletedSummary", { done: doneTopics, total: totalTopics })}
        </p>
      </Card>

      {subjects.length === 0 ? (
        <Card className="border-dashed bg-muted/40 p-8 text-center">
          <p className="font-semibold">{t("nothingToShow")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("addToSeeProgress")}</p>
          <Link
            to="/subjects"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            {t("addSubjectAction")}
          </Link>
        </Card>
      ) : (
        <ul className="space-y-3">
          {subjects.map((sub) => {
            const pct = subjectProgress(sub);
            const done = sub.topics.filter((tp) => tp.status === "completed").length;
            return (
              <li key={sub.id}>
                <Card className="p-4 shadow-soft">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 shrink-0 rounded-2xl" style={{ backgroundColor: sub.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-semibold">{sub.name}</div>
                        <div className="shrink-0 text-sm font-bold text-muted-foreground">{pct}%</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {done}/{sub.topics.length} {sub.topics.length === 1 ? t("topic") : t("topics")}
                      </div>
                    </div>
                  </div>
                  {/* Journey motif: the subject's path fills in as topics complete */}
                  <PathProgress value={pct} color={sub.color} className="mt-2" />
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6">
        <StudyHeatmap />
      </div>

      <div className="mt-6">
        <Button asChild size="lg" className="w-full rounded-2xl py-6 text-base font-bold">
          <Link to="/notes/weak">
            <Target size={20} /> Quiz my weak spots
          </Link>
        </Button>
      </div>

      <MasteryPanel />
    </AppShell>

  );
}
