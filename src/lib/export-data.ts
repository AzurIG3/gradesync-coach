/**
 * Builds a single JSON export of everything this student's account holds
 * (notes, subjects, schedule, mastery, streaks, study sessions, settings).
 * Reads straight from the same localStorage keys the app syncs to the cloud,
 * so the file always matches what the user currently sees.
 */

export const EXPORT_KEYS: { key: string; label: string }[] = [
  { key: "study-planner-notes-v1", label: "notes" },
  { key: "study-planner-v1", label: "planner" },
  { key: "sophia.mastery.v1", label: "mastery" },
  { key: "sophia.sessions.v1", label: "studySessions" },
  { key: "sophia.srs.v1", label: "spacedRepetition" },
  { key: "sophia.highlights.v1", label: "highlights" },
  { key: "study-planner-lang", label: "language" },
  { key: "study-planner-theme", label: "theme" },
  { key: "sophia.palette.v1", label: "colourTheme" },
  { key: "study-planner-alarm-sound", label: "alarmSound" },
];

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

export function buildExport(email?: string | null) {
  const data: Record<string, unknown> = {};
  for (const { key, label } of EXPORT_KEYS) data[label] = read(key);
  return {
    app: "Matric Study Planner",
    exportedAt: new Date().toISOString(),
    account: email ?? "this device (not signed in)",
    version: 1,
    data,
  };
}

/** Triggers a browser download of the full export as one JSON file. */
export function downloadMyData(email?: string | null) {
  const payload = JSON.stringify(buildExport(email), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `study-planner-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
