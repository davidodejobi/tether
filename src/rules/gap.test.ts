import { describe, expect, test } from "vitest";
import { compare, snapshotOf, type Snapshot } from "./gap.ts";
import { nextMoment, type Moment } from "./moment.ts";
import { convert, startRun, submit, type Run } from "./runs.ts";

let last: Moment | null = null;
const m = (at: number) => (last = nextMoment(last, at));

const T0 = Date.UTC(2026, 9, 13, 9, 0);
let n = 0;

/** A completed solo run with the given practice snapshot and alone score. */
function soloRun(practice: number | null, alone: number): Run {
  const id = `solo-${++n}`;
  let r = startRun({ id, kind: "solo", questionIds: Array.from({ length: 10 }, (_, i) => `${id}-q${i}`), practiceSnapshot: practice }, m(T0 + n * 3_600_000));
  for (let i = 0; i < 10; i++) r = submit(r, r.questionIds[i]!, i < alone, m(r.started.at + (i + 1) * 1000));
  return r;
}
const snap = (practice: number | null, alone: number) => snapshotOf(soloRun(practice, alone))!;

describe("§8 results, alone score and gap (release check 4)", () => {
  test("no solo result yet", () => {
    expect(compare([]).kind).toBe("none");
  });

  test("early solo without ten practice questions shows alone and invents no gap", () => {
    const s = snap(null, 6);
    expect(s).toMatchObject({ practice: null, alone: 6, raw: null, gap: null });
    expect(compare([s]).kind).toBe("aloneOnly");
  });

  test("first complete comparison makes no change claim", () => {
    const c = compare([snap(9, 5)]);
    expect(c).toMatchObject({ kind: "first", latest: { gap: 4 } });
  });

  test("a previous snapshot without a practice score is not skipped to invent continuity", () => {
    const c = compare([snap(9, 4), snap(null, 6), snap(9, 7)]);
    expect(c.kind).toBe("first");
  });

  test("later comparison: a shrinking gap with alone rising is an improvement", () => {
    const c = compare([snap(9, 5), snap(9, 8)]);
    expect(c).toMatchObject({ kind: "later", improved: true, aloneFell: false, latest: { gap: 1 }, previous: { gap: 4 } });
  });

  test("a shrinking gap is not celebrated when alone fell", () => {
    const c = compare([snap(10, 8), snap(7, 7)]);
    expect(c).toMatchObject({ kind: "later", improved: false, aloneFell: true });
  });

  test("alone at or above practice keeps both scores, raw difference negative, gap shown as zero", () => {
    const s = snap(7, 9);
    expect(s).toMatchObject({ practice: 7, alone: 9, raw: -2, gap: 0 });
  });

  test("a gap that shrinks only because practice fell is not an improvement", () => {
    const c = compare([snap(9, 6), snap(7, 6)]);
    expect(c).toMatchObject({ kind: "later", improved: false, aloneFell: false, latest: { gap: 1 }, previous: { gap: 3 } });
  });

  test("the saved snapshot uses the practice score captured at entry, not later practice", () => {
    const run = soloRun(6, 5);
    const later: Snapshot = snapshotOf({ ...run })!;
    expect(later.practice).toBe(6);
  });

  test("converted or exited runs produce no snapshot", () => {
    const r = startRun({ id: "c", kind: "solo", questionIds: Array.from({ length: 10 }, (_, i) => `c${i}`), practiceSnapshot: 9 }, m(T0));
    expect(snapshotOf(convert(r, T0 + 1_000, "converted").run)).toBeNull();
  });
});
