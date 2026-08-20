import { useSyncExternalStore } from "react";
import { syllabusFor, type ClassLevel } from "./syllabus";
import { logSession } from "./sessions";

export type TopicStatus = "not_started" | "in_progress" | "completed";

export interface Topic {
  id: string;
  name: string;
  status: TopicStatus;
  /** True when the topic came from the built-in syllabus dataset. */
  fromSyllabus?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  examDate: string;
  topics: Topic[];
  /** Class level — drives the syllabus dataset and which resources are shown. */
  classLevel?: ClassLevel;
}

export interface DailyTask {
  id: string;
  date: string;
  subjectId: string;
  topicId: string;
  done: boolean;
}

export interface TimerPrefs {
  focusMin: number;
  breakMin: number;
}

export interface StudyState {
  subjects: Subject[];
  tasks: DailyTask[];
  hoursPerDay: number;
  onboarded: boolean;
  streakCount: number;
  streakLastDate: string;
  timer: TimerPrefs;
}

const KEY = "study-planner-v1";

const SUBJECT_COLORS = [
  "#60a5fa", "#34d399", "#fbbf24", "#f472b6",
  "#a78bfa", "#fb7185", "#22d3ee", "#84cc16",
];

const DEFAULTS: StudyState = {
  subjects: [],
  tasks: [],
  hoursPerDay: 2,
  onboarded: false,
  streakCount: 0,
  streakLastDate: "",
  timer: { focusMin: 25, breakMin: 5 },
};

let state: StudyState = load();
const listeners = new Set<() => void>();

function load(): StudyState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw), timer: { ...DEFAULTS.timer, ...(JSON.parse(raw).timer ?? {}) } };
  } catch {}
  return DEFAULTS;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
}

function setState(updater: (s: StudyState) => StudyState) {
  state = updater(state);
  persist();
}

export function useStore<T>(selector: (s: StudyState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
    () => selector(state),
  );
}

export function getState() {
  return state;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function nextColor(): string {
  return SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length];
}

