// What Home says about offline use (spec section 13). Pure: connectivity alone is never proof of a ready cache.
export type OfflineState = "unsupported" | "preparing" | "ready" | "partial" | "needsDownload";

export function offlineState(i: {
  supported: boolean;
  online: boolean;
  /** A service worker is active and has reported how many required entries are missing; null before it answers. */
  missing: number | null;
}): OfflineState {
  if (!i.supported) return "unsupported";
  if (i.missing === 0) return "ready";
  if (i.missing !== null) return "partial";
  return i.online ? "preparing" : "needsDownload";
}
