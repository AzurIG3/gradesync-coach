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
  MessageCircle,
  Pencil,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Markdown } from "@/components/notes/Markdown";
import { FlashcardsView } from "@/components/notes/FlashcardsView";
import { QuizView } from "@/components/notes/QuizView";
import { NoteChart } from "@/components/notes/NoteChart";
import { NoteChat } from "@/components/notes/NoteChat";
import { EditableTitle } from "@/components/notes/EditableTitle";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { ExplainTools } from "@/components/notes/ExplainTools";
import { chapterOptions } from "@/lib/note-filing";
import { useStore } from "@/lib/store";
import { UNSORTED_CHAPTER } from "@/lib/syllabus";
import { extractChart, parseFlashcards, parseQuiz } from "@/lib/notes-parse";
import { getUserApiKey } from "@/lib/ai-config";
import { generateFromNote } from "@/lib/notes.functions";
import { useNotes, noteActions } from "@/lib/notes-store";
import { dedupeBy, dedupeQuestions, loadAsked, rememberAsked } from "@/lib/quiz-dedupe";
import { strongTopics, weakTopics } from "@/lib/mastery";
import type { Difficulty } from "@/components/notes/QuizView";
import { cn } from "@/lib/utils";



type Mode = "summary" | "details" | "flashcards" | "quiz";
type View = Mode | "chat";

const OPTIONS: { mode: Mode; label: string; icon: typeof FileText }[] = [
  { mode: "summary", label: "Summarize", icon: FileText },
  { mode: "details", label: "Key Details", icon: ListChecks },
  { mode: "flashcards", label: "Flashcards", icon: Layers },
  { mode: "quiz", label: "Quiz Me", icon: HelpCircle },
];

