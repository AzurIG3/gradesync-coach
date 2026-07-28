import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { actions, useStore } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/timer")({
  head: () => ({
    meta: [
      { title: "Focus Timer — Study Planner" },
      { name: "description", content: "Pomodoro-style focus timer to power your Matric study sessions." },
      { property: "og:title", content: "Focus Timer — Study Planner" },
      { property: "og:description", content: "Pomodoro-style focus timer to power your Matric study sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TimerPage,
});

function TimerPage() {
  const { t } = useT();
  const subjects = useStore((s) => s.subjects);
  const savedTimer = useStore((s) => s.timer);
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id ?? "");
  const [focusMin, setFocusMin] = useState(savedTimer.focusMin);
  const [breakMin, setBreakMin] = useState(savedTimer.breakMin);
  const [phase, setPhase] = useState<"idle" | "focus" | "break">("idle");
  const [secondsLeft, setSecondsLeft] = useState(savedTimer.focusMin * 60);
  const [running, setRunning] = useState(false);
  const totalRef = useRef(savedTimer.focusMin * 60);

  useEffect(() => {
    if (phase === "idle") {
      setSecondsLeft(focusMin * 60);
      totalRef.current = focusMin * 60;
    }
  }, [focusMin, phase]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        // transition
        if (phase === "focus") {
          totalRef.current = breakMin * 60;
          setPhase("break");
          return breakMin * 60;
        }
        setRunning(false);
        setPhase("idle");
        totalRef.current = focusMin * 60;
        return focusMin * 60;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase, breakMin, focusMin]);

  const start = () => {
    if (phase === "idle") {
      actions.setTimerPrefs(focusMin, breakMin);
      totalRef.current = focusMin * 60;
      setSecondsLeft(focusMin * 60);
      setPhase("focus");
    }
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setPhase("idle");
    totalRef.current = focusMin * 60;
    setSecondsLeft(focusMin * 60);
  };

  const pct = phase === "idle" ? 0 : 1 - secondsLeft / Math.max(1, totalRef.current);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const size = 240;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sub = subjects.find((s) => s.id === subjectId);
  const isBreak = phase === "break";
  const ringColor = isBreak ? "var(--color-success)" : "var(--color-primary)";

  return (
    <AppShell title={t("focusTimer")} subtitle={t("timerSubtitle")}>
      {/* Subject */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold">{t("studyingSubject")}</label>
        {subjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/40 p-4 text-center text-sm text-muted-foreground">
            {t("noSubjectsForTimer")}{" "}
            <Link to="/subjects" className="font-bold text-primary underline">
              {t("addOne")}
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubjectId(s.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  subjectId === s.id ? "bg-primary text-primary-foreground shadow" : "bg-muted text-foreground"
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ring */}
      <div className="mb-6 flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" stroke="var(--color-muted)" opacity={0.5} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              strokeWidth={stroke}
              fill="none"
              stroke={ringColor}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c - pct * c}
              style={{ transition: "stroke-dashoffset 500ms" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-black tabular-nums tracking-tight">
              {mm}:{ss}
            </div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isBreak ? t("breakPhase") : phase === "focus" ? t("focusPhase") : t("ready")}
            </div>
            {sub && phase !== "idle" && (
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sub.color }} />
                {sub.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex justify-center gap-3">
        {!running ? (
          <button
            onClick={start}
            className="flex h-14 items-center gap-2 rounded-full bg-primary px-8 text-base font-bold text-primary-foreground shadow-md active:scale-[0.98]"
          >
            <Play size={22} /> {phase === "focus" || phase === "break" ? t("resume") : t("start")}
          </button>
        ) : (
          <button
            onClick={pause}
            className="flex h-14 items-center gap-2 rounded-full bg-warning/80 px-8 text-base font-bold shadow-md active:scale-[0.98]"
          >
            <Pause size={22} /> {t("pause")}
          </button>
        )}
        <button
          onClick={reset}
          className="grid h-14 w-14 place-items-center rounded-full bg-muted"
          aria-label="Reset"
        >
          <RotateCcw size={22} />
        </button>
      </div>

      {/* Durations */}
      <div className="rounded-2xl border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">{t("durations")}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t("focusMinutes")}</label>
            <input
              type="number"
              min={1}
              max={120}
              value={focusMin}
              onChange={(e) => setFocusMin(Math.max(1, Number(e.target.value) || 1))}
              disabled={running || phase !== "idle"}
              className="h-12 w-full rounded-xl border bg-background px-3 text-base font-bold disabled:opacity-60"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">{t("breakMinutes")}</label>
            <input
              type="number"
              min={1}
              max={60}
              value={breakMin}
              onChange={(e) => setBreakMin(Math.max(1, Number(e.target.value) || 1))}
              disabled={running || phase !== "idle"}
              className="h-12 w-full rounded-xl border bg-background px-3 text-base font-bold disabled:opacity-60"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t("defaultsHint")}</p>
      </div>
    </AppShell>
  );
}
