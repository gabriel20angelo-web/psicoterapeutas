/**
 * Sync layer: localStorage ↔ Supabase kv_store
 *
 * - On init: pulls the requested keys from Supabase and updates localStorage
 *   (remote wins if newer). Tracking is per-key, so multiple modules can
 *   initialize in parallel without stepping on each other.
 * - On save: writes localStorage immediately + pushes to Supabase in background.
 * - Offline-safe: falls back to localStorage if Supabase is unreachable.
 */

import { supabase } from "./supabase";

function getUserId(): string {
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

const _syncedKeys = new Set<string>();
const _inFlightKeys = new Map<string, Promise<void>>();
let _useRemote = false;
let _remoteProbed = false;

function getLocalTs(key: string): number {
  try {
    return Number(localStorage.getItem(TS_PREFIX + key) || "0");
  } catch {
    return 0;
  }
}

function setLocalTs(key: string) {
  try {
    localStorage.setItem(TS_PREFIX + key, String(Date.now()));
  } catch {}
}

/**
 * Pull the given keys from Supabase and update localStorage.
 * Multiple concurrent calls with overlapping keys are de-duplicated per key.
 */
export async function initSync(keys: string[]): Promise<void> {
  if (typeof window === "undefined") return;

  // Figure out which keys need a fresh sync and which are already in-flight
  const pendingForMe: string[] = [];
  const waits: Promise<void>[] = [];

  for (const k of keys) {
    if (_syncedKeys.has(k)) continue;
    const existing = _inFlightKeys.get(k);
    if (existing) {
      waits.push(existing);
      continue;
    }
    pendingForMe.push(k);
  }

  let selfPromise: Promise<void> | undefined;
  if (pendingForMe.length > 0) {
    selfPromise = doSync(pendingForMe).finally(() => {
      for (const k of pendingForMe) {
        _inFlightKeys.delete(k);
        _syncedKeys.add(k);
      }
    });
    for (const k of pendingForMe) _inFlightKeys.set(k, selfPromise);
  }

  if (selfPromise) waits.push(selfPromise);
  if (waits.length > 0) await Promise.all(waits);
}

async function doSync(keys: string[]): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("kv_store")
      .select("key, value, updated_at")
      .eq("user_id", getUserId())
      .in("key", keys);

    if (error) throw error;

    _useRemote = true;
    _remoteProbed = true;

    if (data && data.length > 0) {
      for (const row of data) {
        const remoteTs = new Date(row.updated_at).getTime();
        const localTs = getLocalTs(row.key);

        if (remoteTs >= localTs) {
          localStorage.setItem(row.key, JSON.stringify(row.value));
          localStorage.setItem(TS_PREFIX + row.key, String(remoteTs));
        } else {
          // Local é mais novo — re-enviar pro remote
          try {
            const localData = localStorage.getItem(row.key);
            if (localData) {
              supabase.from("kv_store").upsert({
                user_id: getUserId(),
                key: row.key,
                value: JSON.parse(localData),
                updated_at: new Date(localTs).toISOString(),
              }).then(({ error: upErr }) => {
                if (upErr && process.env.NODE_ENV === "development") {
                  console.warn("[Sync] re-push failed for", row.key, upErr.message);
                }
              });
            }
          } catch {}
        }
      }
    }

    // Push local-only keys que o Supabase ainda não tem
    for (const key of keys) {
      const exists = data?.some((r) => r.key === key);
      if (!exists) {
        try {
          const localData = localStorage.getItem(key);
          if (localData) {
            const parsed = JSON.parse(localData);
            const nonEmpty = Array.isArray(parsed)
              ? parsed.length > 0
              : typeof parsed === "object" && parsed !== null
                ? Object.keys(parsed).length > 0
                : false;
            if (nonEmpty) {
              supabase.from("kv_store").upsert({
                user_id: getUserId(),
                key,
                value: parsed,
                updated_at: new Date().toISOString(),
              }).then(({ error: upErr }) => {
                if (upErr && process.env.NODE_ENV === "development") {
                  console.warn("[Sync] initial push failed for", key, upErr.message);
                }
              });
            }
          }
        } catch {}
      }
    }
  } catch (e) {
    // Se é a primeira vez que probamos, marca remote indisponível
    if (!_remoteProbed) {
      _useRemote = false;
      _remoteProbed = true;
      if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
        console.warn("[Sync] Supabase unreachable, using localStorage only");
      }
    }
  }
}

/**
 * Save data to localStorage + Supabase (background).
 */
export function syncSave<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
  setLocalTs(key);

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
 * Load data from localStorage (já sincronizado no init).
 */
export function syncLoad<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : seed;
  } catch {
    return seed;
  }
}

export function isKeySynced(key: string): boolean {
  return _syncedKeys.has(key);
}

export function isRemoteAvailable(): boolean {
  return _useRemote;
}