const VIEW_LABEL: Record<View, string> = {
  summary: "Summarize",
  details: "Key Details",
  flashcards: "Flashcards",
  quiz: "Quiz Me",
  chat: "Ask about this note",
};

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
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
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<{ message: string; keyIssue: boolean } | null>(null);
  const [gen, setGen] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [editing, setEditing] = useState(false);

  const masteryScope = `note:${noteId}`;

  async function run(mode: Mode, diff: Difficulty = difficulty) {
    if (pending || !note) return;
    setOpen(false);
    setError(null);
    setPending(mode);
    const memoryKey = `${note.id}:${mode}`;
    const varied = mode === "quiz" || mode === "flashcards";
    try {
      const res = (await generateFromNote({
        data: {
          mode,
          text: note.content,
          avoid: varied ? loadAsked(memoryKey) : [],
          weak: varied ? weakTopics(masteryScope) : [],
          strong: varied ? strongTopics(masteryScope) : [],
          difficulty: diff,
          apiKey: getUserApiKey(),
        },
      })) as
        | { ok: true; text: string }
        | { ok: false; kind: "rate_limit" | "bad_key" | "error"; message: string };
      if (!res.ok) {
        setError({ message: res.message, keyIssue: res.kind !== "error" });
        return;
      }

      let text = res.text;
      if (mode === "quiz") {
        const asked = loadAsked(memoryKey);
        const all = parseQuiz(res.text);
        // Removes repeats against past sets AND inside this set.
        const fresh = dedupeQuestions(all, asked);
        const kept = fresh.length ? fresh : dedupeQuestions(all); // never leave the student with nothing
        rememberAsked(memoryKey, kept.map((q) => q.question));
        text = JSON.stringify(kept);
      } else if (mode === "flashcards") {
        const asked = loadAsked(memoryKey);
        const all = parseFlashcards(res.text);
        const fresh = dedupeBy(all, (c) => c.q, asked);
        const kept = fresh.length ? fresh : all;
        rememberAsked(memoryKey, kept.map((c) => c.q));
        text = JSON.stringify(kept);
      }


      noteActions.setOutput(note.id, mode, text);
      setGen((g) => g + 1);
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

  const shown = view && view !== "chat" ? note.outputs[view] : undefined;
  const viewLabel = view ? VIEW_LABEL[view] : "";
  

  return (
    <AppShell
      title={
        <EditableTitle
          value={note.title}
          onSave={(t) => noteActions.rename(note.id, t)}
          ariaLabel="Rename note"
        />
      }
      subtitle={note.fileName}
      hideAssistantFab
    >
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

      {view === "chat" ? (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">{viewLabel}</h2>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setView(null)}>
              <ArrowLeft size={16} /> Back to note
            </Button>
          </div>
          <NoteChat noteTitle={note.title} noteContent={note.content} />
        </>
      ) : shown ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">{viewLabel}</h2>
            <div className="flex items-center gap-2">
              {(view === "summary" || view === "details") && !editing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={15} /> Edit
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  setEditing(false);
                  setView(null);
                }}
              >
                <ArrowLeft size={16} /> Back to note
              </Button>
            </div>
          </div>
          {editing && (view === "summary" || view === "details") ? (
            <NoteEditor
              value={shown}
              label={`Edit ${viewLabel}`}
              onCancel={() => setEditing(false)}
              onSave={(next) => {
                noteActions.setOutput(note.id, view, next);
                setEditing(false);
              }}
            />
          ) : view === "flashcards" ? (
            <FlashcardsView
              key={`f${gen}`}
              cards={parseFlashcards(shown)}
              deckId={note.id}
              deckName={note.title}
              regenerating={pending === "flashcards"}
              onRegenerate={() => run("flashcards")}
            />
          ) : view === "quiz" ? (
            <QuizView
              key={`q${gen}`}
              questions={parseQuiz(shown)}
              regenerating={pending === "quiz"}
              onRegenerate={() => run("quiz")}
              difficulty={difficulty}
              onDifficultyChange={(d) => {
                setDifficulty(d);
                void run("quiz", d);
              }}
              masteryScope={masteryScope}
            />

          ) : (
            (() => {
              const { chart, markdown } = extractChart(shown);
              return (
                <>
                  {chart && <NoteChart spec={chart} />}
                  <Markdown>{markdown}</Markdown>
                  <ExplainTools answer={markdown} question={`${viewLabel} of my note "${note.title}"`} />
                </>
              );
            })()
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">Cleaned notes</h2>
            {!editing && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setEditing(true)}
              >
                <Pencil size={15} /> Edit
              </Button>
            )}
          </div>
          <ChapterPicker noteId={note.id} subjectId={note.subjectId} chapter={note.chapter} />
          {editing ? (
            <NoteEditor
              value={note.content}
              label="Edit cleaned notes"
              onCancel={() => setEditing(false)}
              onSave={(next) => {
                noteActions.setContent(note.id, next);
                setEditing(false);
              }}
            />
          ) : (
            <Markdown>{note.content}</Markdown>
          )}
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

          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Difficulty (for Quiz Me &amp; Flashcards)
            </p>
            <div className="flex gap-1 rounded-full bg-muted p-1">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  aria-pressed={difficulty === d.id}
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition",
                    difficulty === d.id
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
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
          <Button
            variant="outline"
            disabled={pending !== null}
            onClick={() => {
              setOpen(false);
              setView("chat");
            }}
            className="mt-3 h-14 w-full gap-2 rounded-2xl text-sm font-bold"
          >
            <MessageCircle size={20} />
            Ask about this note
          </Button>
          <div className="pb-2" />
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}


/** Lets the student re-file a note under any chapter of its subject. */
function ChapterPicker({
  noteId,
  subjectId,
  chapter,
}: {
  noteId: string;
  subjectId?: string;
  chapter?: string;
}) {
  const subject = useStore((st) => st.subjects.find((x) => x.id === subjectId));
  if (!subject) return null;
  const options = chapterOptions(subject);
  return (
    <div className="mb-4">
      <label
        htmlFor="note-chapter"
        className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground"
      >
        Chapter in {subject.name}
      </label>
      <select
        id="note-chapter"
        value={chapter ?? UNSORTED_CHAPTER}
        onChange={(e) => noteActions.setChapter(noteId, e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary"
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
