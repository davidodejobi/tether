// Screen wake lock for solo checks and rechecks (spec section 7). Failure or no support never blocks a run:
// the caller shows a keep-the-screen-open note instead.
let lock: WakeLockSentinel | null = null;

/** True when the screen is being held awake. The browser drops the lock when the page hides, so call again on return. */
export async function acquireWake(): Promise<boolean> {
  try {
    if (lock && !lock.released) return true;
    lock = (await navigator.wakeLock?.request("screen")) ?? null;
    return lock !== null;
  } catch {
    return false;
  }
}

export function releaseWake() {
  void lock?.release().catch(() => {});
  lock = null;
}
