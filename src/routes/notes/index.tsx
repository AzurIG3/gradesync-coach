import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  FileText,
  Upload,
  Trash2,
  KeyRound,
  ExternalLink,
  Loader2,
  ClipboardList,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getUserApiKey } from "@/lib/ai-config";
import { extractTextFromFile } from "@/lib/extract-text";
import { useNotes, noteActions } from "@/lib/notes-store";
import { RenameIconButton } from "@/components/notes/EditableTitle";
import { cn } from "@/lib/utils";

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
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; keyIssue: boolean } | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const allSelected = useMemo(
    () => notes.length > 0 && notes.every((n) => picked.has(n.id)),
    [notes, picked],
  );

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setPicked(new Set());
    else setPicked(new Set(notes.map((n) => n.id)));
  }

  function exitSelect() {
    setSelectMode(false);
    setPicked(new Set());
  }

  function startTest() {
    if (picked.size < 2) return;
    // Preserve the on-screen order so the "Testing you on" list reads naturally.
    const ordered = notes.filter((n) => picked.has(n.id)).map((n) => n.id);
    navigate({ to: "/notes/test", search: { ids: ordered.join(",") } });
  }

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
            <Loader2 className="animate-spin" size={20} /> Reading &amp; cleaning your file…
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

      {notes.length >= 2 && (
        <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ClipboardList size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Full Section Test</p>
              <p className="text-xs text-muted-foreground">
                Combine several notes into one longer quiz with a per-note breakdown.
              </p>
            </div>
          </div>

          {!selectMode ? (
            <Button
              size="lg"
              className="mt-3 w-full rounded-xl text-sm font-bold"
              onClick={() => setSelectMode(true)}
            >
              Select notes for a test
            </Button>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={toggleAll}
              >
                {allSelected ? "Clear all" : "Select all"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={exitSelect}
                aria-label="Cancel selection"
              >
                <X size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3 pb-4">
        {notes.length === 0 && !busy && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <FileText size={24} />
            </div>
            <p className="text-base font-semibold">No notes yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap "Upload a file" to make your first note.
            </p>
          </div>
        )}

        {notes.map((n) => {
          const isPicked = picked.has(n.id);
          if (selectMode) {
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => togglePick(n.id)}
                aria-pressed={isPicked}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition",
                  isPicked
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                    isPicked ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {isPicked ? <CheckSquare size={22} /> : <Square size={22} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.fileName}</p>
                </div>
              </button>
            );
          }
          return (
            <div
              key={n.id}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4"
            >
              <Link
                to="/notes/$noteId"
                params={{ noteId: n.id }}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-base font-bold">{n.title}</p>
                <p className="truncate text-xs text-muted-foreground">{n.fileName}</p>
              </Link>
              <RenameIconButton value={n.title} onSave={(t) => noteActions.rename(n.id, t)} />
              <button
                aria-label="Delete note"
                onClick={() => noteActions.remove(n.id)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
      </div>

      {selectMode && (
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md px-5">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-lg">
            <div className="mb-2 text-center text-xs font-semibold text-muted-foreground">
              {picked.size === 0
                ? "Pick at least 2 notes"
                : picked.size === 1
                  ? "Pick 1 more note"
                  : `${picked.size} notes selected`}
            </div>
            <Button
              size="lg"
              disabled={picked.size < 2}
              onClick={startTest}
              className="w-full rounded-xl text-sm font-bold"
            >
              <ClipboardList size={18} /> Start Full Section Test
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
