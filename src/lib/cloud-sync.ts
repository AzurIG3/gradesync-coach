import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { hydrateNotes } from "./notes-store";
import { hydrateStore } from "./store";
import { registerSyncWriter, type SyncDataKey } from "./sync-bridge";

const STORAGE_KEYS: Record<SyncDataKey, string> = {
  notes: "study-planner-notes-v1",
  planner: "study-planner-v1",
  mastery: "sophia.mastery.v1",
  sessions: "sophia.sessions.v1",
};
const OWNER_KEY = "sophia.sync.owner";

let activeUserId: string | null = null;
let anonymousSnapshot: Partial<Record<SyncDataKey, unknown>> | null = null;
const timers = new Map<SyncDataKey, ReturnType<typeof setTimeout>>();

function readLocal(key: SyncDataKey): unknown {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS[key]);
    return raw ? JSON.parse(raw) : key === "notes" || key === "sessions" ? [] : {};
  } catch {
    return key === "notes" || key === "sessions" ? [] : {};
  }
}

function emptyPayload(key: SyncDataKey): unknown {
  return key === "notes" || key === "sessions" ? [] : {};
}

function applyLocal(key: SyncDataKey, payload: unknown) {
  if (key === "notes") hydrateNotes(Array.isArray(payload) ? payload : []);
  else if (key === "planner") hydrateStore(payload);
  else {
    window.localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(payload));
    window.dispatchEvent(new Event("sophia-sync-update"));
  }
}

async function upload(key: SyncDataKey, payload: unknown) {
  if (!activeUserId) return;
  const { error } = await supabase.from("user_sync_data").upsert(
    { user_id: activeUserId, data_key: key, payload: payload as Json },
    { onConflict: "user_id,data_key" },
  );
  if (error) console.error("Account sync failed", error.message);
}

function scheduleUpload(key: SyncDataKey, payload: unknown) {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(() => void upload(key, payload), 350));
}

/** Pulls whatever the account holds and applies it to this device. */
export async function pullRemote(): Promise<boolean> {
  if (!activeUserId) return false;
  const { data, error } = await supabase
    .from("user_sync_data")
    .select("data_key,payload")
    .eq("user_id", activeUserId);
  if (error) {
    console.error("Account sync failed", error.message);
    return false;
  }
  for (const row of data ?? []) {
    applyLocal(row.data_key as SyncDataKey, row.payload);
  }
  lastPulledAt = new Date().toISOString();
  try {
    window.localStorage.setItem(LAST_PULL_KEY, lastPulledAt);
  } catch {}
  window.dispatchEvent(new Event("sophia-sync-pulled"));
  return true;
}

/** Re-checks the account whenever the student comes back to this tab. */
function startPullOnFocus() {
  if (pullListener) return;
  pullListener = () => {
    if (document.visibilityState === "visible") void pullRemote();
  };
  document.addEventListener("visibilitychange", pullListener);
  window.addEventListener("focus", pullListener);
}

export function lastSyncedAt(): string | null {
  if (lastPulledAt) return lastPulledAt;
  try {
    return window.localStorage.getItem(LAST_PULL_KEY);
  } catch {
    return null;
  }
}

export async function initializeAccountSync(userId: string) {
  if (!activeUserId) {
    const previousOwner = window.localStorage.getItem(OWNER_KEY);
    anonymousSnapshot = Object.fromEntries((Object.keys(STORAGE_KEYS) as SyncDataKey[]).map((key) => [
      key,
      previousOwner ? emptyPayload(key) : readLocal(key),
    ]));
  }
  window.localStorage.setItem(OWNER_KEY, userId);
  activeUserId = userId;
  registerSyncWriter(scheduleUpload);
  const { data, error } = await supabase
    .from("user_sync_data")
    .select("data_key,payload")
    .eq("user_id", userId);
  if (error) throw error;

  const remote = new Map((data ?? []).map((row) => [row.data_key as SyncDataKey, row.payload]));
  const keys = Object.keys(STORAGE_KEYS) as SyncDataKey[];
  for (const key of keys) {
    if (remote.has(key)) applyLocal(key, remote.get(key));
    else await upload(key, readLocal(key));
  }
  lastPulledAt = new Date().toISOString();
  try {
    window.localStorage.setItem(LAST_PULL_KEY, lastPulledAt);
  } catch {}
  startPullOnFocus();
}

export function stopAccountSync(restoreAnonymous = false) {
  activeUserId = null;
  registerSyncWriter(undefined);
  timers.forEach(clearTimeout);
  timers.clear();
  if (pullListener) {
    document.removeEventListener("visibilitychange", pullListener);
    window.removeEventListener("focus", pullListener);
    pullListener = null;
  }
  if (restoreAnonymous && anonymousSnapshot) {
    for (const [key, payload] of Object.entries(anonymousSnapshot)) {
      applyLocal(key as SyncDataKey, payload);
    }
    anonymousSnapshot = null;
  }
  if (restoreAnonymous) window.localStorage.removeItem(OWNER_KEY);
}
