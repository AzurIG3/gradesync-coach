import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, Settings, Sun } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { AssistantFab } from "./AssistantFab";
import { LanguageToggle } from "./LanguageToggle";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

function ThemeQuickToggle() {
  const { theme, setTheme, resolved } = useTheme();
  const nextTheme = resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Theme: ${theme}`}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted"
    >
      {resolved === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function AppShell({
  title,
  subtitle,
  children,
  action,
  hideAssistantFab,
}: {
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  hideAssistantFab?: boolean;
}) {
  const { t } = useT();
  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(120%_60%_at_50%_-10%,var(--surface),transparent_70%)] pb-28">
      <div className="mx-auto max-w-md px-5 pt-8">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-balance font-display text-[1.7rem] font-semibold leading-tight tracking-tight">
              {title}
            </h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeQuickToggle />
            <LanguageToggle />
            <Link
              to="/settings"
              aria-label={t("settings")}
              className="flex h-9 items-center gap-1 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <Settings size={16} />
            </Link>
            {action}
          </div>
        </header>

        {children}
      </div>
      {!hideAssistantFab && <AssistantFab />}
      <BottomNav />
    </div>
  );
}
