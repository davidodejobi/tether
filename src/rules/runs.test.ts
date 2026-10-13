import { describe, expect, test } from "vitest";
import { practiceScore, readiness } from "./practice.ts";
import { convert, finish, lowTime, onReturn, startRun, submit, type Run } from "./runs.ts";

const T0 = Date.UTC(2026, 9, 13, 9, 0);
const ids = (n: number) => Array.from({ length: n }, (_, i) => `q${i}`);
const solo = (practiceSnapshot: number | null = 9) =>
  startRun({ id: "solo-1", kind: "solo", questionIds: ids(10), practiceSnapshot }, T0);

/** Submits answers in order; `true` = correct. */
function answer(run: Run, results: boolean[], from = T0): Run {
  return results.reduce((r, ok, i) => submit(r, r.questionIds[r.submissions.length]!, ok, from + (i + 1) * 1000), run);
}

describe("§7 solo and recheck rules", () => {
  test("solo is ten questions in ten minutes; recheck is five in five", () => {
    expect(solo().deadline - T0).toBe(10 * 60_000);
    const r = startRun({ id: "r", kind: "recheck", purpose: "scheduled", questionIds: ids(5), coveredEntryIds: [] }, T0);
    expect(r.deadline - T0).toBe(5 * 60_000);
    expect(() => startRun({ id: "x", kind: "solo", questionIds: ids(5) }, T0)).toThrow();
  });

  test("solo can start at zero dots: nothing in the rules gates entry", () => {
    expect(readiness([], []).dots).toBe(0);
    expect(solo().status).toBe("active");
  });

  test("one submitted answer per question, in order; no backtracking", () => {
    let r = submit(solo(), "q0", true, T0 + 1);
    expect(submit(r, "q0", false, T0 + 2).submissions).toHaveLength(1);
    expect(submit(r, "q5", true, T0 + 2).submissions).toHaveLength(1);
    r = submit(r, "q1", false, T0 + 3);
    expect(r.submissions.map((s) => s.questionId)).toEqual(["q0", "q1"]);
  });

  test("8/10 passes; 7/10 does not", () => {
    const pass = answer(solo(), [...Array(8).fill(true), false, false]);
    const fail = answer(solo(), [...Array(7).fill(true), false, false, false]);
    expect(pass.result).toMatchObject({ score: 8, total: 10, passed: true, timedOut: false });
    expect(fail.result).toMatchObject({ score: 7, passed: false });
  });

  test("timeout scores unsubmitted questions as wrong, out of ten", () => {
    const partial = answer(solo(), Array(8).fill(true));
    const r = finish(partial, partial.deadline);
    expect(r.result).toEqual({ score: 8, total: 10, passed: true, timedOut: true });
  });

  test("answers after the deadline are ignored", () => {
    const r = solo();
    expect(submit(r, "q0", true, r.deadline).submissions).toHaveLength(0);
  });

  test("warns in the last 20 seconds", () => {
    const r = solo();
    expect(lowTime(r, r.deadline - 21_000)).toBe(false);
    expect(lowTime(r, r.deadline - 20_000)).toBe(true);
  });
});

describe("§7 absences and reopening (release check 3)", () => {
  const r = { ...solo(), lastSeenAt: T0 + 60_000 };

  test("hidden 9.9 seconds continues; hidden 10 seconds converts", () => {
    expect(onReturn(r, T0 + 60_000 + 9_900, r.lastSeenAt)).toBe("continue");
    expect(onReturn(r, T0 + 60_000 + 10_000, r.lastSeenAt)).toBe("convert");
  });

  test("a long absence converts even if the deadline passed while away", () => {
    expect(onReturn(r, r.deadline + 60_000, r.lastSeenAt)).toBe("convert");
  });

  test("a short absence that crosses the deadline times out", () => {
    const late = { ...r, lastSeenAt: r.deadline - 2_000 };
    expect(onReturn(late, r.deadline + 1_000, late.lastSeenAt)).toBe("timeout");
  });

  test("an unknown absence or a clock that went backwards converts", () => {
    expect(onReturn(r, T0 + 61_000, null)).toBe("convert");
    expect(onReturn(r, T0 + 30_000, r.lastSeenAt)).toBe("convert");
  });
});

describe("§7 conversion to practice", () => {
  test("submitted answers become one-check practice attempts; unsubmitted questions continue as practice", () => {
    const partial = answer(solo(), [true, false, true]);
    const { run, attempts, unsubmitted } = convert(partial, T0 + 9_000, "converted");
    expect(run.status).toBe("converted");
    expect(attempts.map((a) => [a.origin, a.checks, a.correctOnCheck])).toEqual([
      ["converted", 1, 1],
      ["converted", 1, undefined],
      ["converted", 1, 1],
    ]);
    expect(unsubmitted).toEqual(ids(10).slice(3));
  });

  test("conversion is recorded once and a converted run can never complete", () => {
    const once = convert(answer(solo(), [true]), T0 + 5_000, "exited");
    expect(convert(once.run, T0 + 6_000, "converted").attempts).toEqual([]);
    expect(finish(once.run, T0 + 7_000).status).toBe("exited");
    expect(submit(once.run, "q1", true, T0 + 7_000).submissions).toHaveLength(1);
  });

  test("converted answers count in the practice window but earn no dots", () => {
    const { attempts } = convert(answer(solo(), Array(10).fill(true).slice(0, 9)), T0 + 20_000, "converted");
    const extra = convert(answer({ ...solo(), id: "solo-2" }, [true]), T0 + 30_000, "converted").attempts;
    expect(practiceScore([...attempts, ...extra])).toBe(10);
    expect(readiness([...attempts, ...extra], [T0]).dots).toBe(0);
  });
});
