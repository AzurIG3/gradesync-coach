/**
 * Weekly study insights.
 *
 * Everything is derived from data the app already stores locally — session
 * history (focus timer + completed tasks) and quiz mastery. No AI calls.
 */

import { activityByDay } from "@/lib/sessions";
import { allMasteryStats, type MasteryStat } from "@/lib/mastery";

export interface WeeklyInsights {
  focusMinutes: number;
  prevFocusMinutes: number;
  /** Percentage change vs the previous 7 days (null when there is no baseline). */
  deltaPct: number | null;
  activeDays: number;
  tasks: number;
  sessions: number;
  strongest: MasteryStat | null;
  weakest: MasteryStat | null;
  hasData: boolean;
}

export function weeklyInsights(): WeeklyInsights {
  const days = activityByDay(14);
  const last7 = days.slice(-7);
  const prev7 = days.slice(0, 7);

  const sum = (rows: typeof days, key: "focusMinutes" | "tasks" | "focusSessions") =>
    rows.reduce((n, d) => n + d[key], 0);

  const focusMinutes = sum(last7, "focusMinutes");
  const prevFocusMinutes = sum(prev7, "focusMinutes");
  const stats = allMasteryStats().filter((s) => s.total >= 2);

  return {
    focusMinutes,
    prevFocusMinutes,
    deltaPct:
      prevFocusMinutes > 0
        ? Math.round(((focusMinutes - prevFocusMinutes) / prevFocusMinutes) * 100)
        : null,
    activeDays: last7.filter((d) => d.focusMinutes > 0 || d.tasks > 0).length,
    tasks: sum(last7, "tasks"),
    sessions: sum(last7, "focusSessions"),
    strongest: stats.length ? stats[stats.length - 1] : null,
    weakest: stats.length ? stats[0] : null,
    hasData: focusMinutes > 0 || sum(last7, "tasks") > 0 || stats.length > 0,
  };
}

export function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
