import { useSyncExternalStore } from "react";
import { syncData } from "./sync-bridge";

export type NoteOutputs = Partial<
  Record<"summary" | "details" | "flashcards" | "quiz" | "diagram", string>
>;

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
  /** Set when the note is moved to Recently Deleted (ISO date). */
  deletedAt?: string;
}

const KEY = "study-planner-notes-v1";

/** How long a deleted note stays restorable. */
export const TRASH_DAYS = 30;

const EMPTY: Note[] = [];
/** Every note, including the soft-deleted ones. */
let all: Note[] = load();
let notes: Note[] = [];
let trash: Note[] = [];
const listeners = new Set<() => void>();

function expired(n: Note): boolean {
  if (!n.deletedAt) return false;
  const ms = Date.now() - new Date(n.deletedAt).getTime();
  return ms > TRASH_DAYS * 24 * 60 * 60 * 1000;
}

function derive() {
  all = all.filter((n) => !expired(n));
  notes = all.filter((n) => !n.deletedAt);
  trash = all
    .filter((n) => n.deletedAt)
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}

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

derive();

function persist() {
  derive();
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
  syncData("notes", all);
  listeners.forEach((l) => l());
}

export function hydrateNotes(value: unknown) {
  all = Array.isArray(value) ? (value as Note[]) : [];
  derive();
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useNotes<T>(selector: (n: Note[]) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(notes),
    () => selector(EMPTY),
  );
}

/** Soft-deleted notes, newest first. */
export function useTrashedNotes<T>(selector: (n: Note[]) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(trash),
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
    all = [
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
      ...all,
    ];
    persist();
    return id;
  },
  /** Replaces the cleaned note content (manual edit). */
  setContent(id: string, content: string) {
    all = all.map((n) => (n.id === id ? { ...n, content } : n));
    persist();
  },
  setChapter(id: string, chapter: string) {
    all = all.map((n) => (n.id === id ? { ...n, chapter: chapter || undefined } : n));
    persist();
  },
  /** Soft delete — the note moves to Recently Deleted for 30 days. */
  remove(id: string) {
    all = all.map((n) => (n.id === id ? { ...n, deletedAt: new Date().toISOString() } : n));
    persist();
  },
  restore(id: string) {
    all = all.map((n) => (n.id === id ? { ...n, deletedAt: undefined } : n));
    persist();
  },
  /** Permanently removes a note (from Recently Deleted). */
  purge(id: string) {
    all = all.filter((n) => n.id !== id);
    persist();
  },
  purgeAllDeleted() {
    all = all.filter((n) => !n.deletedAt);
    persist();
  },
  rename(id: string, title: string) {
    const t = title.trim();
    if (!t) return;
    all = all.map((n) => (n.id === id ? { ...n, title: t } : n));
    persist();
  },
  setSubject(id: string, subjectId: string) {
    all = all.map((n) => (n.id === id ? { ...n, subjectId: subjectId || undefined } : n));
    persist();
  },
  setOutput(id: string, mode: keyof NoteOutputs, text: string) {
    all = all.map((n) => (n.id === id ? { ...n, outputs: { ...n.outputs, [mode]: text } } : n));
    persist();
  },
};

/** Days left before a deleted note is purged for good. */
export function daysLeft(n: Note): number {
  if (!n.deletedAt) return TRASH_DAYS;
  const ms = Date.now() - new Date(n.deletedAt).getTime();
  return Math.max(0, TRASH_DAYS - Math.floor(ms / (24 * 60 * 60 * 1000)));
}

/** Rough size of a note in bytes — falls back to the cleaned text length. */
export function noteSize(n: Note): number {
  return n.fileSize ?? n.content.length;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
