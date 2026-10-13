// What a saved run's result page shows (spec sections 8 and 9). Pure: reads saved progress, decides nothing new.
import { compare, snapshotOf, type Comparison, type Snapshot } from "../../rules/gap.ts";
import { inOrder } from "../../rules/moment.ts";
import { proofStatus, type ProofState } from "../../rules/proof.ts";
import { RUN_RULES } from "../../rules/runs.ts";
import type { Question } from "../../content/generate.ts";
import type { Progress, SavedRun } from "../../storage/progress.ts";

export type ShareKind = "proof" | "progress";

export const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const when = (at: number) => new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export interface Proof {
  state: ProofState;
  /** This solo pass created the proof cycle: the only result that celebrates "Proved". */
  earnedNow: boolean;
  earnedOn: string;
  /** YYYY-MM-DD of the next scheduled check, or null (Held with nothing left, or Fading). */
  nextDue: string | null;
}

export interface ResultView {
  saved: SavedRun;
  kind: "solo" | "recheck";
  score: number;
  total: number;
  pass: number;
  passed: boolean;
  timedOut: boolean;
  /** Solo that missed by one: "One more correct answer would pass". */
  oneAway: boolean;
  /** Solo only. Null for rechecks, which never touch alone or gap. */
  gap: null | {
    comparison: Comparison;
    snapshot: Snapshot;
    /** Alone equals or exceeds practice: gap zero, "No help gap on this check". */
    noGap: boolean;
  };
  proof: Proof | null;
  /** Missed or unanswered questions, in run order. */
  misses: Question[];
  /** Which shares the spec allows here (section 11): proof first, progress secondary; empty when none. */
  shares: ShareKind[];
}

/** Null when the run is unknown or has no result (active, converted or exited runs never reach the result page). */
export function resultView(p: Progress, runId: string, now: number): ResultView | null {
  const saved = p.runs.get(runId);
  const run = saved?.run;
  if (!saved || !run || run.status !== "completed" || !run.result) return null;
  const { score, total, passed, timedOut } = run.result;
  const kind = run.kind;
  const pass = RUN_RULES[kind].pass;

  let gap: ResultView["gap"] = null;
  if (kind === "solo") {
    // Only results up to this run, so an older result page never shows a later comparison.
    const upTo = [...p.runs.values()]
      .map((s) => snapshotOf(s.run))
      .filter((s): s is Snapshot => s !== null && s.order.seq <= run.started.seq)
      .sort((x, y) => inOrder(x.order, y.order));
    const snapshot = upTo.at(-1);
    if (snapshot) gap = { comparison: compare(upTo), snapshot, noGap: snapshot.raw !== null && snapshot.raw <= 0 };
  }

  const moveId = saved.questions[0]?.moveId;
  const cycle = moveId ? (p.cycles.get(moveId) ?? null) : null;
  let proof: Proof | null = null;
  if (cycle) {
    const earnedNow = kind === "solo" && passed && cycle.history[0]?.runId === run.id;
    proof = { state: cycle.state, earnedNow, earnedOn: cycle.earnedOn, nextDue: proofStatus(cycle, now)?.nextDue ?? null };
  }

  const improved = gap?.comparison.kind === "later" && gap.comparison.improved;
  // Nothing is shared from a Fading result (this covers a failed recheck). A proof share needs a pass; a progress share
  // needs a qualifying solo improvement, even on a not-yet. A solo pass with an improvement offers both.
  const shares: ShareKind[] = [];
  if (proof?.state !== "fading") {
    if (passed && proof) shares.push("proof");
    if (kind === "solo" && improved) shares.push("progress");
  }

  const answered = new Map(run.submissions.map((s) => [s.questionId, s.correct]));
  const misses = saved.questions.filter((q) => answered.get(q.id) !== true);

  return { saved, kind, score, total, pass, passed, timedOut, oneAway: kind === "solo" && !passed && score === pass - 1, gap, proof, misses, shares };
}
