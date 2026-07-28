import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FileText, Upload, Trash2, KeyRound, ExternalLink, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getUserApiKey } from "@/lib/ai-config";
import { extractTextFromFile } from "@/lib/extract-text";
import { useNotes, noteActions } from "@/lib/notes-store";

export const Route = createFileRoute("/notes/")({
  component: NotesPage,
  head: () => ({
    meta: [
      { title: "Smart Notes — Matric Study Planner" },
      {
        name: "description",
        content:
          "Upload a PDF, Word file, Excel sheet or photo and turn it into study notes with summaries, flashcards and quizzes.",
      },
      { property: "og:title", content: "Smart Notes — Matric Study Planner" },
      {
        property: "og:description",
        content: "Turn your books and handouts into simple notes, flashcards and quizzes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function NotesPage() {
  const notes = useNotes((n) => n);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; keyIssue: boolean } | null>(null);

  async function onPick(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await extractTextFromFile(file, getUserApiKey());
      if (!res.ok) {
        setError({ message: res.message, keyIssue: res.kind !== "error" });
        return;
      }
      if (!res.text.trim()) {
        setError({ message: "We couldn't find any readable text in that file.", keyIssue: false });
        return;
      }
      const id = noteActions.add(file.name.replace(/\.[^.]+$/, ""), res.text, file.name);
      router.navigate({ to: "/notes/$noteId", params: { noteId: id } });
    } catch (e) {
      console.error(e);
      setError({ message: "Sorry, we couldn't read that file. Please try another one.", keyIssue: false });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <AppShell title="Smart Notes" subtitle="Turn your files into simple study notes">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />

      <Button
        size="lg"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-2xl py-7 text-base font-bold"
      >
        {busy ? (
          <span className="flex items-center gap-2">
            <Loader2 className="animate-spin" size={20} /> Reading your file…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Upload size={20} /> Upload a file
          </span>
        )}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        PDF, Word, Excel or a photo of your book page.
      </p>

      {error && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <KeyRound size={18} />
            </span>
            <p className="text-sm leading-relaxed">{error.message}</p>
          </div>
          {error.keyIssue && (
            <>
              <Button asChild size="lg" className="mt-3 w-full rounded-xl text-sm font-bold">
                <Link to="/settings">Add my own key in Settings</Link>
              </Button>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary underline"
              >
                How to get a free key <ExternalLink size={12} />
              </a>
            </>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {notes.length === 0 && !busy && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <FileText size={24} />
            </div>
            <p className="text-base font-semibold">No notes yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap “Upload a file” to make your first note.
            </p>
          </div>
        )}

        {notes.map((n) => (
          <div
            key={n.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <Link
              to="/notes/$noteId"
              params={{ noteId: n.id }}
              className="min-w-0 flex-1"
            >
              <p className="truncate text-base font-bold">{n.title}</p>
              <p className="truncate text-xs text-muted-foreground">{n.fileName}</p>
            </Link>
            <button
              aria-label="Delete note"
              onClick={() => noteActions.remove(n.id)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
