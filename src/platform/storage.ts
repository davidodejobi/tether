// Browser storage capabilities with fallbacks (spec section 13).

/**
 * Asks the browser to keep this site's storage. Call after the nickname is saved, not on load:
 * some browsers show a prompt. Never block on the answer.
 */
export async function requestPersistentStorage(): Promise<"persisted" | "notGranted" | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return "unsupported";
  try {
    if (await navigator.storage.persisted()) return "persisted";
    return (await navigator.storage.persist()) ? "persisted" : "notGranted";
  } catch {
    return "notGranted";
  }
}

/**
 * Only one tab may write learning progress. The first tab holds this lock until it closes; others open
 * read-only and offer to return to that tab. Without the Locks API every tab may write.
 */
export function claimWriter(name = "tether-writer"): Promise<"owner" | "taken" | "unsupported"> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks) return Promise.resolve("unsupported");
  return new Promise((resolve) => {
    void locks.request(name, { ifAvailable: true }, (lock) => {
      if (!lock) {
        resolve("taken");
        return;
      }
      resolve("owner");
      return new Promise<void>(() => {}); // held for the life of the page
    });
  });
}
