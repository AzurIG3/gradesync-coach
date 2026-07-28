import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookOpen, CalendarDays, TrendingUp, FileText } from "lucide-react";
import { useT } from "@/lib/i18n";

export function BottomNav() {
  const { t } = useT();
  const items = [
    { to: "/", label: t("navHome"), icon: Home },
    { to: "/subjects", label: t("navSubjects"), icon: BookOpen },
    { to: "/schedule", label: t("navSchedule"), icon: CalendarDays },
    { to: "/notes", label: t("navNotes"), icon: FileText },
    { to: "/progress", label: t("navProgress"), icon: TrendingUp },
  ] as const;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon
                  size={24}
                  strokeWidth={active ? 2.5 : 2}
                  className={active ? "scale-110 transition-transform" : ""}
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