export const actions = {
  addSubject(name: string, examDate: string, classLevel: ClassLevel = "matric") {
    // Auto-populate the chapter checklist from the built-in syllabus dataset.
    const chapters = syllabusFor(name, classLevel);
    const topics: Topic[] = chapters.map((c) => ({
      id: uid(),
      name: c,
      status: "not_started" as TopicStatus,
      fromSyllabus: true,
    }));
    setState((s) => ({
      ...s,
      subjects: [
        ...s.subjects,
        {
          id: uid(),
          name,
          examDate,
          classLevel,
          color: SUBJECT_COLORS[s.subjects.length % SUBJECT_COLORS.length],
          topics,
        },
      ],
    }));
  },
  /** Re-applies the syllabus dataset, keeping custom topics and progress. */
  syncSyllabus(subjectId: string) {
    setState((s) => ({
      ...s,
      subjects: s.subjects.map((sub) => {
        if (sub.id !== subjectId) return sub;
        const chapters = syllabusFor(sub.name, sub.classLevel ?? "matric");
        const have = new Set(sub.topics.map((t) => t.name.toLowerCase()));
        const added: Topic[] = chapters
          .filter((c) => !have.has(c.toLowerCase()))
          .map((c) => ({ id: uid(), name: c, status: "not_started" as TopicStatus, fromSyllabus: true }));
        return { ...sub, topics: [...sub.topics, ...added] };
      }),
    }));
  },
  updateSubject(id: string, patch: Partial<Omit<Subject, "id" | "topics">>) {
    setState((s) => ({
      ...s,
      subjects: s.subjects.map((sub) => (sub.id === id ? { ...sub, ...patch } : sub)),
    }));
  },
  deleteSubject(id: string) {
    setState((s) => ({
      ...s,
      subjects: s.subjects.filter((sub) => sub.id !== id),
      tasks: s.tasks.filter((t) => t.subjectId !== id),
    }));
  },
  addTopic(subjectId: string, name: string) {
    setState((s) => ({
      ...s,
      subjects: s.subjects.map((sub) =>
        sub.id === subjectId
          ? { ...sub, topics: [...sub.topics, { id: uid(), name, status: "not_started" }] }
          : sub,
      ),
    }));
  },
  setTopicStatus(subjectId: string, topicId: string, status: TopicStatus) {
    setState((s) => ({
      ...s,
      subjects: s.subjects.map((sub) =>
        sub.id === subjectId
          ? {
              ...sub,
              topics: sub.topics.map((t) => (t.id === topicId ? { ...t, status } : t)),
            }
          : sub,
      ),
    }));
  },
  deleteTopic(subjectId: string, topicId: string) {
    setState((s) => ({
      ...s,
      subjects: s.subjects.map((sub) =>
        sub.id === subjectId ? { ...sub, topics: sub.topics.filter((t) => t.id !== topicId) } : sub,
      ),
      tasks: s.tasks.filter((t) => t.topicId !== topicId),
    }));
  },
  setHoursPerDay(h: number) {
    setState((s) => ({ ...s, hoursPerDay: h }));
  },
  toggleTask(id: string) {
    const before = state.tasks.find((t) => t.id === id);
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
    const after = state.tasks.find((t) => t.id === id);
    if (after) {
      const sub = state.subjects.find((s) => s.id === after.subjectId);
      const topic = sub?.topics.find((tp) => tp.id === after.topicId);
      if (topic && after.done && topic.status !== "completed") {
        actions.setTopicStatus(after.subjectId, after.topicId, "in_progress");
      }
    }
    // Study history: a newly completed task counts as study activity.
    if (before && !before.done && after?.done) logSession("task");
    // Streak: when a task is newly completed for today, bump.
    const today = todayISO();
    if (before && !before.done && after?.done && after.date === today) {
      const y = addDaysISO(today, -1);
      setState((s) => {
        if (s.streakLastDate === today) return s;
        if (s.streakLastDate === y) return { ...s, streakCount: s.streakCount + 1, streakLastDate: today };
        return { ...s, streakCount: 1, streakLastDate: today };
      });
    }
  },
  setOnboarded() {
    setState((s) => ({ ...s, onboarded: true }));
  },
  setTimerPrefs(focusMin: number, breakMin: number) {
    setState((s) => ({ ...s, timer: { focusMin, breakMin } }));
  },
  regenerateSchedule() {
    const today = todayISO();
    const newTasks: DailyTask[] = [];
    for (const sub of state.subjects) {
      const pending = sub.topics.filter((t) => t.status !== "completed");
      if (pending.length === 0) continue;
      const days = Math.max(1, daysBetween(today, sub.examDate));
      const perDay = Math.max(1, Math.ceil(pending.length / days));
      let dayOffset = 0;
      let inDay = 0;
      for (const topic of pending) {
        if (inDay >= perDay) {
          inDay = 0;
          dayOffset++;
        }
        if (dayOffset >= days) dayOffset = days - 1;
        const date = addDaysISO(today, dayOffset);
        newTasks.push({
          id: uid(),
          date,
          subjectId: sub.id,
          topicId: topic.id,
          done: false,
        });
        inDay++;
      }
    }
    setState((s) => ({ ...s, tasks: newTasks }));
  },
  clearSchedule() {
    setState((s) => ({ ...s, tasks: [] }));
  },
};

export function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO);
  const b = new Date(toISO);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function addDaysISO(iso: string, days: number): string {
  const d = iso ? new Date(iso) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateLong(iso: string, locale?: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function subjectProgress(sub: Subject): number {
  if (sub.topics.length === 0) return 0;
  const done = sub.topics.filter((t) => t.status === "completed").length;
  return Math.round((done / sub.topics.length) * 100);
}

export function currentStreak(s: StudyState): number {
  const today = todayISO();
  const y = addDaysISO(today, -1);
  return s.streakLastDate === today || s.streakLastDate === y ? s.streakCount : 0;
}
