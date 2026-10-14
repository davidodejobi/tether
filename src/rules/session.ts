// Local session measure (spec section 15): a session ends on Done for today or after 30 minutes of inactivity.
// Hidden time is not interaction time, so it is taken off the gap since the last touch.
export interface Session {
  start: number;
  last: number;
  /** Visible time between touches, in ms. */
  activeMs: number;
  end?: "done" | "idle";
}

export const IDLE_MS = 30 * 60_000;

/** An interaction at `now`; `hiddenMs` is how much of the gap since the last touch the page was hidden.
 *  `loadedAt` is when this page load began: time before it (the app was closed) is never active time. */
export function touch(list: readonly Session[], now: number, hiddenMs = 0, loadedAt = 0): Session[] {
  const cur = list.at(-1);
  if (cur && !cur.end && now - cur.last < IDLE_MS)
    return [...list.slice(0, -1), { ...cur, last: now, activeMs: cur.activeMs + Math.max(0, now - Math.max(cur.last, loadedAt) - hiddenMs) }];
  const closed = cur && !cur.end ? [...list.slice(0, -1), { ...cur, end: "idle" as const }] : [...list];
  return [...closed, { start: now, last: now, activeMs: 0 }];
}

export function endSession(list: readonly Session[]): Session[] {
  const cur = list.at(-1);
  return cur && !cur.end ? [...list.slice(0, -1), { ...cur, end: "done" }] : [...list];
}
