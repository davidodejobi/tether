import { describe, expect, test } from "vitest";
import type { Question } from "../../content/generate.ts";
import { applyRun, type ProofCycle } from "../../rules/proof.ts";
import type { Run } from "../../rules/runs.ts";
import type { Progress, SavedRun } from "../../storage/progress.ts";
import { resultView } from "./view.ts";

const q = (i: number): Question => ({ id: `q${i}`, moveId: "m", contentVersion: 1, subject: "s", covered: "c", predicate: "p", number: "sg", pairing: "x" as never, options: ["a", "b", "c", "d"], answer: "a" });
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1, 12);

function solo(n: number, score: number, practice: number | null): SavedRun {
  const qs = Array.from({ length: 10 }, (_, i) => q(i));
  const run: Run = {
    id: `s${n}`, kind: "solo", questionIds: qs.map((x) => x.id),
    submissions: qs.map((x, i) => ({ questionId: x.id, correct: i < score, at: { at: T0 + n * DAY, seq: n * 100 + i + 1 } })),
    started: { at: T0 + n * DAY, seq: n * 100 }, deadline: T0 + n * DAY + 600_000, lastSeenAt: T0 + n * DAY,
    status: "completed", endedAt: T0 + n * DAY + 1000, result: { score, total: 10, passed: score >= 8, timedOut: false }, practiceSnapshot: practice,
  };
  return { run, questions: qs };
}

function progress(runs: SavedRun[]): Progress {
  const cycles = new Map<string, ProofCycle>();
  for (const s of runs) {
    const c = applyRun(cycles.get("m") ?? null, s.run, "m", "UTC");
    if (c) cycles.set("m", c);
  }
  return { learner: null, attempts: new Map(), runs: new Map(runs.map((s) => [s.run.id, s])), cycles };
}

describe("resultView", () => {
  test("unknown or unfinished run is null", () => {
    expect(resultView(progress([]), "nope", T0)).toBeNull();
    const s = solo(1, 5, 5);
    s.run.status = "exited";
    expect(resultView(progress([s]), "s1", T0)).toBeNull();
  });

  test("absent practice score gives alone only and no gap claim", () => {
    const v = resultView(progress([solo(1, 6, null)]), "s1", T0)!;
    expect(v.gap!.comparison.kind).toBe("aloneOnly");
    expect(v.gap!.snapshot.gap).toBeNull();
    expect(v.proof).toBeNull();
  });

  test("first complete comparison is the first gap", () => {
    const v = resultView(progress([solo(1, 6, 9)]), "s1", T0)!;
    expect(v.gap!.comparison.kind).toBe("first");
    expect(v.gap!.snapshot.gap).toBe(3);
    expect(v.oneAway).toBe(false);
    expect(v.misses).toHaveLength(4);
  });

  test("improved only when the gap fell and alone rose", () => {
    const up = resultView(progress([solo(1, 5, 9), solo(2, 7, 9)]), "s2", T0)!;
    expect(up.gap!.comparison).toMatchObject({ kind: "later", improved: true });
    expect(up.share).toBe("progress");
    expect(up.oneAway).toBe(true);
    // Gap shrank only because practice fell: not progress.
    const practiceFell = resultView(progress([solo(1, 5, 9), solo(2, 5, 7)]), "s2", T0)!;
    expect(practiceFell.gap!.comparison).toMatchObject({ kind: "later", improved: false });
    expect(practiceFell.share).toBeNull();
  });

  test("a missing earlier practice score is not skipped over", () => {
    const v = resultView(progress([solo(1, 5, 9), solo(2, 6, null), solo(3, 7, 9)]), "s3", T0)!;
    expect(v.gap!.comparison.kind).toBe("first");
  });

  test("an older result never shows a later comparison", () => {
    const v = resultView(progress([solo(1, 5, 9), solo(2, 7, 9)]), "s1", T0)!;
    expect(v.gap!.comparison.kind).toBe("first");
  });

  test("alone at or above practice is gap zero", () => {
    expect(resultView(progress([solo(1, 9, 8)]), "s1", T0)!.gap!.noGap).toBe(true);
  });

  test("a pass earns Proved with a next check date; a failed repeat keeps old proof un-earned", () => {
    const p = progress([solo(1, 8, 9), solo(2, 6, 9)]);
    const pass = resultView(p, "s1", T0)!;
    expect(pass).toMatchObject({ passed: true, share: "proof" });
    expect(pass.proof).toMatchObject({ state: "proved", earnedNow: true, nextDue: "2026-10-05" });
    const repeat = resultView(p, "s2", T0)!;
    expect(repeat.proof).toMatchObject({ state: "proved", earnedNow: false });
  });
});
