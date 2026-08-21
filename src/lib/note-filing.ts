import { classifyChapter } from "./ai-extra.functions";
import { getUserApiKey } from "./ai-config";
import { noteActions } from "./notes-store";
import { UNSORTED_CHAPTER, syllabusFor, type ClassLevel } from "./syllabus";
import type { Subject } from "./store";

/**
 * Files a freshly-cleaned note under the best-matching syllabus chapter of its
 * subject using one lightweight Gemini classification call. Falls back to
 * "Unsorted" whenever there is no confident match (or the call fails) — the
 * user can always reassign manually.
 */
export async function autoFileNote(noteId: string, text: string, subject: Subject | undefined) {
  if (!subject) return;
  const level: ClassLevel = subject.classLevel ?? "matric";
  const fromSyllabus = syllabusFor(subject.name, level);
  const custom = subject.topics.map((t) => t.name);
  const chapters = [...new Set([...fromSyllabus, ...custom])].filter(Boolean);
  if (!chapters.length) return;

  try {
    const res = await classifyChapter({
      data: { text: text.slice(0, 12_000), chapters, apiKey: getUserApiKey() },
    });
    const match = res.ok ? res.text.trim() : "";
    noteActions.setChapter(noteId, match || UNSORTED_CHAPTER);
  } catch {
    noteActions.setChapter(noteId, UNSORTED_CHAPTER);
  }
}

/** Chapter options for a subject, including "Unsorted". */
export function chapterOptions(subject: Subject | undefined): string[] {
  if (!subject) return [UNSORTED_CHAPTER];
  const chapters = [
    ...syllabusFor(subject.name, subject.classLevel ?? "matric"),
    ...subject.topics.map((t) => t.name),
  ].filter(Boolean);
  return [...new Set([...chapters, UNSORTED_CHAPTER])];
}
