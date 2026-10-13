// Builds a fresh solo check or recheck (spec section 7). Pure: the screen supplies time, ids and randomness.
import { drawRun, RECHECK_SHAPES, SOLO_SHAPE, type Question, type Rng } from "../../content/generate.ts";
import { stripDisguise as pack } from "../../content/strip-disguise.ts";
import type { Moment } from "../../rules/moment.ts";
import { practiceScore } from "../../rules/practice.ts";
import { recheckAvailable, recheckShapeIndex } from "../../rules/proof.ts";
import { startRun, type Run, type RunKind } from "../../rules/runs.ts";
import { attemptsOf, type Progress } from "../../storage/progress.ts";

/** Null when a recheck is requested and none is due (offer practice or solo instead). */
export function planRun(p: Progress, kind: RunKind, now: number, id: string, moment: () => Moment, rng: Rng): { run: Run; questions: Question[] } | null {
  const cycle = p.cycles.get(pack.moveId) ?? null;
  const avail = kind === "recheck" ? recheckAvailable(cycle, now) : null;
  if (kind === "recheck" && !avail) return null;
  // The previous proof run's questions are only reused if the pool runs out.
  const last = [...p.runs.values()].sort((a, b) => b.run.started.seq - a.run.started.seq)[0];
  const avoid = new Set(last?.run.questionIds ?? []);
  const shape = kind === "solo" ? SOLO_SHAPE : RECHECK_SHAPES[recheckShapeIndex(cycle)];
  const questions = drawRun(pack, rng, shape, avoid);
  const run = startRun(
    {
      id,
      kind,
      purpose: avail?.purpose,
      questionIds: questions.map((q) => q.id),
      practiceSnapshot: kind === "solo" ? practiceScore(attemptsOf(p)) : undefined,
      coveredEntryIds: avail?.entryIds,
    },
    moment(),
  );
  return { run, questions };
}
