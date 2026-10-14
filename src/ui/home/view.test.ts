import { describe, expect, it } from "vitest";
import type { Progress, SavedRun } from "../../storage/progress.ts";
import type { ProofCycle } from "../../rules/proof.ts";
import { startAttempt } from "../../rules/practice.ts";
import { focusMove, latestSolo, movedOnFrom, moveOne, moveState } from "./view.ts";
import { moveById } from "../../content/moves.ts";

const solo = (id: string, seq: number, score: number, practice: number | null, moveId = "strip-disguise"): [string, SavedRun] => [
  id,
  { questions: [{ moveId }] as never, run: { id, kind: "solo", status: "completed", started: { at: seq, seq }, endedAt: seq + 1, result: { score, total: 10, passed: score >= 8, timedOut: false }, practiceSnapshot: practice } as never },
];
const progress = (runs: [string, SavedRun][]) => ({ learner: null, attempts: new Map(), cycles: new Map(), runs: new Map(runs) }) as Progress;

describe("moveOne", () => {
  it("is Current with no proof, else the proof state with the Due badge", () => {
    expect(moveOne(null)).toEqual({ state: "current", due: false });
    expect(moveOne({ state: "held", due: true, overdue: false, nextDue: null })).toEqual({ state: "held", due: true });
  });
});

describe("latestSolo", () => {
  it("is null without a solo", () => {
    expect(latestSolo(progress([]))).toBeNull();
  });
  it("keeps a solo without a practice score, with no gap", () => {
    expect(latestSolo(progress([solo("a", 1, 7, null)]))).toMatchObject({ runId: "a", alone: 7, gap: null });
  });
  it("picks the latest solo by start order and never skips back to an older gap", () => {
    expect(latestSolo(progress([solo("b", 200, 8, 9), solo("a", 100, 5, 10)]))).toMatchObject({ runId: "b", gap: 1 });
    expect(latestSolo(progress([solo("b", 200, 8, 9), solo("a", 100, 5, 10), solo("c", 300, 9, null)]))).toMatchObject({ runId: "c", gap: null });
  });
});

const NOW = Date.UTC(2026, 9, 20, 12);
const nowIn = () => NOW;
const cycle = (moveId: string, state: ProofCycle["state"], due: string): ProofCycle => ({
  moveId, timeZone: "UTC", state, earnedOn: "2026-10-01", anchor: "2026-10-01",
  entries: [{ id: `${moveId}+3`, day: 3, due, status: "scheduled" }], history: [],
});
const attempt = (moveId: string, seq: number) => ({ attempt: startAttempt(`a${seq}`, "q", "practice", { at: seq, seq }), question: { moveId } as never });
const withCycles = (cs: ProofCycle[], attempts: ReturnType<typeof attempt>[] = [], runs: [string, SavedRun][] = []) =>
  ({ learner: null, attempts: new Map(attempts.map((a) => [a.attempt.id, a])), cycles: new Map(cs.map((c) => [c.moveId, c])), runs: new Map(runs) }) as Progress;

describe("latestSolo per move", () => {
  it("looks only at the asked move's solos", () => {
    const p = progress([solo("a", 100, 6, 9), solo("b", 200, 9, 10, "collective-nouns")]);
    expect(latestSolo(p, "strip-disguise")).toMatchObject({ runId: "a" });
    expect(latestSolo(p, "collective-nouns")).toMatchObject({ runId: "b" });
    expect(latestSolo(p, "one-of-the")).toBeNull();
  });
});

describe("moveState", () => {
  it("is the proof state if there is a cycle, else Current for the focus move and Available for the rest", () => {
    const p = withCycles([cycle("collective-nouns", "held", "2026-10-30")]);
    expect(moveState(p, "collective-nouns", "strip-disguise", nowIn)).toEqual({ state: "held", due: false });
    expect(moveState(p, "nearest-subject", "strip-disguise", nowIn)).toEqual({ state: "available", due: false });
    expect(moveState(p, "strip-disguise", "strip-disguise", nowIn)).toEqual({ state: "current", due: false });
    expect(moveState(withCycles([cycle("one-of-the", "proved", "2026-10-01")]), "one-of-the", "strip-disguise", nowIn)).toEqual({ state: "proved", due: true });
  });
});

describe("focusMove", () => {
  it("is move 1 with no records", () => expect(focusMove(withCycles([]), nowIn).moveId).toBe("strip-disguise"));
  it("takes a valid ?move first, and ignores an unknown one", () => {
    const p = withCycles([cycle("one-of-the", "held", "2026-10-01")]);
    expect(focusMove(p, nowIn, "collective-nouns").moveId).toBe("collective-nouns");
    expect(focusMove(p, nowIn, "nope").moveId).toBe("one-of-the");
  });
  it("then the move whose recheck has waited longest", () => {
    const p = withCycles([cycle("indefinite-pronouns", "held", "2026-10-18"), cycle("one-of-the", "held", "2026-10-15"), cycle("collective-nouns", "held", "2026-10-30")], [attempt("nearest-subject", 50)]);
    expect(focusMove(p, nowIn).moveId).toBe("one-of-the");
  });
  it("then the move of the latest attempt or run", () => {
    const p = withCycles([], [attempt("strip-disguise", 10), attempt("collective-nouns", 30)], [solo("r", 20, 5, null, "one-of-the")]);
    expect(focusMove(p, nowIn).moveId).toBe("collective-nouns");
    const q = withCycles([], [attempt("strip-disguise", 10)], [solo("r", 20, 5, null, "one-of-the")]);
    expect(focusMove(q, nowIn).moveId).toBe("one-of-the");
  });
  it("moves on, like a game level, from a stage whose proof holds to the next stage not yet completed", () => {
    const one = withCycles([cycle("strip-disguise", "held", "2026-10-30")], [attempt("strip-disguise", 10)]);
    expect(focusMove(one, nowIn).moveId).toBe("nearest-subject");
    expect(movedOnFrom(one, moveById("nearest-subject")!, nowIn)?.moveId).toBe("strip-disguise");
    const skip = withCycles([cycle("strip-disguise", "held", "2026-10-30"), cycle("nearest-subject", "held", "2026-10-30")], [attempt("strip-disguise", 10)]);
    expect(focusMove(skip, nowIn).moveId).toBe("collective-nouns");
    const last = withCycles([cycle("one-of-the", "held", "2026-10-30")], [attempt("one-of-the", 10)]);
    expect(focusMove(last, nowIn).moveId).toBe("one-of-the"); // nothing after stage 5 is playable yet
    const started = withCycles([cycle("strip-disguise", "held", "2026-10-30")], [attempt("strip-disguise", 10), attempt("nearest-subject", 20)]);
    expect(focusMove(started, nowIn).moveId).toBe("nearest-subject");
  });
});
