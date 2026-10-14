import { describe, expect, it } from "vitest";
import { countStages, groupLine, isComplete, overviewLine, progressLine, type CountInput } from "./course-counts.ts";
import type { ProofCycle } from "./proof.ts";
import type { Run } from "./runs.ts";

const stages = [{ moveId: "m1" }, ...Array.from({ length: 49 }, () => ({}))];
const solo = (id: string, passed: boolean, status: Run["status"] = "completed"): CountInput["runs"] extends Iterable<infer R> ? R : never => ({
  run: { id, kind: "solo", questionIds: [], submissions: [], started: { at: 0, seq: 0 }, deadline: 0, lastSeenAt: 0, status, endedAt: 1, result: { score: passed ? 9 : 3, total: 10, passed, timedOut: false } } as Run,
  questions: [{ moveId: "m1" }],
});
const cycle = (state: ProofCycle["state"]): ProofCycle => ({ moveId: "m1", timeZone: "UTC", state, earnedOn: "d", anchor: "d", entries: [], history: [{ runId: "a", kind: "solo", on: "d", passed: true, entryIds: [] }] });
const count = (i: Partial<CountInput>) => countStages(stages, { cycles: [], runs: [], ...i });
it("reads one-shot iterators (Map.values) correctly", () => {
  const m = new Map([["m1", cycle("fading")]]);
  expect(countStages(stages, { cycles: m.values(), runs: [].values() })).toMatchObject({ completed: 1, needsReview: 1 });
});

describe("course counts", () => {
  it("starts at 50 planned, 1 available, 0 completed", () => {
    expect(count({})).toEqual({ planned: 50, available: 1, completed: 0, needsReview: 0 });
  });
  it("a failed solo stays at 0", () => expect(count({ runs: [solo("a", false)] }).completed).toBe(0));
  it("a solo pass sets completed to 1; repeat passes keep it at 1", () => {
    expect(count({ runs: [solo("a", true)] }).completed).toBe(1);
    expect(count({ runs: [solo("a", true), solo("b", true), solo("c", true)], cycles: [cycle("held")] }).completed).toBe(1);
  });
  it("an exited run never counts", () => expect(count({ runs: [solo("a", true, "exited" as Run["status"])] }).completed).toBe(0));
  it("Fading stays completed and needs review", () => {
    expect(count({ cycles: [cycle("fading")], runs: [solo("a", true)] })).toMatchObject({ completed: 1, needsReview: 1 });
  });
  it("never claims completion while stages are unpublished", () => {
    expect(isComplete(count({ runs: [solo("a", true)] }))).toBe(false);
    expect(isComplete({ planned: 1, available: 1, completed: 1, needsReview: 0 })).toBe(true);
  });
  it("words the counts", () => {
    const c = count({});
    expect(overviewLine(c)).toBe("English · 50 planned stages · 1 available · 0 completed");
    expect(progressLine(c)).toBe("English · 1 of 50 stages available · 0 completed");
    expect(groupLine("Lexis and Structure", { ...c, planned: 33 })).toBe("Lexis and Structure: 33 planned stages · 1 available · 0 completed");
    expect(overviewLine({ ...c, completed: 1, needsReview: 1 })).toContain("1 needs review");
  });
});
