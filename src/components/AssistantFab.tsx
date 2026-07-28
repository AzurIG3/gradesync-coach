import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function AssistantFab() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/assistant")) return null;
  return (
    <Link
      to="/assistant"
      aria-label="Open AI Study Assistant"
      className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
    >
      <Sparkles size={26} />
    </Link>
  );
}
