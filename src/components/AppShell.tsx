import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { AssistantFab } from "./AssistantFab";
import { LanguageToggle } from "./LanguageToggle";
import { useT } from "@/lib/i18n";


export function AppShell({
  title,
  subtitle,
  children,
  action,
  hideAssistantFab,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  hideAssistantFab?: boolean;
}) {
  const { t } = useT();
  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-md px-5 pt-8">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-extrabold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
