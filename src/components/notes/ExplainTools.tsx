import { useState } from "react";
import { HelpCircle, ArrowDownWideNarrow, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/notes/Markdown";
import { reexplain } from "@/lib/ai-extra.functions";
import { getUserApiKey } from "@/lib/ai-config";

export type Depth = "simple" | "standard" | "advanced";

const DEPTHS: { id: Depth; label: string }[] = [
  { id: "simple", label: "Simple" },
  { id: "standard", label: "Standard" },
  { id: "advanced", label: "Advanced" },
];

/**
 * "Explain like I'm confused" / "Continue" / depth controls that can sit under
 * any AI-generated answer (Assistant replies, note summaries, key details).
 */
export function ExplainTools({
  answer,
  question,
  className,
}: {
  answer: string;
  question?: string;
  className?: string;
}) {
  const [depth, setDepth] = useState<Depth>("simple");
  const [loading, setLoading] = useState<"explain" | "continue" | null>(null);
  const [out, setOut] = useState("");
  const [error, setError] = useState("");

  const run = async (mode: "explain" | "continue") => {
    setLoading(mode);
    setError("");
    try {
      const res = await reexplain({
        data: {
          question: question ?? "",
          answer,
          depth,
          analogy: mode === "explain",
          mode,
          apiKey: getUserApiKey(),
        },
      });
      if (res.ok) setOut(res.text);
      else setError(res.message ?? "Couldn't generate that right now.");
    } catch {
      setError("Couldn't reach the AI right now. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  if (!answer.trim()) return null;

  return (
    <div className={cn("mt-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={loading !== null}
          onClick={() => run("explain")}
        >
          {loading === "explain" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <HelpCircle size={14} />
          )}
          Explain like I'm confused
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={loading !== null}
          onClick={() => run("continue")}
        >
          {loading === "continue" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ArrowDownWideNarrow size={14} />
          )}
          Continue
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Depth
        </span>
        {DEPTHS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDepth(d.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold transition",
              depth === d.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-2 text-xs font-semibold text-destructive">{error}</p> : null}

      {out ? (
        <div className="mt-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <Markdown>{out}</Markdown>
        </div>
      ) : null}
    </div>
  );
}
