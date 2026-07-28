import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, KeyRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { getUserApiKey, setUserApiKey } from "@/lib/ai-config";

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
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKey(getUserApiKey());
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
