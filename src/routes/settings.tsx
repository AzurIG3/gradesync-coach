import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Archive, Check, Download, KeyRound, Monitor, Moon, Play, Sun, Trash2, Upload, Volume2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { getUserApiKey, setUserApiKey } from "@/lib/ai-config";
import { useTheme, type Theme } from "@/lib/theme";
import { PALETTES, applyPalette, loadPaletteId, savePaletteId, type PaletteId } from "@/lib/palette";
import {
  ALARM_OPTIONS,
  clearCustomAlarm,
  getAlarmSound,
  loadCustomAlarm,
  playAlarm,
  primeAudio,
  saveCustomAlarm,
  setAlarmSound,
  type AlarmId,
} from "@/lib/alarm";

import { cn } from "@/lib/utils";
import { AccountSyncCard } from "@/components/AccountSyncCard";
import { actions } from "@/lib/store";
import { withPageBoundary } from "@/components/PageErrorBoundary";

export const Route = createFileRoute("/settings")({
  component: withPageBoundary(SettingsPage, "settings"),
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
      { property: "og:url", content: "https://sophia-odyssey.lovable.app/settings" },
    ],
    links: [{ rel: "canonical", href: "https://sophia-odyssey.lovable.app/settings" }],
  }),
});

function SettingsPage() {
  const { t } = useT();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [alarm, setAlarm] = useState<AlarmId>("chime");
  const [palette, setPalette] = useState<PaletteId>("ocean");
  const [customName, setCustomName] = useState<string | null>(null);
  const [soundMsg, setSoundMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  useEffect(() => {
    setKey(getUserApiKey());
    setAlarm(getAlarmSound());
    const id = loadPaletteId();
    setPalette(id);
    applyPalette(id);
    void loadCustomAlarm().then((c) => setCustomName(c?.name ?? null));
  }, []);


  function save() {
    setUserApiKey(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AppShell title={t("settingsTitle")} subtitle={t("settingsSubtitle")}>
      <div className="space-y-4">
        <AccountSyncCard />
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Download size={18} />
            </span>
            <h2 className="text-base font-bold">Your data</h2>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Save a copy of everything you have here — notes, subjects, schedule, progress and
            settings — as one file, or bring back something you deleted by mistake.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="h-12 flex-1"
              onClick={() => downloadMyData(user?.email ?? null)}
            >
              <Download size={18} /> Download my data
            </Button>
            <Button variant="outline" className="h-12 flex-1" asChild>
              <Link to="/trash">
                <Archive size={18} /> Recently deleted
              </Link>
            </Button>
          </div>
        </section>

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

          <p className="mb-2 mt-5 text-sm font-semibold">Colour theme</p>
          <p className="mb-3 text-sm text-muted-foreground">
            Pick an accent palette — it applies across every screen and tints your app icon.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PALETTES.map((p) => {
              const active = palette === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setPalette(p.id);
                    savePaletteId(p.id);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-xs font-bold transition",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="flex shrink-0 gap-1">
                    {p.swatch.map((c) => (
                      <span
                        key={c}
                        className="h-5 w-5 rounded-full border border-black/10"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                  {p.label}
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

          {/* Custom uploaded sound */}
          <div className="mt-3 rounded-xl border border-dashed border-border p-4">
            <div className="mb-2 flex items-center gap-2">
              <Upload size={16} className="text-primary" />
              <p className="text-sm font-bold">Your own sound</p>
            </div>
            {customName ? (
              <button
                type="button"
                onClick={() => {
                  setAlarm("custom");
                  setAlarmSound("custom");
                  primeAudio();
                  void playAlarm("custom");
                }}
                aria-pressed={alarm === "custom"}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                  alarm === "custom"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    alarm === "custom"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  <Play size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{customName}</span>
                  <span className="block text-xs text-muted-foreground">
                    Saved on this device — tap to preview
                  </span>
                </span>
                {alarm === "custom" && <Check size={18} className="shrink-0 text-primary" />}
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Upload an MP3 or WAV (up to 5 MB) to use it as your alarm instead.
              </p>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setSoundMsg(null);
                const res = await saveCustomAlarm(file);
                if (!res.ok) {
                  setSoundMsg(res.message ?? "We couldn't save that sound.");
                  return;
                }
                setCustomName(file.name);
                setAlarm("custom");
                setAlarmSound("custom");
                setSoundMsg("Saved. Your sound will play when the timer ends.");
              }}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={14} />
                {customName ? "Replace file" : "Upload sound"}
              </Button>
              {customName && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-destructive"
                  onClick={async () => {
                    await clearCustomAlarm();
                    setCustomName(null);
                    setSoundMsg(null);
                    if (alarm === "custom") {
                      setAlarm("chime");
                      setAlarmSound("chime");
                    }
                  }}
                >
                  <Trash2 size={14} /> Remove
                </Button>
              )}
            </div>
            {soundMsg && <p className="mt-2 text-xs text-muted-foreground">{soundMsg}</p>}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            While a focus session is running, the app pauses its own notifications so you aren&apos;t
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
              actions.replayOnboarding();
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
