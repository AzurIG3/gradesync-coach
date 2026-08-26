import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Tells the student what still works when the connection drops. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="mb-4 flex items-start gap-2 rounded-2xl border border-border bg-muted/60 p-3 text-xs">
      <WifiOff size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
      <p className="leading-relaxed">
        <span className="font-bold">You&apos;re offline.</span> Saved notes, summaries, flashcards
        and quizzes still work — new AI generation will resume once you&apos;re back online.
      </p>
    </div>
  );
}
