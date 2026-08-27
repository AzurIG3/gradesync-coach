export type SyncDataKey = "notes" | "planner" | "mastery" | "sessions";

let writer: ((key: SyncDataKey, payload: unknown) => void) | undefined;

export function registerSyncWriter(next?: (key: SyncDataKey, payload: unknown) => void) {
  writer = next;
}

export function syncData(key: SyncDataKey, payload: unknown) {
  writer?.(key, payload);
}