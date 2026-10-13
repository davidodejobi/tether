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

export type Opened =
  | { kv: KV; durable: true }
  /** Storage is missing or failing: progress lives in memory and the app must say so before learning starts. */
  | { kv: KV; durable: false; reason: "unavailable" }
  /** Storage did not answer in time and may already hold progress: offer retry, or memory only if the learner chooses. */
  | { kv: null; durable: false; reason: "timedOut" };

const TIMED_OUT = Symbol("timedOut");

async function probeIdb(dbName: string): Promise<void> {
  const store = createStore(dbName, "records");
  const key = "meta:probe";
  const value = Date.now();
  await set(key, value, store);
  if ((await get(key, store)) !== value) throw new Error("storage probe mismatch");
  await del(key, store);
}

/** Opens IndexedDB and proves it works with a write, read and delete before any progress is trusted to it. */
export async function openKV(dbName = "tether", timeoutMs = 3000, probe = probeIdb): Promise<Opened> {
  if (typeof indexedDB === "undefined") return { kv: memoryKV(), durable: false, reason: "unavailable" };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const outcome = await Promise.race([
      probe(dbName),
      new Promise<typeof TIMED_OUT>((resolve) => (timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs))),
    ]);
    if (outcome === TIMED_OUT) return { kv: null, durable: false, reason: "timedOut" };
    return { kv: idbKV(dbName), durable: true };
  } catch {
    return { kv: memoryKV(), durable: false, reason: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
