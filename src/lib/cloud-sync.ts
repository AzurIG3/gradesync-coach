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

export async function initializeAccountSync(userId: string) {
  if (!activeUserId) {
    anonymousSnapshot = Object.fromEntries(
      (Object.keys(STORAGE_KEYS) as SyncDataKey[]).map((key) => [key, readLocal(key)]),
    );
  }
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
}

export function stopAccountSync(restoreAnonymous = false) {
  activeUserId = null;
  registerSyncWriter(undefined);
  timers.forEach(clearTimeout);
  timers.clear();
  if (restoreAnonymous && anonymousSnapshot) {
    for (const [key, payload] of Object.entries(anonymousSnapshot)) {
      applyLocal(key as SyncDataKey, payload);
    }
    anonymousSnapshot = null;
  }
}