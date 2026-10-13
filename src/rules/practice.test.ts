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
import type { Moment } from "./moment.ts";

// Every action happens at the next tick, so timelines read top to bottom.
let clock = 0;
const tick = (): Moment => ({ at: ++clock * 1000, seq: clock });
const fresh = (origin: PracticeAttempt["origin"] = "practice") => startAttempt(`a${clock}`, `q${clock}`, origin, tick());
const never = () => 0.99; // never sampled for verification
const always = () => 0; // always sampled

/** An unaided first-check correct answer with the given reason. */
function unaided(reason?: Reason, rng = never): PracticeAttempt {
  const a = check(fresh(), true, tick());
  return reason ? giveReason(a, reason, rng, tick()) : a;
}
const miss = (a: PracticeAttempt) => check(a, false, tick());
const right = (a: PracticeAttempt) => check(a, true, tick());

describe("§5 practice points", () => {
  test("unaided first-check correct scores 1 and asks How did you know", () => {
    const a = unaided();
    expect(point(a)).toBe(1);
    expect(asksReason(a)).toBe(true);
  });

  test("miss then correct on the second check scores 1, marks help and skips How did you know", () => {
    const a = right(miss(fresh()));
    expect(a.help).toEqual(["nudge"]);
    expect(point(a)).toBe(1);
    expect(asksReason(a)).toBe(false);
  });

  test("a third check, a revealed answer or an answer after AI scores 0", () => {
    const third = right(miss(miss(fresh())));
    const revealed = right(useHelp(miss(fresh()), "showMe", tick()));
    const ai = right(useHelp(useHelp(miss(miss(miss(fresh()))), "goDeeper", tick()), "ai", tick()));
    const aiFirst = right(useHelp(fresh(), "ai", tick()));
    for (const a of [third, revealed, ai, aiFirst]) expect(point(a)).toBe(0);
  });

  test("a voluntary Show me before the first check scores 0", () => {
    expect(point(right(useHelp(fresh(), "showMe", tick())))).toBe(0);
  });

  test("the move sheet is not answer help", () => {
    const a = right(openMoveSheet(fresh()));
    expect(a.moveSheetOpened).toBe(true);
    expect(point(a)).toBe(1);
    expect(asksReason(a)).toBe(true);
  });

  test("free look after a correct answer changes neither score nor help", () => {
    const a = useHelp(unaided("sounded"), "showMe", tick());
    expect(a.freeLook).toBe(true);
    expect(a.help).toEqual([]);
    expect(point(a)).toBe(1);
  });

  test("AI help after the question is finished is ignored", () => {
    expect(useHelp(unaided(), "ai", tick()).help).toEqual([]);
  });

  test("tutorial questions never score", () => {
    expect(point(right(fresh("tutorial")))).toBe(0);
    expect(asksReason(right(fresh("tutorial")))).toBe(false);
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
    const old = Array.from({ length: 5 }, () => right(miss(miss(fresh())))); // 0 points, oldest
    const recent = Array.from({ length: 10 }, (_, i) => (i < 7 ? unaided() : right(miss(fresh())))); // 10 points
    const unfinished = miss(fresh());
    const tutorial = right(fresh("tutorial"));
    expect(practiceScore([...recent, unfinished, tutorial, ...old])).toBe(10);
  });

  test("a question left unfinished joins the window when it is completed later", () => {
    const left = miss(fresh());
    const others = Array.from({ length: 9 }, () => unaided());
    expect(practiceScore([left, ...others])).toBeNull();
    expect(practiceScore([right(left), ...others])).toBe(10);
  });

  test("declining practice is reflected: newer zero-point questions push older points out", () => {
    const good = Array.from({ length: 10 }, () => unaided());
    const bad = Array.from({ length: 4 }, () => right(useHelp(fresh(), "showMe", tick())));
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
    expect(readiness([verify(pending, true, tick())], []).dots).toBe(1);
  });

  test("failed verification preserves the previous dots", () => {
    const [a, b] = [unaided("move"), verify(unaided("move", always), false, tick())];
    expect(readiness([a, b], []).dots).toBe(1);
  });

  test("the verification sample is decided once; a second claim cannot reroll it", () => {
    const a = unaided("move", never);
    expect(giveReason(a, "move", always, tick())).toBe(a);
  });

  test("It sounded right and I guessed preserve dots", () => {
    const xs = [unaided("move"), unaided("move"), unaided("sounded"), unaided("guessed")];
    expect(readiness(xs, []).dots).toBe(2);
  });

  test("a miss resets dots, even on a question left unfinished", () => {
    const xs = [unaided("move"), unaided("move"), miss(fresh())];
    expect(readiness(xs, []).dots).toBe(0);
  });

  test("a miss on a resumed question resets dots when it happens, not when the question started", () => {
    const left = fresh(); // started, then left without an answer
    const claims = [unaided("move"), unaided("move")];
    expect(readiness([left, ...claims], []).dots).toBe(2);
    expect(readiness([miss(left), ...claims], []).dots).toBe(0);
  });

  test("a verification finished after a run starts counts after that run's reset", () => {
    const pending = unaided("move", always);
    const runStart = tick();
    expect(readiness([verify(pending, true, tick())], [runStart]).dots).toBe(1);
  });

  test("a later miss on a resumed question resets dots earned since its first miss", () => {
    const first = miss(fresh());
    const claims = [unaided("move"), unaided("move")];
    expect(readiness([first, ...claims], []).dots).toBe(2);
    expect(readiness([miss(first), ...claims], []).dots).toBe(0);
  });

  test("events sharing a wall-clock time keep their true order", () => {
    const pending = unaided("move", always);
    const same = tick();
    const verifiedFirst = verify(pending, true, { at: same.at, seq: same.seq });
    expect(readiness([verifiedFirst], [{ at: same.at, seq: same.seq + 1 }]).dots).toBe(0);
    const runFirst = verify(pending, true, { at: same.at, seq: same.seq + 1 });
    expect(readiness([runFirst], [{ at: same.at, seq: same.seq }]).dots).toBe(1);
  });

  test("voluntary Show me or accepted AI before answering resets dots", () => {
    expect(readiness([unaided("move"), useHelp(fresh(), "showMe", tick())], []).dots).toBe(0);
    expect(readiness([unaided("move"), right(useHelp(fresh(), "ai", tick()))], []).dots).toBe(0);
  });

  test("a free look after a correct answer keeps the dot", () => {
    expect(readiness([useHelp(unaided("move"), "showMe", tick())], []).dots).toBe(1);
  });

  test("dots reset when a solo or recheck run begins", () => {
    const before = [unaided("move"), unaided("move")];
    const runStart = tick();
    const after = [unaided("move")];
    expect(readiness([...before, ...after], [runStart]).dots).toBe(1);
  });

  test("tutorial and converted answers never add dots", () => {
    const tut = giveReason(right(fresh("tutorial")), "move", never, tick());
    const conv = right(fresh("converted"));
    expect(readiness([tut, conv], []).dots).toBe(0);
  });

  test("three honest non-move answers in a row offer The move once; a move claim resets the count", () => {
    const xs = [unaided("sounded"), unaided("guessed"), unaided("sounded")];
    expect(readiness(xs, []).offerMove).toBe(true);
    expect(readiness([...xs, unaided("guessed")], []).offerMove).toBe(false);
    const restarted = [...xs, unaided("guessed"), unaided("move"), unaided("sounded"), unaided("sounded"), unaided("guessed")];
    expect(readiness(restarted, []).offerMove).toBe(true);
  });
});
