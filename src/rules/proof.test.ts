import { describe, expect, test } from "vitest";
import { addDays, applyRun, atCivilDate, civilDate, homeAction, dueEntries, proofStatus, recheckAvailable, recheckShapeIndex, type ProofCycle } from "./proof.ts";
import { nextMoment, type Moment } from "./moment.ts";
import { convert, finish, startRun, submit, type Run } from "./runs.ts";

let last: Moment | null = null;
const m = (at: number) => (last = nextMoment(last, at));

const LAGOS = "Africa/Lagos"; // UTC+1, no daylight saving
const at = (date: string, time = "10:00") => Date.parse(`${date}T${time}:00+01:00`);
let n = 0;

function completed(kind: Run["kind"], correct: number, endedAt: number, extra: Partial<Run> = {}): Run {
  const total = kind === "solo" ? 10 : 5;
  const id = `${kind}-${++n}`;
  let r = startRun({ id, kind, questionIds: Array.from({ length: total }, (_, i) => `${id}-${i}`), ...extra }, m(endedAt - 60_000));
  for (let i = 0; i < total; i++) r = submit(r, r.questionIds[i]!, i < correct, m(endedAt - 60_000 + (i + 1) * 1000));
  return { ...r, endedAt };
}
const soloPass = (date: string, time?: string) => completed("solo", 8, at(date, time));
function recheck(cycle: ProofCycle, date: string, correct: number, time?: string): Run {
  const entry = recheckAvailable(cycle, at(date, time));
  if (!entry) throw new Error("no recheck available");
  return completed("recheck", correct, at(date, time), { purpose: entry.purpose, coveredEntryIds: entry.entryIds });
}
const earned = (date = "2026-10-13") => applyRun(null, soloPass(date), "strip-disguise", LAGOS)!;

