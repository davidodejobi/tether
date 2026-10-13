// Checkpoint snapshots and gap comparisons (spec section 8).
import type { Run } from "./runs.ts";

export interface Snapshot {
  runId: string;
  at: number;
  /** "With help" captured at solo entry; null when fewer than ten practice questions existed. */
  practice: number | null;
  alone: number;
  /** practice − alone; can be negative. Null without a practice score. */
  raw: number | null;
  /** max(0, raw). */
  gap: number | null;
}

/** The snapshot saved with a completed solo run. Converted or exited runs have none. */
export function snapshotOf(run: Run): Snapshot | null {
  if (run.kind !== "solo" || run.status !== "completed" || !run.result) return null;
  const practice = run.practiceSnapshot ?? null;
  const raw = practice === null ? null : practice - run.result.score;
  return { runId: run.id, at: run.endedAt!, practice, alone: run.result.score, raw, gap: raw === null ? null : Math.max(0, raw) };
}

export type Comparison =
  | { kind: "none" }
  | { kind: "aloneOnly"; latest: Snapshot }
  | { kind: "first"; latest: Snapshot }
  | { kind: "later"; latest: Snapshot; previous: Snapshot; improved: boolean; aloneFell: boolean };

/**
 * Compares the latest solo with the one immediately before it, only when both have practice scores.
 * A shrinking gap counts as improvement only if alone has not fallen.
 */
export function compare(snapshots: readonly Snapshot[]): Comparison {
  const ordered = [...snapshots].sort((x, y) => x.at - y.at);
  const latest = ordered.at(-1);
  if (!latest) return { kind: "none" };
  if (latest.gap === null) return { kind: "aloneOnly", latest };
  const previous = ordered.at(-2);
  if (!previous || previous.gap === null) return { kind: "first", latest };
  const aloneFell = latest.alone < previous.alone;
  return { kind: "later", latest, previous, aloneFell, improved: latest.gap < previous.gap && !aloneFell };
}
