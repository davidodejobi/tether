import { describe, expect, test } from "vitest";
import {
  afterMisses,
  asksReason,
  check,
  giveReason,
  openMoveSheet,
  point,
  practiceScore,
  readiness,
  startAttempt,
  useHelp,
  verify,
  type PracticeAttempt,
  type Reason,
} from "./practice.ts";

let t = 0;
const fresh = (origin: PracticeAttempt["origin"] = "practice") => startAttempt(`a${++t}`, `q${t}`, origin, t * 1000);
const never = () => 0.99; // never sampled for verification
const always = () => 0; // always sampled

/** An unaided first-check correct answer with the given reason. */
function unaided(reason?: Reason, rng = never): PracticeAttempt {
  const a = check(fresh(), true, t * 1000 + 1);
  return reason ? giveReason(a, reason, rng) : a;
}
function missedThenRight(): PracticeAttempt {
  return check(check(fresh(), false, t * 1000 + 1), true, t * 1000 + 2);
}

describe("§5 practice points", () => {
  test("unaided first-check correct scores 1 and asks How did you know", () => {
    const a = unaided();
    expect(point(a)).toBe(1);
    expect(asksReason(a)).toBe(true);
  });

  test("miss then correct on the second check scores 1, marks help and skips How did you know", () => {
    const a = missedThenRight();
    expect(a.help).toEqual(["nudge"]);
    expect(point(a)).toBe(1);
    expect(asksReason(a)).toBe(false);
  });

  test("a third check, a revealed answer or an answer after AI scores 0", () => {
    const third = check(check(check(fresh(), false, 1), false, 2), true, 3);
    const revealed = check(useHelp(check(fresh(), false, 1), "showMe"), true, 2);
    const ai = check(useHelp(useHelp(check(check(check(fresh(), false, 1), false, 2), false, 3), "goDeeper"), "ai"), true, 4);
    const aiFirst = check(useHelp(fresh(), "ai"), true, 1);
    for (const a of [third, revealed, ai, aiFirst]) expect(point(a)).toBe(0);
  });

  test("a voluntary Show me before the first check scores 0", () => {
    expect(point(check(useHelp(fresh(), "showMe"), true, 1))).toBe(0);
  });

  test("the move sheet is not answer help", () => {
    const a = check(openMoveSheet(fresh()), true, 1);
    expect(a.moveSheetOpened).toBe(true);
    expect(point(a)).toBe(1);
    expect(asksReason(a)).toBe(true);
  });

  test("free look after a correct answer changes neither score nor help", () => {
    const a = useHelp(unaided("sounded"), "showMe");
    expect(a.freeLook).toBe(true);
    expect(a.help).toEqual([]);
    expect(point(a)).toBe(1);
  });

  test("AI help after the question is finished is ignored", () => {
    expect(useHelp(unaided(), "ai").help).toEqual([]);
  });

  test("tutorial questions never score", () => {
    expect(point(check(fresh("tutorial"), true, 1))).toBe(0);
    expect(asksReason(check(fresh("tutorial"), true, 1))).toBe(false);
  });

  test("help ladder: nudge, then Show me offered, then Go deeper", () => {
    expect([1, 2, 3].map(afterMisses)).toEqual(["nudge", "offerShowMe", "goDeeper"]);
  });
});

describe("§5 with-help score: latest ten completed practice questions", () => {
  test("absent with fewer than ten completed questions", () => {
    expect(practiceScore(Array.from({ length: 9 }, () => unaided()))).toBeNull();
  });

  test("counts points in the latest ten by completion time; unfinished and tutorial questions are excluded", () => {
    const old = Array.from({ length: 5 }, () => check(check(check(fresh(), false, 1), false, 2), true, t * 1000)); // 0 points, oldest
    const recent = Array.from({ length: 10 }, (_, i) => (i < 7 ? unaided() : missedThenRight())); // 10 points
    const unfinished = check(fresh(), false, t * 1000);
    const tutorial = check(fresh("tutorial"), true, t * 1000 + 5);
    expect(practiceScore([...recent, unfinished, tutorial, ...old])).toBe(10);
  });

  test("declining practice is reflected: newer zero-point questions push older points out", () => {
    const good = Array.from({ length: 10 }, () => unaided());
    const bad = Array.from({ length: 4 }, () => check(useHelp(fresh(), "showMe"), true, t * 1000 + 1));
    expect(practiceScore([...good, ...bad])).toBe(6);
  });
});

describe("§6 honesty and readiness dots", () => {
  test("I used the move, not sampled: one dot each, capped at three", () => {
    const xs = Array.from({ length: 4 }, () => unaided("move"));
    expect(readiness(xs.slice(0, 1), []).dots).toBe(1);
    expect(readiness(xs, []).dots).toBe(3);
    expect(readiness(xs, []).ready).toBe(true);
  });

  test("a sampled claim earns its dot only after the covered phrase is tapped", () => {
    const pending = unaided("move", always);
    expect(pending.verifySampled).toBe(true);
    expect(readiness([pending], []).dots).toBe(0);
    expect(readiness([verify(pending, true)], []).dots).toBe(1);
  });

  test("failed verification preserves the previous dots", () => {
    const [a, b] = [unaided("move"), verify(unaided("move", always), false)];
    expect(readiness([a, b], []).dots).toBe(1);
  });

  test("the verification sample is decided once; a second claim cannot reroll it", () => {
    const a = unaided("move", never);
    expect(giveReason(a, "move", always)).toBe(a);
  });

  test("It sounded right and I guessed preserve dots", () => {
    const xs = [unaided("move"), unaided("move"), unaided("sounded"), unaided("guessed")];
    expect(readiness(xs, []).dots).toBe(2);
  });

  test("a miss resets dots, even on a question left unfinished", () => {
    const xs = [unaided("move"), unaided("move"), check(fresh(), false, t * 1000)];
    expect(readiness(xs, []).dots).toBe(0);
  });

  test("voluntary Show me or accepted AI before answering resets dots", () => {
    expect(readiness([unaided("move"), useHelp(fresh(), "showMe")], []).dots).toBe(0);
    expect(readiness([unaided("move"), check(useHelp(fresh(), "ai"), true, t * 1000)], []).dots).toBe(0);
  });

  test("a free look after a correct answer keeps the dot", () => {
    expect(readiness([useHelp(unaided("move"), "showMe")], []).dots).toBe(1);
  });

  test("dots reset when a solo or recheck run begins", () => {
    const before = [unaided("move"), unaided("move")];
    const runStart = t * 1000 + 500;
    const after = [unaided("move")];
    expect(readiness([...before, ...after], [runStart]).dots).toBe(1);
  });

  test("tutorial and converted answers never add dots", () => {
    const tut = giveReason(check(fresh("tutorial"), true, 1), "move", never);
    const conv = check(fresh("converted"), true, 1);
    expect(readiness([tut, conv], []).dots).toBe(0);
  });

  test("three honest non-move answers in a row offer The move once; a move claim resets the count", () => {
    const xs = [unaided("sounded"), unaided("guessed"), unaided("sounded")];
    expect(readiness(xs, []).offerMove).toBe(true);
    expect(readiness([...xs, unaided("guessed")], []).offerMove).toBe(false);
    const restarted = [...xs, unaided("move"), unaided("sounded"), unaided("sounded"), unaided("guessed")];
    expect(readiness(restarted, []).offerMove).toBe(true);
  });
});
