import { useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/notes/Markdown";
import { generateCheatSheet } from "@/lib/ai-extra.functions";
import { getUserApiKey } from "@/lib/ai-config";

/** Condenses every note of a subject into one revision page. */
export function CheatSheet({
  subjectName,
  notes,
}: {
  subjectName: string;
  notes: { title: string; content: string }[];
}) {
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState("");
  const [error, setError] = useState("");

  async function build() {
    setLoading(true);
    setError("");
    try {
      const res = await generateCheatSheet({
        data: { subject: subjectName, notes, apiKey: getUserApiKey() },
      });
      if (res.ok) setSheet(res.text);
      else setError(res.message ?? "Couldn't build the cheat sheet right now.");
    } catch {
      setError("Couldn't reach the AI right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <p className="mb-2 text-sm font-semibold text-muted-foreground">Cheat sheet</p>
      {notes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
          Upload notes for this subject to build a one-page cheat sheet of its key formulas and
          definitions.
        </p>
      ) : (
        <>
          <Button
            variant="outline"
            className="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal py-3"
            onClick={build}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin text-primary" />
            ) : (
              <ScrollText size={20} className="text-primary" />
            )}
            <span className="flex-1 text-left">
              {loading
                ? "Building your cheat sheet…"
                : sheet
                  ? "Rebuild cheat sheet"
                  : `Build cheat sheet from ${notes.length} note${notes.length === 1 ? "" : "s"}`}
            </span>
          </Button>
          {error ? (
            <p className="mt-2 text-xs font-semibold text-destructive">{error}</p>
          ) : null}
          {sheet ? (
            <div className="mt-3 rounded-2xl border border-border bg-muted/30 p-4">
              <Markdown>{sheet}</Markdown>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
