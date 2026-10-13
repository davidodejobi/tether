// Local interaction sounds (spec section 14a), synthesized by Cuelume. Browser effects live here, never in src/rules.
// A cue is a harmless request: it plays only when sounds are on, the tab is visible, nothing is being read aloud and no
// proof run is active. It never throws, never waits, and never changes a score, dot, help, timer or claim sample.
import { play, setEnabled, setVolume, unlock, type Emphasis, type SoundName } from "cuelume";
import { readingAloud } from "./speech.ts";

/** tap/select: a deliberate action. correct/tryAgain: after an answer's save succeeded. celebrate: after a completed result saved. */
export type Cue = "tap" | "select" | "toggle" | "correct" | "tryAgain" | "celebrate";

const VOLUME = 0.2; // fixed and quiet; there is no volume setting
const PLAY: Record<Cue, [SoundName, { emphasis: Emphasis }]> = {
  tap: ["tap", { emphasis: "subtle" }],
  select: ["select", { emphasis: "subtle" }],
  toggle: ["toggle", { emphasis: "subtle" }],
  correct: ["success", { emphasis: "subtle" }],
  tryAgain: ["warning", { emphasis: "subtle" }],
  celebrate: ["success", { emphasis: "strong" }],
};
// When two cues are requested by one action (a button tap, then the round celebration), the larger one plays alone.
const RANK: Record<Cue, number> = { tap: 0, select: 0, toggle: 0, tryAgain: 1, correct: 1, celebrate: 2 };

let on = false;
let proof = false;
let pending: Cue | null = null;

const allowed = () => on && !proof && !(typeof document !== "undefined" && document.visibilityState === "hidden") && !readingAloud();

try {
  setVolume(VOLUME);
} catch {}

/** Mirrors the saved Sounds setting. Off is immediate: ringing and pending cues stop. */
export function setSoundsOn(value: boolean) {
  on = value;
  if (!value) pending = null;
  try {
    setEnabled(value);
  } catch {}
}

/** Call inside the click that turns Sounds on, so the browser lets audio start. Never rejects. */
export function unlockSound(): void {
  try {
    void unlock().catch(() => {});
  } catch {}
}

/**
 * The proof boundary for solo checks and rechecks (steps 11-13). While true, every cue is silent, including
 * celebrate. Turn it off when the run ends, then call cue("celebrate") from the action that saved the result.
 */
export function setProofMode(active: boolean) {
  proof = active;
  if (active) pending = null;
}

/** Requests a cue from a user action or a successful save, never from render or restore. */
export function cue(name: Cue): void {
  if (!allowed()) return;
  if (pending === null) queueMicrotask(flush);
  if (pending === null || RANK[name] > RANK[pending]) pending = name;
}

function flush() {
  const name = pending;
  pending = null;
  if (!name || !allowed()) return; // muted or suppressed since it was requested
  try {
    (globalThis as { __soundLog?: string[] }).__soundLog?.push(name); // tests only: they define the array
    play(...PLAY[name]);
  } catch {}
}

// Browsers start audio only after a gesture; unlock on the first one when sounds are on.
if (typeof window !== "undefined") {
  const first = () => {
    if (on) unlockSound();
    for (const t of ["pointerdown", "keydown"]) window.removeEventListener(t, first, true);
  };
  for (const t of ["pointerdown", "keydown"]) window.addEventListener(t, first, true);
}
