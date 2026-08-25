import { useSyncExternalStore } from "react";

export type NoteOutputs = Partial<Record<"summary" | "details" | "flashcards" | "quiz", string>>;

export interface Note {
  id: string;
  title: string;
  content: string;
  fileName: string;
  createdAt: string;
  outputs: NoteOutputs;
  /** Subject this note belongs to. Empty / missing means "General". */
  subjectId?: string;
  /** Original upload size in bytes (used for the "File size" sort). */
  fileSize?: number;
  /** Syllabus chapter this note was filed under ("Unsorted" when unclear). */
  chapter?: string;
}

const KEY = "study-planner-notes-v1";

const EMPTY: Note[] = [];
let notes: Note[] = load();
const listeners = new Set<() => void>();

function load(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(notes));
  } catch {}
  listeners.forEach((l) => l());
}

export function useNotes<T>(selector: (n: Note[]) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(notes),
    () => selector(EMPTY),
  );
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const noteActions = {
  add(
    title: string,
    content: string,
    fileName: string,
    meta?: { subjectId?: string; fileSize?: number },
  ): string {
    const id = uid();
    notes = [
      {
        id,
        title,
        content,
        fileName,
        createdAt: new Date().toISOString(),
        outputs: {},
        subjectId: meta?.subjectId || undefined,
        fileSize: meta?.fileSize,
      },
      ...notes,
    ];
    persist();
    return id;
  },
  /** Replaces the cleaned note content (manual edit). */
  setContent(id: string, content: string) {
    notes = notes.map((n) => (n.id === id ? { ...n, content } : n));
    persist();
  },
  setChapter(id: string, chapter: string) {
    notes = notes.map((n) => (n.id === id ? { ...n, chapter: chapter || undefined } : n));
    persist();
  },
  remove(id: string) {
    notes = notes.filter((n) => n.id !== id);
    persist();
  },
  rename(id: string, title: string) {
    const t = title.trim();
    if (!t) return;
    notes = notes.map((n) => (n.id === id ? { ...n, title: t } : n));
    persist();
  },
  setSubject(id: string, subjectId: string) {
    notes = notes.map((n) => (n.id === id ? { ...n, subjectId: subjectId || undefined } : n));
    persist();
  },
  setOutput(id: string, mode: keyof NoteOutputs, text: string) {
    notes = notes.map((n) => (n.id === id ? { ...n, outputs: { ...n.outputs, [mode]: text } } : n));
    persist();
  },
};

/** Rough size of a note in bytes — falls back to the cleaned text length. */
export function noteSize(n: Note): number {
  return n.fileSize ?? n.content.length;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
