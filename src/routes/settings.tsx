import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, KeyRound, Monitor, Moon, Play, Sun, Volume2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { getUserApiKey, setUserApiKey } from "@/lib/ai-config";
import { useTheme, type Theme } from "@/lib/theme";
import {
  ALARM_OPTIONS,
  getAlarmSound,
  playAlarm,
  primeAudio,
  setAlarmSound,
  type AlarmId,
} from "@/lib/alarm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — Matric Study Planner" },
      {
        name: "description",
        content:
          "Choose your language and optionally save your own AI API key for the Study Assistant.",
      },
      { property: "og:title", content: "Settings — Matric Study Planner" },
      {
        property: "og:description",
        content: "Language and optional AI API key settings for your study planner.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SettingsPage() {
  const { t } = useT();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [alarm, setAlarm] = useState<AlarmId>("chime");

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  useEffect(() => {
    setKey(getUserApiKey());
    setAlarm(getAlarmSound());
  }, []);

  function save() {
    setUserApiKey(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AppShell title={t("settingsTitle")} subtitle={t("settingsSubtitle")}>
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Moon size={18} />
            </span>
            <h2 className="text-base font-bold">Appearance</h2>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Choose Light, Dark or match your device.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map(({ value, label, icon: Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-bold transition",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon size={20} />
                  {label}
                </button>
              );
            })}
          </div>
        </section>


        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Volume2 size={18} />
            </span>
            <h2 className="text-base font-bold">Timer alarm sound</h2>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Plays when a focus session or break ends. Tap a sound to preview it.
          </p>
          <div className="space-y-2">
            {ALARM_OPTIONS.map((o) => {
              const active = alarm === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setAlarm(o.id);
                    setAlarmSound(o.id);
                    primeAudio();
                    playAlarm(o.id);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                    active ? "border-primary bg-primary/10" : "border-border bg-background",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    <Play size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{o.label}</span>
                    <span className="block text-xs text-muted-foreground">{o.description}</span>
                  </span>
                  {active && <Check size={18} className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            While a focus session is running, the app pauses its own notifications so you aren\'t
            interrupted.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <KeyRound size={18} />
            </span>
            <h2 className="text-base font-bold">{t("apiKeyLabel")}</h2>
          </div>

          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={t("apiKeyPlaceholder")}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-primary"
          />
          <p className="mt-2 text-sm text-muted-foreground">{t("apiKeyHelp")}</p>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-semibold text-primary underline"
          >
            {t("apiKeyHowTo")} →
          </a>


          <div className="mt-4 flex items-center gap-3">
            <Button onClick={save} size="lg" className="flex-1 rounded-xl text-base font-bold">
              {saved ? (
                <span className="flex items-center gap-2">
                  <Check size={18} /> {t("apiKeySaved")}
                </span>
              ) : (
                t("save")
              )}
            </Button>
            {key && (
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl"
                onClick={() => {
                  setKey("");
                  setUserApiKey("");
                }}
              >
                {t("clear")}
              </Button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">{t("replayOnboarding")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("replayOnboardingHelp")}</p>
          <Button
            variant="outline"
            size="lg"
            className="mt-3 w-full rounded-xl text-base font-bold"
            onClick={() => {
              try {
                const raw = localStorage.getItem("study-planner-v1");
                const parsed = raw ? JSON.parse(raw) : {};
                localStorage.setItem(
                  "study-planner-v1",
                  JSON.stringify({ ...parsed, onboarded: false }),
                );
              } catch {}
              router.navigate({ to: "/" }).then(() => window.location.reload());
            }}
          >
            {t("replayOnboardingAction")}
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
