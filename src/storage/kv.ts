// Key-value storage: IndexedDB when it works, memory when it does not (spec section 13).
import { createStore, del, entries, get, set, setMany } from "idb-keyval";

export interface KV {
  entries(): Promise<[string, unknown][]>;
  /** Writes every entry in one transaction: all or nothing. */
  setMany(items: [string, unknown][]): Promise<void>;
}

export function idbKV(dbName: string): KV {
  const store = createStore(dbName, "records");
  return {
    entries: async () => (await entries(store)).map(([k, v]) => [String(k), v]),
    setMany: (items) => setMany(items, store),
  };
}

/** Progress that lasts only while the page is open. Values are copied, as IndexedDB would. */
export function memoryKV(): KV {
  const data = new Map<string, unknown>();
  return {
    entries: async () => [...data].map(([k, v]) => [k, structuredClone(v)]),
    setMany: async (items) => {
      for (const [k, v] of items) data.set(k, structuredClone(v));
    },
  };
}

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("storage timed out")), ms))]);

/**
 * Opens IndexedDB and proves it works with a write, read and delete. Missing, blocked or failing storage
 * falls back to memory with `durable: false`, so the app can say progress is temporary before learning starts.
 */
export async function openKV(dbName = "tether", timeoutMs = 3000): Promise<{ kv: KV; durable: boolean }> {
  try {
    if (typeof indexedDB === "undefined") throw new Error("IndexedDB unavailable");
    const store = createStore(dbName, "records");
    const probe = `meta:probe`;
    await withTimeout(
      (async () => {
        const value = Date.now();
        await set(probe, value, store);
        if ((await get(probe, store)) !== value) throw new Error("storage probe mismatch");
        await del(probe, store);
      })(),
      timeoutMs,
    );
    return { kv: idbKV(dbName), durable: true };
  } catch {
    return { kv: memoryKV(), durable: false };
  }
}