describe("calendar dates", () => {
  test("a pass at 23:59 makes day 3 due from midnight three dates later, under 72 hours on", () => {
    const c = applyRun(null, soloPass("2026-10-13", "23:59"), "strip-disguise", LAGOS)!;
    expect(c.entries.map((e) => e.due)).toEqual(["2026-10-16", "2026-10-20", "2026-10-27"]);
    expect(dueEntries(c, at("2026-10-15", "23:59"))).toHaveLength(0);
    expect(dueEntries(c, at("2026-10-16", "00:00")).map((e) => e.day)).toEqual([3]);
  });

  test("a pass that timed out at 23:59 and was noticed after midnight is dated by its deadline", () => {
    let r = startRun({ id: "late", kind: "solo", questionIds: Array.from({ length: 10 }, (_, i) => `late-${i}`) }, m(at("2026-10-13", "23:49")));
    for (let i = 0; i < 8; i++) r = submit(r, r.questionIds[i]!, true, m(r.started.at + (i + 1) * 1000));
    const done = finish(r, at("2026-10-14", "00:01"));
    expect(done.endedAt).toBe(r.deadline);
    expect(applyRun(null, done, "m", LAGOS)!.earnedOn).toBe("2026-10-13");
  });

  test("dates are calendar dates in the cycle's time zone, across a daylight-saving change", () => {
    const london = applyRun(null, completed("solo", 8, Date.parse("2026-10-23T23:30:00+01:00")), "m", "Europe/London")!;
    expect(london.earnedOn).toBe("2026-10-23");
    expect(london.entries[0]!.due).toBe("2026-10-26"); // clocks go back on 25 Oct
    expect(civilDate(Date.parse("2026-10-25T23:30:00Z"), "Europe/London")).toBe("2026-10-25");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
});

describe("§9 proof, dates and recovery (release check 5)", () => {
  test("first solo pass creates Proved with day 3/7/14; a failed solo creates nothing", () => {
    const c = earned();
    expect(c).toMatchObject({ state: "proved", earnedOn: "2026-10-13", anchor: "2026-10-13" });
    expect(c.entries.map((e) => e.day)).toEqual([3, 7, 14]);
    expect(applyRun(null, completed("solo", 7, at("2026-10-13")), "m", LAGOS)).toBeNull();
  });

  test("before anything is due, no scheduled recheck is offered", () => {
    expect(recheckAvailable(earned(), at("2026-10-15"))).toBeNull();
  });

  test("due on the date, overdue from the next date; lateness never changes the state", () => {
    const c = earned();
    expect(proofStatus(c, at("2026-10-16"))).toMatchObject({ state: "proved", due: true, overdue: false });
    expect(proofStatus(c, at("2026-10-17"))).toMatchObject({ state: "proved", due: true, overdue: true });
  });

  test("a pass makes it Held and completes the entries captured at entry", () => {
    const c = earned();
    const after = applyRun(c, recheck(c, "2026-10-16", 4), "m", LAGOS)!;
    expect(after.state).toBe("held");
    expect(after.entries.map((e) => e.status)).toEqual(["passed", "scheduled", "scheduled"]);
  });

  test("one late recheck covers every due entry; future dates do not move", () => {
    const c = earned();
    const run = recheck(c, "2026-10-21", 5); // day 3 and day 7 are both due
    expect(run.coveredEntryIds).toHaveLength(2);
    const after = applyRun(c, run, "m", LAGOS)!;
    expect(after.entries.map((e) => [e.day, e.due, e.status])).toEqual([
      [3, "2026-10-16", "passed"],
      [7, "2026-10-20", "passed"],
      [14, "2026-10-27", "scheduled"],
    ]);
  });

  test("coverage is fixed at entry even if the run ends after midnight", () => {
    const c = earned();
    const run = recheck(c, "2026-10-19", 5, "23:58"); // only day 3 due at entry
    const after = applyRun(c, { ...run, endedAt: at("2026-10-20", "00:02") }, "m", LAGOS)!;
    expect(after.entries.map((e) => e.status)).toEqual(["passed", "scheduled", "scheduled"]);
  });

  test("after the last scheduled pass: Held with no invented next date", () => {
    let c = earned();
    for (const date of ["2026-10-16", "2026-10-20", "2026-10-27"]) c = applyRun(c, recheck(c, date, 4), "m", LAGOS)!;
    expect(proofStatus(c, at("2026-11-30"))).toEqual({ state: "held", due: false, overdue: false, nextDue: null });
  });

  test("a miss makes it Fading, pauses the remaining entries and offers recovery at once", () => {
    const c = earned();
    const after = applyRun(c, recheck(c, "2026-10-16", 3), "m", LAGOS)!;
    expect(after.state).toBe("fading");
    expect(after.entries.map((e) => e.status)).toEqual(["missed", "paused", "paused"]);
    expect(dueEntries(after, at("2026-12-01"))).toHaveLength(0);
    expect(recheckAvailable(after, at("2026-10-16", "10:05"))).toEqual({ purpose: "recovery", entryIds: [] });
  });

  test("recovery miss stays Fading; recovery pass is Held with a new schedule from that date and keeps history", () => {
    let c = earned();
    c = applyRun(c, recheck(c, "2026-10-16", 2), "m", LAGOS)!;
    c = applyRun(c, recheck(c, "2026-10-17", 3), "m", LAGOS)!;
    expect(c.state).toBe("fading");
    c = applyRun(c, recheck(c, "2026-10-18", 4), "m", LAGOS)!;
    expect(c).toMatchObject({ state: "held", anchor: "2026-10-18" });
    expect(c.entries.filter((e) => e.status === "scheduled").map((e) => e.due)).toEqual(["2026-10-21", "2026-10-25", "2026-11-01"]);
    expect(c.entries.filter((e) => e.status === "paused")).toHaveLength(2);
    expect(c.history.map((h) => [h.kind, h.passed])).toEqual([
      ["solo", true],
      ["recheck", false],
      ["recheck", false],
      ["recheck", true],
    ]);
  });

  test("Fading + solo pass saves the result but stays Fading", () => {
    let c = earned();
    c = applyRun(c, recheck(c, "2026-10-16", 1), "m", LAGOS)!;
    expect(applyRun(c, soloPass("2026-10-17"), "m", LAGOS)!.state).toBe("fading");
  });

  test("a repeat solo, pass or fail, cannot postpone a due recheck or fade proof", () => {
    const c = earned();
    const passAgain = applyRun(c, soloPass("2026-10-16"), "m", LAGOS)!;
    const failAgain = applyRun(c, completed("solo", 2, at("2026-10-16")), "m", LAGOS)!;
    for (const x of [passAgain, failAgain]) {
      expect(x.state).toBe("proved");
      expect(x.entries).toEqual(c.entries);
      expect(recheckAvailable(x, at("2026-10-16"))?.entryIds).toEqual(["2026-10-13+3"]);
    }
  });

  test("a converted or exited recheck leaves the due entry unresolved and does not fade proof", () => {
    const c = earned();
    const entry = recheckAvailable(c, at("2026-10-16"))!;
    const active = startRun({ id: "r", kind: "recheck", purpose: entry.purpose, coveredEntryIds: entry.entryIds, questionIds: ["a", "b", "c", "d", "e"] }, m(at("2026-10-16")));
    expect(applyRun(c, convert(active, at("2026-10-16", "10:01"), "converted").run, "m", LAGOS)).toBe(c);
  });

  test("results apply once per run ID", () => {
    const c = earned();
    const run = recheck(c, "2026-10-16", 4);
    const once = applyRun(c, run, "m", LAGOS)!;
    expect(applyRun(once, run, "m", LAGOS)).toBe(once);
  });

  test("rechecks alternate between the two question shapes", () => {
    let c = earned();
    expect(recheckShapeIndex(c)).toBe(0);
    c = applyRun(c, recheck(c, "2026-10-16", 4), "m", LAGOS)!;
    expect(recheckShapeIndex(c)).toBe(1);
  });
});

describe("recheck due, late, recovery and Home action", () => {
  test("not due before day 3, due on it, overdue from the next date, still Held", () => {
    const c = earned();
    expect(proofStatus(c, at("2026-10-15", "23:59"))).toMatchObject({ state: "proved", due: false, overdue: false, nextDue: "2026-10-16" });
    expect(proofStatus(c, at("2026-10-16", "00:00"))).toMatchObject({ due: true, overdue: false });
    expect(proofStatus(c, at("2026-10-17", "00:00"))).toMatchObject({ due: true, overdue: true, state: "proved" });
  });

  test("a late pass resolves every due entry together and does not shift later dates", () => {
    const c = earned();
    const late = at("2026-10-21"); // day 3 and day 7 are both due
    expect(recheckAvailable(c, late)!.entryIds).toHaveLength(2);
    const held = applyRun(c, recheck(c, "2026-10-21", 4), "strip-disguise", LAGOS)!;
    expect(held.state).toBe("held");
    expect(held.entries.map((e) => [e.day, e.status, e.due])).toEqual([[3, "passed", "2026-10-16"], [7, "passed", "2026-10-20"], [14, "scheduled", "2026-10-27"]]);
    expect(proofStatus(held, late)).toMatchObject({ due: false, nextDue: "2026-10-27" });
  });

  test("after the last pass Held shows no next date", () => {
    let c = earned();
    for (const d of ["2026-10-16", "2026-10-20", "2026-10-27"]) c = applyRun(c, recheck(c, d, 5), "strip-disguise", LAGOS)!;
    expect(proofStatus(c, at("2026-11-30"))).toMatchObject({ state: "held", due: false, nextDue: null });
  });

  test("a miss makes Fading, pauses the rest, and recovery restarts day 3/7/14 from the recovery date", () => {
    const c = earned();
    const fading = applyRun(c, recheck(c, "2026-10-16", 3), "strip-disguise", LAGOS)!;
    expect(fading.state).toBe("fading");
    expect(fading.entries.map((e) => e.status)).toEqual(["missed", "paused", "paused"]);
    expect(dueEntries(fading, at("2026-12-01"))).toHaveLength(0);
    const miss = applyRun(fading, recheck(fading, "2026-10-17", 2), "strip-disguise", LAGOS)!;
    expect(miss.state).toBe("fading");
    const back = applyRun(miss, recheck(miss, "2026-10-18", 4), "strip-disguise", LAGOS)!;
    expect(back.state).toBe("held");
    expect(back.entries.slice(3).map((e) => e.due)).toEqual(["2026-10-21", "2026-10-25", "2026-11-01"]);
  });

  test("Home action order", () => {
    const c = earned();
    expect(homeAction(c, at("2026-10-14"), false)).toBe("practice");
    expect(homeAction(c, at("2026-10-16"), false)).toBe("recheck");
    expect(homeAction(c, at("2026-10-16"), true)).toBe("continue");
    const fading = applyRun(c, recheck(c, "2026-10-16", 1), "strip-disguise", LAGOS)!;
    expect(homeAction(fading, at("2026-10-17"), false)).toBe("recover");
    expect(homeAction(null, at("2026-10-17"), false)).toBe("practice");
  });

  test("civil-date edges across zones, including UTC+14 and UTC-11", () => {
    for (const tz of ["Africa/Lagos", "Pacific/Kiritimati", "Pacific/Pago_Pago", "America/New_York"])
      expect(civilDate(atCivilDate("2026-10-16", tz), tz)).toBe("2026-10-16");
    // 23:30 in Lagos is already the next date in Kiritimati, but the cycle keeps its own zone.
    const c = applyRun(null, soloPass("2026-10-13", "23:30"), "strip-disguise", "Pacific/Kiritimati")!;
    expect(c.anchor).toBe(civilDate(at("2026-10-13", "23:30"), "Pacific/Kiritimati"));
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
});
