import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  ArrowDownAZ,
  CalendarClock,
  HardDrive,
  ChevronDown,
  BookOpen,
  Search,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getUserApiKey } from "@/lib/ai-config";
import { extractTextFromFiles } from "@/lib/extract-text";
import { estimateSeconds, formatEstimate } from "@/lib/extract-cache";
import { VoiceNoteButton } from "@/components/notes/VoiceNoteButton";
import { autoFileNote } from "@/lib/note-filing";
import { useNotes, noteActions, noteSize, formatSize, type Note } from "@/lib/notes-store";
import { useStore } from "@/lib/store";
import { RenameIconButton } from "@/components/notes/EditableTitle";
import { cn } from "@/lib/utils";
import { withPageBoundary } from "@/components/PageErrorBoundary";

export const Route = createFileRoute("/notes/")({
  component: withPageBoundary(NotesPage, "notes"),
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
      { property: "og:url", content: "https://sophia-odyssey.lovable.app/notes" },
    ],
    links: [{ rel: "canonical", href: "https://sophia-odyssey.lovable.app/notes" }],
  }),
});

type SortKey = "az" | "date" | "size";

const SORTS: { id: SortKey; label: string; icon: typeof ArrowDownAZ }[] = [
  { id: "date", label: "Date added", icon: CalendarClock },
  { id: "az", label: "A–Z", icon: ArrowDownAZ },
  { id: "size", label: "File size", icon: HardDrive },
];

const NO_SUBJECT = "__none__";

