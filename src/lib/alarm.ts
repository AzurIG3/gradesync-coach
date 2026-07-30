/**
 * Built-in alarm sounds for the Focus Timer, synthesised with the Web Audio API
 * so there are no audio assets to download and they work offline.
 */

export type AlarmId = "chime" | "classic" | "bell" | "digital";

export const ALARM_OPTIONS: { id: AlarmId; label: string; description: string }[] = [
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

/** Plays the given alarm. Must be triggered after some user interaction. */
export function playAlarm(id: AlarmId = getAlarmSound()): void {
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

/** Unlocks audio playback on iOS/Chrome; call from a click handler. */
export function primeAudio(): void {
  getCtx();
}
