/**
 * Per-note highlights.
 *
 * A highlight is simply the selected phrase. When the note renders we walk the
 * DOM and wrap matching text in <mark>, so highlights survive re-renders and
 * markdown formatting changes. localStorage only — works offline.
 */

import { useSyncExternalStore } from "react";

const KEY = "sophia.highlights.v1";
type Store = Record<string, string[]>;

const EMPTY: string[] = [];
let store: Store = load();
const listeners = new Set<() => void>();

function load(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useHighlights(noteId: string): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => store[noteId] ?? EMPTY,
    () => EMPTY,
  );
}

export const highlightActions = {
  add(noteId: string, phrase: string) {
    const text = phrase.replace(/\s+/g, " ").trim();
    if (text.length < 3) return;
    const existing = store[noteId] ?? [];
    if (existing.some((p) => p.toLowerCase() === text.toLowerCase())) return;
    store = { ...store, [noteId]: [...existing, text] };
    persist();
  },
  remove(noteId: string, phrase: string) {
    const existing = store[noteId] ?? [];
    store = {
      ...store,
      [noteId]: existing.filter((p) => p.toLowerCase() !== phrase.toLowerCase()),
    };
    persist();
  },
  clear(noteId: string) {
    store = { ...store, [noteId]: [] };
    persist();
  },
};

/** Wrap every occurrence of each phrase inside `root` in a <mark> element. */
export function paintHighlights(root: HTMLElement, phrases: string[]): void {
  for (const phrase of phrases) {
    const needle = phrase.toLowerCase();
    if (needle.length < 3) continue;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      if (node.parentElement?.closest("mark")) continue;
      const idx = node.data.toLowerCase().indexOf(needle);
      if (idx < 0) continue;
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + phrase.length);
      const mark = document.createElement("mark");
      mark.dataset["phrase"] = phrase;
      mark.className = "rounded bg-primary/25 px-0.5 text-foreground";
      try {
        range.surroundContents(mark);
      } catch {
        /* selection spanned elements — skip */
      }
    }
  }
}
