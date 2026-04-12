/**
 * Sync layer: localStorage ↔ Supabase kv_store
 *
 * - On init: pulls all keys from Supabase and updates localStorage (remote wins if newer)
 * - On save: writes localStorage immediately + pushes to Supabase in background
 * - Offline-safe: falls back to localStorage if Supabase is unreachable
 */

import { supabase } from "./supabase";

function getUserId(): string {
  // Try to get from Supabase Auth session first
  try {
    const raw = localStorage.getItem("sb-qniyqmszqmqetimfrljf-auth-token");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.user?.id) return parsed.user.id;
    }
  } catch {}
  return process.env.NEXT_PUBLIC_USER_ID || "00000000-0000-0000-0000-000000000001";
}
const TS_PREFIX = "__sync_ts:";

let _synced = false;
let _syncing = false;
let _useRemote = false;

/** Get the local timestamp for a key */
function getLocalTs(key: string): number {
  try {
    return Number(localStorage.getItem(TS_PREFIX + key) || "0");
  } catch { return 0; }
}

function setLocalTs(key: string) {
  try {
    localStorage.setItem(TS_PREFIX + key, String(Date.now()));
  } catch {}
}

/**
 * Pull all kv_store entries from Supabase and update localStorage.
 * Should be called once on app startup.
 */
export async function initSync(keys: string[]): Promise<void> {
  if (_synced || _syncing) return;
  _syncing = true;

  try {
    const { data, error } = await supabase
      .from("kv_store")
      .select("key, value, updated_at")
      .eq("user_id", getUserId())
      .in("key", keys);

    if (error) throw error;

    _useRemote = true;

    if (data && data.length > 0) {
      for (const row of data) {
        const remoteTs = new Date(row.updated_at).getTime();
        const localTs = getLocalTs(row.key);

        if (remoteTs >= localTs) {
          // Remote is newer or equal — use remote
          localStorage.setItem(row.key, JSON.stringify(row.value));
          localStorage.setItem(TS_PREFIX + row.key, String(remoteTs));
        } else {
          // Local is newer — push local to remote
          try {
            const localData = localStorage.getItem(row.key);
            if (localData) {
              supabase.from("kv_store").upsert({
                user_id: getUserId(),
                key: row.key,
                value: JSON.parse(localData),
                updated_at: new Date(localTs).toISOString(),
              }).then(() => {});
            }
          } catch {}
        }
      }
    }

    // Push local-only keys that don't exist in remote
    for (const key of keys) {
      const exists = data?.some(r => r.key === key);
      if (!exists) {
        try {
          const localData = localStorage.getItem(key);
          if (localData) {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed) ? parsed.length > 0 : Object.keys(parsed).length > 0) {
              supabase.from("kv_store").upsert({
                user_id: getUserId(),
                key,
                value: parsed,
                updated_at: new Date().toISOString(),
              }).then(() => {});
            }
          }
        } catch {}
      }
    }
  } catch {
    _useRemote = false;
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.warn("[Sync] Supabase unreachable, using localStorage only");
    }
  }

  _synced = true;
  _syncing = false;
}

/**
 * Save data to localStorage + Supabase (background).
 */
export function syncSave<T>(key: string, data: T): void {
  // Always save to localStorage first (instant)
  localStorage.setItem(key, JSON.stringify(data));
  setLocalTs(key);

  // Push to Supabase in background
  if (_useRemote) {
    supabase.from("kv_store").upsert({
      user_id: getUserId(),
      key,
      value: data as any,
      updated_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error && process.env.NODE_ENV === "development") {
        console.warn("[Sync] Push failed for", key, error.message);
      }
    });
  }
}

/**
 * Load data from localStorage (already synced on init).
 */
export function syncLoad<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : seed;
  } catch { return seed; }
}

export function isSynced(): boolean { return _synced; }
export function isRemoteAvailable(): boolean { return _useRemote; }
