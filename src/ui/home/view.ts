// What Home's map and gap line show (spec section 10). Pure: reads saved progress, decides nothing new.
import type { Move } from "../../content/generate.ts";
import { moveById, moves, stripDisguiseMove } from "../../content/moves.ts";
import { snapshotOf, type Snapshot } from "../../rules/gap.ts";
import { inOrder } from "../../rules/moment.ts";
import { dueEntries, proofStatus, recheckAvailable, type ProofState } from "../../rules/proof.ts";
import { runsOf, type Progress } from "../../storage/progress.ts";

export type NodeState = "current" | ProofState | "available" | "soon";

/** "Now" for a cycle's time zone; the screens pass the demo-aware clock. */
export type NowIn = (timeZone: string) => number;
const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Move 1's map state: Current until a solo pass earns proof, then the proof state, with Due as an extra badge. */
export function moveOne(status: ReturnType<typeof proofStatus>): { state: NodeState; due: boolean } {
  return status ? { state: status.state, due: status.due } : { state: "current", due: false };
}

/**
 * One move's map state: its proof state once it has a cycle; else Current if it is the focus move; else Available.
 * Due is an extra badge.
 */
export function moveState(p: Progress, moveId: string, focusId: string, nowIn: NowIn): { state: NodeState; due: boolean } {
  const cycle = p.cycles.get(moveId) ?? null;
  const status = proofStatus(cycle, nowIn(cycle?.timeZone ?? localZone()));
  return !status && moveId !== focusId ? { state: "available", due: false } : moveOne(status);
}

/**
 * The move Home shows: a valid ?move, else the move whose recheck has waited longest, else the move of the most
 * recent attempt or run, else move 1.
 */
export function focusMove(p: Progress, nowIn: NowIn, param?: string | null): Move {
  const given = moveById(param);
  if (given) return given;
  let due: { move: Move; on: string } | null = null;
  for (const move of moves) {
    const c = p.cycles.get(move.moveId);
    if (!c || !recheckAvailable(c, nowIn(c.timeZone))) continue;
    const on = dueEntries(c, nowIn(c.timeZone)).map((e) => e.due).sort()[0] ?? "9999"; // Fading with nothing scheduled waits behind dated ones
    if (!due || on < due.on) due = { move, on };
  }
  if (due) return due.move;
  const seqs = new Map<string, number>();
  const note = (id: string | undefined, seq: number) => id && seqs.set(id, Math.max(seqs.get(id) ?? 0, seq));
  for (const { attempt: a, question } of p.attempts.values()) note(question.moveId, Math.max(a.startedAt.seq, a.completedAt?.seq ?? 0));
  for (const r of p.runs.values()) note(r.questions[0]?.moveId, r.run.started.seq);
  return moves.filter((m) => seqs.has(m.moveId)).sort((a, b) => seqs.get(b.moveId)! - seqs.get(a.moveId)!)[0] ?? stripDisguiseMove;
}

/** The most recent completed solo, with or without a practice score (spec section 8: never skip back to an older gap), or null. Pass `moveId` for one move's. */
export function latestSolo(p: Progress, moveId?: string): Snapshot | null {
  const snaps = runsOf(p, moveId).map((s) => snapshotOf(s.run)).filter((s): s is Snapshot => s !== null);
  return snaps.sort((a, b) => inOrder(a.order, b.order)).at(-1) ?? null;
}
