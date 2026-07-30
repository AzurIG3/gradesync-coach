/**
 * "Focus mode" for the study timer.
 *
 * Browsers cannot mute the phone's system notifications, so this does the two
 * things a web app is allowed to do:
 *  1. suppress the app's own notifications/alerts while a session is running
 *  2. ask for notification permission so we can post a single silent
 *     "focus session" notice instead of noisy per-event ones
 */

let silenced = false;

export function isFocusSilenced(): boolean {
  return silenced;
}

export function setFocusSilenced(value: boolean): void {
  silenced = value;
}

/** Posts a notification unless focus mode is silencing them. */
export function notify(title: string, body?: string, opts?: NotificationOptions): void {
  if (silenced) return;
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, ...opts });
  } catch {}
}

/** Posts a notification even in focus mode (used for the session-ended alert). */
export function notifyAlways(title: string, body?: string): void {
  const was = silenced;
  silenced = false;
  notify(title, body);
  silenced = was;
}

export type NotifyPermission = "unsupported" | "default" | "granted" | "denied";

export function notifyPermission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifyPermission;
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    return (await Notification.requestPermission()) as NotifyPermission;
  } catch {
    return Notification.permission as NotifyPermission;
  }
}
