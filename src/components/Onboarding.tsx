import { useEffect, useState } from "react";
import { Home, BookOpen, CalendarDays, TrendingUp } from "lucide-react";
import { actions, useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export function Onboarding() {
  const onboarded = useStore((s) => s.onboarded);
  const { t, lang, setLang } = useT();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || onboarded) return null;

  const slides = [
    { Icon: Home, title: t("onbHomeTitle"), body: t("onbHomeBody"), bg: "bg-primary/15 text-primary" },
    { Icon: BookOpen, title: t("onbSubjectsTitle"), body: t("onbSubjectsBody"), bg: "bg-secondary text-secondary-foreground" },
    { Icon: CalendarDays, title: t("onbScheduleTitle"), body: t("onbScheduleBody"), bg: "bg-accent/40 text-accent-foreground" },
    { Icon: TrendingUp, title: t("onbProgressTitle"), body: t("onbProgressBody"), bg: "bg-warning/25 text-foreground" },
  ];

  const s = slides[step];
  const Icon = s.Icon;
  const last = step === slides.length - 1;
  const finish = () => actions.setOnboarded();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="flex items-center justify-between px-5 pt-6">
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-2 bg-muted"}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "en" ? "ur" : "en")}
            className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold"
            aria-label="Toggle language"
          >
            🌐 {lang === "en" ? "اردو" : "EN"}
          </button>
          {!last && (
            <button onClick={finish} className="text-sm font-semibold text-muted-foreground">
              {t("skip")}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className={`mb-8 grid h-32 w-32 place-items-center rounded-[2rem] ${s.bg}`}>
          <Icon size={64} strokeWidth={1.8} />
        </div>
        <h2 className="mb-3 text-2xl font-extrabold">{s.title}</h2>
        <p className="max-w-xs text-base leading-relaxed text-muted-foreground">{s.body}</p>
      </div>
      <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => (last ? finish() : setStep(step + 1))}
          className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-md active:scale-[0.99]"
        >
          {last ? t("getStarted") : t("next")}
        </button>
      </div>
    </div>
  );
}
