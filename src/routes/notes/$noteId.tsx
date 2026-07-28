import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles,
  ArrowLeft,
  KeyRound,
  ExternalLink,
  Loader2,
  FileText,
  ListChecks,
  Layers,
  HelpCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getUserApiKey } from "@/lib/ai-config";
import { generateFromNote } from "@/lib/notes.functions";
import { useNotes, noteActions } from "@/lib/notes-store";

type Mode = "summary" | "details" | "flashcards" | "quiz";

const OPTIONS: { mode: Mode; label: string; icon: typeof FileText }[] = [
  { mode: "summary", label: "Summarize", icon: FileText },
  { mode: "details", label: "Key Details", icon: ListChecks },
  { mode: "flashcards", label: "Flashcards", icon: Layers },
  { mode: "quiz", label: "Quiz Me", icon: HelpCircle },
];

export const Route = createFileRoute("/notes/$noteId")({
  component: NoteDetailPage,
  head: () => ({
    meta: [
      { title: "Note — Smart Notes | Matric Study Planner" },
      {
        name: "description",
        content:
          "Read your saved note and turn it into a summary, key details, flashcards or a practice quiz.",
      },
      { property: "og:title", content: "Smart Note — Matric Study Planner" },
      {
        property: "og:description",
        content: "Summaries, key details, flashcards and quizzes from your own notes.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function NoteDetailPage() {
  const { noteId } = useParams({ from: "/notes/$noteId" });
  const note = useNotes((n) => n.find((x) => x.id === noteId));
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Mode | null>(null);
  const [view, setView] = useState<Mode | null>(null);
  const [error, setError] = useState<{ message: string; keyIssue: boolean } | null>(null);

  async function run(mode: Mode) {
    if (pending || !note) return;
    setOpen(false);
    setError(null);
    setPending(mode);
    try {
      const res = (await generateFromNote({
        data: { mode, text: note.content, apiKey: getUserApiKey() },
      })) as
        | { ok: true; text: string }
        | { ok: false; kind: "rate_limit" | "bad_key" | "error"; message: string };
      if (!res.ok) {
        setError({ message: res.message, keyIssue: res.kind !== "error" });
        return;
      }
      noteActions.setOutput(note.id, mode, res.text);
      setView(mode);
    } catch (e) {
      console.error(e);
      setError({
        message: "Sorry, we couldn't generate that right now. Please try again.",
        keyIssue: false,
      });
    } finally {
      setPending(null);
    }
  }

  if (!note) {
    return (
      <AppShell title="Note" subtitle="This note was not found">
        <Button asChild size="lg" className="w-full rounded-xl">
          <Link to="/notes">Back to Smart Notes</Link>
        </Button>
      </AppShell>
    );
  }

  const shown = view ? note.outputs[view] : undefined;
  const viewLabel = OPTIONS.find((o) => o.mode === view)?.label ?? "";

  return (
    <AppShell title={note.title} subtitle={note.fileName} hideAssistantFab>
      <Link
        to="/notes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
      >
        <ArrowLeft size={16} /> All notes
      </Link>

      {error && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
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

      {shown ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">{viewLabel}</h2>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setView(null)}>
              <ArrowLeft size={16} /> Back to note
            </Button>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{shown}</p>
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-2 text-base font-bold">Original content</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
        </section>
      )}

      {pending && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="animate-spin" size={16} />
          Generating {OPTIONS.find((o) => o.mode === pending)?.label}…
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        aria-label="AI options for this note"
        className="fixed bottom-28 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition active:scale-95"
      >
        {pending ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle>What should I make from this note?</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-3 pb-4">
            {OPTIONS.map(({ mode, label, icon: Icon }) => (
              <Button
                key={mode}
                variant="outline"
                disabled={pending !== null}
                onClick={() => run(mode)}
                className="h-24 flex-col gap-2 rounded-2xl text-sm font-bold"
              >
                {pending === mode ? (
                  <Loader2 className="animate-spin" size={22} />
                ) : (
                  <Icon size={22} />
                )}
                {label}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
