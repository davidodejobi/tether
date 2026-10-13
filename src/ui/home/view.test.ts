import { describe, expect, it } from "vitest";
import type { Progress, SavedRun } from "../../storage/progress.ts";
import { latestGap, moveOne } from "./view.ts";

const solo = (id: string, seq: number, score: number, practice: number | null): [string, SavedRun] => [
  id,
  { questions: [], run: { id, kind: "solo", status: "completed", started: { at: seq, seq }, endedAt: seq + 1, result: { score, total: 10, passed: score >= 8, timedOut: false }, practiceSnapshot: practice } as never },
];
const progress = (runs: [string, SavedRun][]) => ({ learner: null, attempts: new Map(), cycles: new Map(), runs: new Map(runs) }) as Progress;

describe("moveOne", () => {
  it("is Current with no proof, else the proof state with the Due badge", () => {
    expect(moveOne(null)).toEqual({ state: "current", due: false });
    expect(moveOne({ state: "held", due: true, overdue: false, nextDue: null })).toEqual({ state: "held", due: true });
  });
});

describe("latestGap", () => {
  it("is null without a solo that has a practice score", () => {
    expect(latestGap(progress([]))).toBeNull();
    expect(latestGap(progress([solo("a", 1, 7, null)]))).toBeNull();
  });
  it("picks the latest solo with a gap by start order", () => {
    const g = latestGap(progress([solo("b", 200, 8, 9), solo("a", 100, 5, 10), solo("c", 300, 9, null)]));
    expect(g).toMatchObject({ runId: "b", gap: 1 });
  });
});
