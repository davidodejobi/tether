// Proof stamps, day-3/7/14 rechecks and recovery (spec section 9).
// Dates are calendar dates in the time zone saved with the cycle, never multiples of 24 hours.
import type { Run } from "./runs.ts";

export type ProofState = "proved" | "held" | "fading";

export interface ScheduleEntry {
  id: string;
  day: 3 | 7 | 14;
  /** YYYY-MM-DD in the cycle's time zone; due from that date's midnight. */
  due: string;
  status: "scheduled" | "passed" | "missed" | "paused";
  runId?: string;
}

export interface ProofCycle {
  moveId: string;
  timeZone: string;
  state: ProofState;
  earnedOn: string;
  anchor: string;
  entries: ScheduleEntry[];
  /** Every completed run applied to this cycle, keyed by run ID so results apply once. */
  history: { runId: string; kind: Run["kind"]; purpose?: Run["purpose"]; on: string; passed: boolean; entryIds: string[] }[];
}

const DAYS = [3, 7, 14] as const;

export function civilDate(at: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function schedule(anchor: string): ScheduleEntry[] {
  return DAYS.map((day) => ({ id: `${anchor}+${day}`, day, due: addDays(anchor, day), status: "scheduled" }));
}

/** Scheduled entries due today or earlier. Paused entries (after a miss) are never due. */
export function dueEntries(cycle: ProofCycle, now: number): ScheduleEntry[] {
  const today = civilDate(now, cycle.timeZone);
  return cycle.entries.filter((e) => e.status === "scheduled" && e.due <= today);
}

/** The state shown on Home. Due and overdue are badges; lateness never changes the state. */
export function proofStatus(cycle: ProofCycle | null, now: number) {
  if (!cycle) return null;
  const today = civilDate(now, cycle.timeZone);
  const due = dueEntries(cycle, now);
  const next = cycle.entries.filter((e) => e.status === "scheduled" && e.due > today).sort((a, b) => (a.due < b.due ? -1 : 1))[0];
  return { state: cycle.state, due: due.length > 0, overdue: due.some((e) => e.due < today), nextDue: next?.due ?? null };
}

/**
 * The recheck the learner may start now: recovery while Fading (any time), a scheduled check covering every
 * due entry, or null before anything is due (offer practice or solo instead).
 */
export function recheckAvailable(cycle: ProofCycle | null, now: number): { purpose: "scheduled" | "recovery"; entryIds: string[] } | null {
  if (!cycle) return null;
  if (cycle.state === "fading") return { purpose: "recovery", entryIds: [] };
  const due = dueEntries(cycle, now);
  return due.length ? { purpose: "scheduled", entryIds: due.map((e) => e.id) } : null;
}

/** Rechecks alternate 3 singular + 2 plural and 2 + 3. Returns which of the two shapes to use next. */
export function recheckShapeIndex(cycle: ProofCycle | null): 0 | 1 {
  return ((cycle?.history.filter((h) => h.kind === "recheck").length ?? 0) % 2) as 0 | 1;
}

/**
 * Applies a finished run to the proof cycle. Returns the cycle unchanged for runs that were converted, exited
 * or already applied. `timeZone` is used only when a first solo pass creates the cycle.
 */
export function applyRun(cycle: ProofCycle | null, run: Run, moveId: string, timeZone: string): ProofCycle | null {
  if (run.status !== "completed" || !run.result || run.endedAt === undefined) return cycle;
  if (cycle?.history.some((h) => h.runId === run.id)) return cycle;
  const passed = run.result.passed;

  if (run.kind === "solo") {
    if (!cycle) {
      if (!passed) return null;
      const on = civilDate(run.endedAt, timeZone);
      return {
        moveId,
        timeZone,
        state: "proved",
        earnedOn: on,
        anchor: on,
        entries: schedule(on),
        history: [{ runId: run.id, kind: "solo", on, passed, entryIds: [] }],
      };
    }
    // A repeat solo keeps the state and dates, pass or fail; only a completed recheck can fade proof.
    const on = civilDate(run.endedAt, cycle.timeZone);
    return { ...cycle, history: [...cycle.history, { runId: run.id, kind: "solo", on, passed, entryIds: [] }] };
  }

  if (!cycle) return null;
  const on = civilDate(run.endedAt, cycle.timeZone);
  const covered = new Set(run.coveredEntryIds ?? []);
  const record = { runId: run.id, kind: "recheck" as const, purpose: run.purpose, on, passed, entryIds: [...covered] };

  if (run.purpose === "recovery") {
    if (!passed) return { ...cycle, history: [...cycle.history, record] };
    return { ...cycle, state: "held", anchor: on, entries: [...cycle.entries, ...schedule(on)], history: [...cycle.history, record] };
  }

  const entries = cycle.entries.map((e): ScheduleEntry => {
    if (covered.has(e.id)) return { ...e, status: passed ? "passed" : "missed", runId: run.id };
    if (!passed && e.status === "scheduled") return { ...e, status: "paused" };
    return e;
  });
  return { ...cycle, state: passed ? "held" : "fading", entries, history: [...cycle.history, record] };
}

/** An instant that falls on `date` in `timeZone` (as close to local noon as the zone allows). For simulated dates and tests. */
export function atCivilDate(date: string, timeZone: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const noonUtc = Date.UTC(y, m - 1, d, 12);
  for (const h of [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6, -7, 7, -8, 8, -9, 9, -10, 10, -11, 11, -12, 12, -13, 13, -14, 14]) {
    const t = noonUtc + h * 3_600_000;
    if (civilDate(t, timeZone) === date) return t;
  }
  throw new Error(`No instant on ${date} in ${timeZone}`);
}

export type HomeAction = "continue" | "recheck" | "recover" | "practice";

/** Home's one primary action (spec section 10): continue active practice, then recheck if due, then recover if Fading, else practice. */
export function homeAction(cycle: ProofCycle | null, now: number, hasActivePractice: boolean): HomeAction {
  if (hasActivePractice) return "continue";
  const r = recheckAvailable(cycle, now);
  return r ? (r.purpose === "recovery" ? "recover" : "recheck") : "practice";
}
