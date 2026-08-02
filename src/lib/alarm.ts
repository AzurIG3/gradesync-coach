/**
 * Alarm sounds for the Focus Timer.
 *
 * Built-in sounds are synthesised with the Web Audio API (no assets to
 * download, works offline). Users can also upload their own MP3/WAV, which is
 * stored per device in IndexedDB and played back with an <audio> element.
 */

export type BuiltInAlarmId = "chime" | "classic" | "bell" | "digital";
export type AlarmId = BuiltInAlarmId | "custom";

export const ALARM_OPTIONS: { id: BuiltInAlarmId; label: string; description: string }[] = [
  { id: "chime", label: "Gentle chime", description: "Soft three-note chime" },
  { id: "bell", label: "Soft bell", description: "Warm single bell, fades out" },
  { id: "classic", label: "Classic alarm", description: "Repeating two-tone ring" },
  { id: "digital", label: "Digital beeps", description: "Short, crisp beeps" },
];

const STORAGE_KEY = "study-planner-alarm-sound";

export function getAlarmSound(): AlarmId {
  if (typeof window === "undefined") return "chime";
  try {
    const v = localStorage.getItem(STORAGE_KEY) as AlarmId | null;
    if (v === "custom") return "custom";
    return v && ALARM_OPTIONS.some((o) => o.id === v) ? v : "chime";
  } catch {
    return "chime";
  }
}

export function setAlarmSound(id: AlarmId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

/* ---------------- custom uploaded sound (IndexedDB, per device) ---------------- */

export type CustomAlarm = { name: string; type: string; blob: Blob };

const DB_NAME = "sophia-alarm";
const STORE = "sounds";
const RECORD_ID = "custom";
/** Bigger files make the timer sluggish and can blow the storage quota. */
export const MAX_CUSTOM_BYTES = 5 * 1024 * 1024;

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) return resolve(null);
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function saveCustomAlarm(file: File): Promise<{ ok: boolean; message?: string }> {
  if (file.size > MAX_CUSTOM_BYTES) {
    return { ok: false, message: "That file is too big. Please pick one under 5 MB." };
  }
  if (!/^audio\//.test(file.type) && !/\.(mp3|wav|m4a|ogg)$/i.test(file.name)) {
    return { ok: false, message: "Please choose an MP3 or WAV audio file." };
  }
  const db = await openDb();
  if (!db) return { ok: false, message: "Your browser can't store a custom sound." };
  const record: CustomAlarm = { name: file.name, type: file.type || "audio/mpeg", blob: file };
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record, RECORD_ID);
    tx.oncomplete = () => {
      db.close();
      resolve({ ok: true });
    };
    tx.onerror = () => {
      db.close();
      resolve({ ok: false, message: "We couldn't save that sound. Please try another file." });
    };
  });
}

export async function loadCustomAlarm(): Promise<CustomAlarm | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(RECORD_ID);
    req.onsuccess = () => {
      db.close();
      const v = req.result as CustomAlarm | undefined;
      resolve(v && v.blob ? v : null);
    };
    req.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}

export async function clearCustomAlarm(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(RECORD_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

/* ---------------- playback ---------------- */

type Ctx = AudioContext;
let ctx: Ctx | null = null;

function getCtx(): Ctx | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  audio: Ctx,
  at: number,
  freq: number,
  duration: number,
  type: OscillatorType,
  peak = 0.25,
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(at);
  osc.stop(at + duration + 0.05);
}

function playBuiltIn(id: BuiltInAlarmId): void {
  const audio = getCtx();
  if (!audio) return;
  const t0 = audio.currentTime + 0.05;

  if (id === "chime") {
    [523.25, 659.25, 783.99].forEach((f, i) => tone(audio, t0 + i * 0.28, f, 0.9, "sine", 0.22));
    return;
  }
  if (id === "bell") {
    tone(audio, t0, 880, 2.2, "sine", 0.25);
    tone(audio, t0, 1760, 1.6, "sine", 0.08);
    tone(audio, t0, 2640, 1.0, "sine", 0.04);
    return;
  }
  if (id === "classic") {
    for (let i = 0; i < 6; i++) {
      tone(audio, t0 + i * 0.32, i % 2 ? 660 : 880, 0.25, "square", 0.16);
    }
    return;
  }
  // digital
  for (let i = 0; i < 4; i++) {
    tone(audio, t0 + i * 0.18, 1200, 0.1, "triangle", 0.2);
  }
}

let currentEl: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

/** Stops any custom sound that is currently playing. */
export function stopAlarm(): void {
  if (currentEl) {
    currentEl.pause();
    currentEl.currentTime = 0;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  currentEl = null;
}

/**
 * Plays whichever sound is currently selected (built-in or the user's upload).
 * Falls back to the gentle chime if a custom sound is selected but missing.
 */
export async function playAlarm(id: AlarmId = getAlarmSound()): Promise<void> {
  if (id !== "custom") {
    playBuiltIn(id);
    return;
  }
  const custom = await loadCustomAlarm();
  if (!custom) {
    playBuiltIn("chime");
    return;
  }
  try {
    stopAlarm();
    currentUrl = URL.createObjectURL(custom.blob);
    const el = new Audio(currentUrl);
    el.volume = 1;
    currentEl = el;
    el.onended = () => stopAlarm();
    await el.play();
  } catch (e) {
    console.error("Custom alarm playback failed, using built-in chime", e);
    playBuiltIn("chime");
  }
}

/** Unlocks audio playback on iOS/Chrome; call from a click handler. */
export function primeAudio(): void {
  getCtx();
}
