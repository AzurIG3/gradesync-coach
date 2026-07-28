import { useSyncExternalStore } from "react";

export type NoteOutputs = Partial<Record<"summary" | "details" | "flashcards" | "quiz", string>>;

export interface Note {
  id: string;
  title: string;
  content: string;
  fileName: string;
  createdAt: string;
  outputs: NoteOutputs;
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
  add(title: string, content: string, fileName: string): string {
    const id = uid();
    notes = [
      { id, title, content, fileName, createdAt: new Date().toISOString(), outputs: {} },
      ...notes,
    ];
    persist();
    return id;
  },
  remove(id: string) {
    notes = notes.filter((n) => n.id !== id);
    persist();
  },
  setOutput(id: string, mode: keyof NoteOutputs, text: string) {
    notes = notes.map((n) => (n.id === id ? { ...n, outputs: { ...n.outputs, [mode]: text } } : n));
    persist();
  },
};
