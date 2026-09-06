/**
 * Records the outcome of every AI request the app makes (reading a file,
 * summaries, quizzes, diagrams…) so the performance page can show how often
 * things succeed, time out or fail, and how long they take.
 * Kept on the device, capped at the most recent 300 calls.
 */
import { useEffect, useState } from "react";

export type AiOutcome = "ok" | "timeout" | "error";

export interface AiCall {
  feature: string;
  outcome: AiOutcome;
  ms: number;
  at: string;
}

const KEY = "sophia.ai-metrics.v1";
const MAX = 300;
const EVENT = "sophia-ai-metrics";

function load(): AiCall[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as AiCall[]) : [];
  } catch {
    return [];
  }
}

/** Turns an error/failure message into one of the three outcomes. */
export function outcomeFromMessage(message?: string | null): AiOutcome {
  return message && /time limit|timed out|took too long|timeout/i.test(message) ? "timeout" : "error";
}

export function recordAiCall(feature: string, outcome: AiOutcome, ms: number) {
  if (typeof window === "undefined") return;
  const list = [{ feature, outcome, ms: Math.round(ms), at: new Date().toISOString() }, ...load()].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function clearAiCalls() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Times an AI call and records whether it worked. */
export async function trackAi<T extends { ok?: boolean; message?: string }>(
  feature: string,
  run: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    const res = await run();
    const ok = res?.ok !== false;
    recordAiCall(feature, ok ? "ok" : outcomeFromMessage(res?.message), Date.now() - started);
    return res;
  } catch (e) {
    recordAiCall(feature, outcomeFromMessage(e instanceof Error ? e.message : null), Date.now() - started);
    throw e;
  }
}

export function useAiCalls(): AiCall[] {
  const [calls, setCalls] = useState<AiCall[]>([]);
  useEffect(() => {
    const read = () => setCalls(load());
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return calls;
}

export interface AiSummary {
  total: number;
  ok: number;
  timeout: number;
  error: number;
  avgMs: number;
  avgOkMs: number;
  slowestMs: number;
  successRate: number;
}

export function summarise(calls: AiCall[]): AiSummary {
  const total = calls.length;
  const ok = calls.filter((c) => c.outcome === "ok");
  const timeout = calls.filter((c) => c.outcome === "timeout").length;
  const error = calls.filter((c) => c.outcome === "error").length;
  const avg = (list: AiCall[]) =>
    list.length ? Math.round(list.reduce((s, c) => s + c.ms, 0) / list.length) : 0;
  return {
    total,
    ok: ok.length,
    timeout,
    error,
    avgMs: avg(calls),
    avgOkMs: avg(ok),
    slowestMs: calls.reduce((m, c) => Math.max(m, c.ms), 0),
    successRate: total ? Math.round((ok.length / total) * 100) : 0,
  };
}

/** Per-feature breakdown, busiest first. */
export function byFeature(calls: AiCall[]): { feature: string; summary: AiSummary }[] {
  const groups = new Map<string, AiCall[]>();
  for (const c of calls) {
    const list = groups.get(c.feature) ?? [];
    list.push(c);
    groups.set(c.feature, list);
  }
  return [...groups.entries()]
    .map(([feature, list]) => ({ feature, summary: summarise(list) }))
    .sort((a, b) => b.summary.total - a.summary.total);
}

export const FEATURE_LABEL: Record<string, string> = {
  extractFileText: "Reading uploaded files",
  cleanNoteText: "Tidying up notes",
  summary: "Summaries",
  details: "Key details",
  flashcards: "Flashcards",
  quiz: "Quizzes",
  diagram: "Diagrams",
  sectionTest: "Full section tests",
  assistant: "AI assistant",
  cheatSheet: "Cheat sheets",
};

export function featureLabel(feature: string): string {
  return FEATURE_LABEL[feature] ?? feature;
}

export function formatMs(ms: number): string {
  if (!ms) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}
