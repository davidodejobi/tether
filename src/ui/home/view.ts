// What Home's map and gap line show (spec section 10). Pure: reads saved progress, decides nothing new.
import { snapshotOf, type Snapshot } from "../../rules/gap.ts";
import { inOrder } from "../../rules/moment.ts";
import type { ProofState, proofStatus } from "../../rules/proof.ts";
import type { Progress } from "../../storage/progress.ts";

export type NodeState = "current" | ProofState | "soon";

/** Move 1's map state: Current until a solo pass earns proof, then the proof state, with Due as an extra badge. */
export function moveOne(status: ReturnType<typeof proofStatus>): { state: NodeState; due: boolean } {
  return status ? { state: status.state, due: status.due } : { state: "current", due: false };
}

/** The most recent completed solo, with or without a practice score (spec section 8: never skip back to an older gap), or null. */
export function latestSolo(p: Progress): Snapshot | null {
  const snaps = [...p.runs.values()].map((s) => snapshotOf(s.run)).filter((s): s is Snapshot => s !== null);
  return snaps.sort((a, b) => inOrder(a.order, b.order)).at(-1) ?? null;
}
