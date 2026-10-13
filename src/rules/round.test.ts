import { expect, test } from "vitest";
import { startAttempt, check } from "./practice.ts";
import { doneInRound, firstTry, lastRound } from "./round.ts";

const done = (n: number, ok = true) => {
  const a = startAttempt(`a${n}`, `q${n}`, "practice", { at: n, seq: n * 10 });
  return check(a, ok, { at: n, seq: n * 10 + 1 });
};

test("rounds count only completed practice questions", () => {
  const open = startAttempt("o", "qo", "practice", { at: 99, seq: 999 });
  const tutorial = { ...done(50), origin: "tutorial" as const };
  const six = [1, 2, 3, 4, 5, 6].map((n) => done(n));
  expect(doneInRound([open, tutorial])).toBe(0);
  expect(doneInRound(six.slice(0, 4))).toBe(4);
  expect(doneInRound(six.slice(0, 5))).toBe(0);
  expect(doneInRound(six)).toBe(1);
  expect(lastRound([...six.slice(0, 5), open]).map((a) => a.id)).toEqual(["a1", "a2", "a3", "a4", "a5"]);
});

test("first try means the first check was correct", () => {
  expect(firstTry(done(1))).toBe(true);
  const missed = check(check(startAttempt("m", "q", "practice", { at: 1, seq: 1 }), false, { at: 2, seq: 2 }), true, { at: 3, seq: 3 });
  expect(firstTry(missed)).toBe(false);
});
