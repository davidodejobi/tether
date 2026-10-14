// Honest course counts: planned, available, completed, needs review. Pure; reads saved runs and proof cycles only.
import type { Run } from "./runs.ts";
import type { ProofCycle } from "./proof.ts";

export interface CountInput {
  cycles: Iterable<ProofCycle>;
  /** Saved runs with the move their questions belong to (records are not move-scoped yet; see decisions). */
  runs: Iterable<{ run: Run; questions: readonly { moveId: string }[] }>;
}

export interface Counts { planned: number; available: number; completed: number; needsReview: number }

/** Moves that have EVER had a passed solo run. A move counts once, however many passes it has. */
export function completedMoves({ cycles, runs }: CountInput): Set<string> {
  const done = new Set<string>();
  for (const c of cycles) if (c.history.some((h) => h.kind === "solo" && h.passed)) done.add(c.moveId);
  for (const { run, questions } of runs) {
    const move = questions[0]?.moveId;
    if (move && run.kind === "solo" && run.status === "completed" && run.result?.passed) done.add(move);
  }
  return done;
}

/** Counts for any set of planned stages. A Fading move stays completed and also needs review. */
export function countStages(stages: readonly { moveId?: string }[], input: CountInput): Counts {
  const cycles = [...input.cycles]; // iterators from Map.values() can be read once
  const done = completedMoves({ cycles, runs: input.runs });
  const fading = new Set<string>();
  for (const c of cycles) if (c.state === "fading") fading.add(c.moveId);
  const avail = stages.filter((s) => s.moveId).map((s) => s.moveId!);
  return {
    planned: stages.length,
    available: avail.length,
    completed: avail.filter((m) => done.has(m)).length,
    needsReview: avail.filter((m) => done.has(m) && fading.has(m)).length,
  };
}

/** Complete only when every planned stage is published and passed; unpublished stages always block it. */
export const isComplete = (c: Counts) => c.planned > 0 && c.available === c.planned && c.completed === c.planned;

const review = (c: Counts) => (c.needsReview ? ` · ${c.needsReview} need${c.needsReview === 1 ? "s" : ""} review` : "");
const s = (n: number) => (n === 1 ? "" : "s");

/** "English · 50 planned stages · 1 available · 0 completed" */
export const overviewLine = (c: Counts) => `English · ${c.planned} planned stage${s(c.planned)} · ${c.available} available · ${c.completed} completed${review(c)}`;
/** "Lexis and Structure: 33 planned stages · 1 available · 0 completed" */
export const groupLine = (name: string, c: Counts) => `${name}: ${c.planned} planned stage${s(c.planned)} · ${c.available} available · ${c.completed} completed${review(c)}`;
/** "English · 1 of 50 stages available · 0 completed" */
export const progressLine = (c: Counts) => `English · ${c.available} of ${c.planned} stages available · ${c.completed} completed${review(c)}`;