function NotesPage() {
  const notes = useNotes((n) => n);
  const subjects = useStore((s) => s.subjects);
  const router = useRouter();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; keyIssue: boolean } | null>(null);
  const [uploadSubject, setUploadSubject] = useState("");
  const [lastFiles, setLastFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<{ cur: number; total: number } | null>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Ticking elapsed counter so a long extraction never looks frozen.
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);


  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const allSelected = useMemo(
    () => notes.length > 0 && notes.every((n) => picked.has(n.id)),
    [notes, picked],
  );

  const sorted = useMemo(() => {
    const list = [...notes];
    if (sort === "az") list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "size") list.sort((a, b) => noteSize(b) - noteSize(a));
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [notes, sort]);

  /** Full-text search across titles, file names and note content. */
  const q = query.trim().toLowerCase();
  const matched = useMemo(() => {
    if (!q) return sorted;
    return sorted.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.fileName.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        Object.values(n.outputs ?? {}).some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [sorted, q]);

  /** Notes grouped by subject, in the order subjects were created, then "No subject". */
  const groups = useMemo(() => {
    const out: { key: string; name: string; color?: string; notes: Note[] }[] = [];
    for (const sub of subjects) {
      const items = matched.filter((n) => n.subjectId === sub.id);
      if (items.length) out.push({ key: sub.id, name: sub.name, color: sub.color, notes: items });
    }
    const known = new Set(subjects.map((s) => s.id));
    const rest = matched.filter((n) => !n.subjectId || !known.has(n.subjectId));
    if (rest.length) out.push({ key: NO_SUBJECT, name: "No subject", notes: rest });
    return out;
  }, [matched, subjects]);

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

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function startTest() {
    if (picked.size < 2) return;
    // Preserve the on-screen order so the "Testing you on" list reads naturally.
    const ordered = sorted.filter((n) => picked.has(n.id)).map((n) => n.id);
    navigate({ to: "/notes/test", search: { ids: ordered.join(",") } });
  }

  async function run(files: File[]) {
    if (files.length === 0 || busy) return;
    setError(null);
    setBusy(true);
    setElapsed(0);
    setProgress({ cur: 1, total: files.length });
    const seconds = estimateSeconds(files);
    setEstimate(seconds);
    setStage("Preparing your file…");
    try {
      const res = await extractTextFromFiles(files, getUserApiKey(), (s, cur, total) => {
        if (cur && total) setProgress({ cur, total });
        const suffix = cur && total && total > 1 ? ` (image ${cur} of ${total})` : "";
        setStage(
          (s === "compressing"
            ? "Shrinking your image…"
            : s === "reading"
              ? "Reading your image…"
              : s === "cached"
                ? "Found this file already — loading instantly…"
                : "Cleaning up notes…") + suffix,
        );
      });
      if (!res.ok) {
        setError({
          message: res.message,
          keyIssue: res.kind === "rate_limit" || res.kind === "bad_key",
        });
        return;
      }
      if (!res.text.trim()) {
        setError({ message: "We couldn't find any readable text in that file.", keyIssue: false });
        return;
      }
      const first = files[0];
      const title =
        files.length === 1
          ? first.name.replace(/\.[^.]+$/, "")
          : `${first.name.replace(/\.[^.]+$/, "")} + ${files.length - 1} more`;
      const fileName =
        files.length === 1 ? first.name : `${files.length} files`;
      const id = noteActions.add(title, res.text, fileName, {
        subjectId: uploadSubject,
        fileSize: files.reduce((sum, f) => sum + f.size, 0),
      });
      // File it under the best-matching syllabus chapter in the background.
      void autoFileNote(id, res.text, subjects.find((sb) => sb.id === uploadSubject));
      router.navigate({ to: "/notes/$noteId", params: { noteId: id } });
    } catch (e) {
      console.error(e);
      setError({ message: "Sorry, we couldn't read that file. Please try another one.", keyIssue: false });
    } finally {
      setBusy(false);
      setStage(null);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onPick(pickedFiles: FileList | null) {
    const files = pickedFiles ? Array.from(pickedFiles) : [];
    if (files.length === 0) return;
    setLastFiles(files);
    await run(files);
  }


  return (
    <AppShell title="Smart Notes" subtitle="Turn your files into simple study notes">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />

      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Upload a new note
      </h2>


      {subjects.length > 0 ? (
        <div className="mb-3">
          <label
            htmlFor="upload-subject"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground"
          >
            <BookOpen size={13} /> Subject for this upload
          </label>
          <select
            id="upload-subject"
            value={uploadSubject}
            onChange={(e) => setUploadSubject(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary"
          >
            <option value="">No subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="mb-3 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
          Add subjects on the{" "}
          <Link to="/subjects" className="font-semibold text-primary underline">
            Subjects
          </Link>{" "}
          page to file your notes under them.
        </p>
      )}

      <Button
        size="lg"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-2xl py-7 text-base font-bold"
      >
        {busy ? (
          <span className="flex items-center gap-2">
            <Loader2 className="animate-spin" size={20} /> {stage ?? "Reading your file…"}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Upload size={20} /> Upload file(s)
          </span>
        )}
      </Button>
      {busy ? (
        <div className="mt-3 rounded-2xl border border-border bg-card p-3">
          <p aria-live="polite" className="text-center text-xs font-semibold">
            {stage ?? "Working on it…"}
          </p>
          {progress && progress.total > 1 ? (
            <>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.round((progress.cur / progress.total) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-center text-[11px] font-mono text-muted-foreground">
                File {progress.cur} of {progress.total}
              </p>
            </>
          ) : (
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000"
                style={{
                  width: `${Math.min(95, Math.round((elapsed / Math.max(1, estimate ?? 10)) * 100))}%`,
                }}
              />
            </div>
          )}
          <p className="mt-1.5 text-center text-[11px] font-mono text-muted-foreground">
            {elapsed}s elapsed
            {estimate ? ` · estimated ${formatEstimate(estimate)}` : ""}
          </p>
        </div>
      ) : null}

      <div className="mt-3">
        <VoiceNoteButton
          disabled={busy}
          onNote={async (text) => {
            const stamp = new Date().toLocaleString(undefined, {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            const id = noteActions.add(`Voice note — ${stamp}`, text, "Voice recording", {
              subjectId: uploadSubject,
            });
            void autoFileNote(id, text, subjects.find((sb) => sb.id === uploadSubject));
            router.navigate({ to: "/notes/$noteId", params: { noteId: id } });
          }}
        />
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        PDF, Word, Excel or photos — pick several to combine them into one note.
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
          {lastFiles.length > 0 && (
            <Button
              size="lg"
              variant={error.keyIssue ? "outline" : "default"}
              disabled={busy}
              onClick={() => void run(lastFiles)}
              className="mt-3 w-full rounded-xl text-sm font-bold"
            >
              <RotateCcw size={16} /> Try reading{" "}
              {lastFiles.length === 1 ? "that file" : `those ${lastFiles.length} files`} again
            </Button>
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
              <h2 className="text-sm font-bold">Full Section Test</h2>
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

      {notes.length > 1 && (
        <div className="mt-6 flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Sort
          </span>
          <div className="flex flex-1 gap-1 rounded-full bg-muted p-1">
            {SORTS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSort(id)}
                aria-pressed={sort === id}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-bold transition",
                  sort === id
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Your notes
      </h2>

      {notes.length > 0 && (
        <div className="relative mt-3">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search inside all your notes…"
            aria-label="Search all notes"
            className="w-full rounded-xl border border-border bg-background py-3 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      )}

      {q && (
        <p className="mt-2 text-xs text-muted-foreground">
          {matched.length === 0
            ? "No notes match your search."
            : `${matched.length} ${matched.length === 1 ? "note" : "notes"} match "${query.trim()}"`}
        </p>
      )}

      <div className="mt-4 space-y-4 pb-4">
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

        {groups.map((group) => {
          const isOpen = !collapsed.has(group.key);
          return (
            <section key={group.key}>
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 rounded-xl px-1 py-2 text-left"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: group.color ?? "var(--color-muted-foreground)" }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{group.name}</span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                  {group.notes.length}
                </span>
                <ChevronDown
                  size={16}
                  className={cn(
                    "shrink-0 text-muted-foreground transition-transform",
                    !isOpen && "-rotate-90",
                  )}
                />
              </button>

              {isOpen && (
                <div className="space-y-3">
                  {group.notes.map((n) => {
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
                        <Link to="/notes/$noteId" params={{ noteId: n.id }} className="min-w-0 flex-1">
                          <p className="truncate text-base font-bold">{n.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {n.fileName} · {formatSize(noteSize(n))}
                          </p>
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
              )}
            </section>
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
