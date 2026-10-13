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
 * read-only and offer to return to that tab. A reloading page waits briefly, because the page it replaces
 * releases the lock as it closes. Without the Locks API every tab may write.
 * Claiming again from the same page (a retry after storage timed out) reuses the claim instead of
 * queueing behind its own lock. A "taken" claim is not kept, so a retry can win once the other tab closes.
 */
export function claimWriter(name = "tether-writer", waitMs = 1500): Promise<Claim> {
  let claim = claims.get(name);
  if (!claim) {
    claim = requestWriter(name, waitMs);
    claims.set(name, claim);
    void claim.then((r) => r === "taken" && claims.delete(name));
  }
  return claim;
}

type Claim = "owner" | "taken" | "unsupported";
const claims = new Map<string, Promise<Claim>>();

function requestWriter(name: string, waitMs: number): Promise<Claim> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks) return Promise.resolve("unsupported");
  const hold = (resolve: (r: "owner") => void) => () => {
    resolve("owner");
    return new Promise<void>(() => {}); // held for the life of the page
  };
  return new Promise((resolve) => {
    if (typeof AbortSignal.timeout !== "function") {
      void locks.request(name, { ifAvailable: true }, (lock) => (lock ? hold(resolve)() : resolve("taken")));
      return;
    }
    locks.request(name, { signal: AbortSignal.timeout(waitMs) }, hold(resolve)).catch(() => resolve("taken"));
  });
}
