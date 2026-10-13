import { describe, expect, it } from "vitest";
import { stripDisguise as pack } from "../../content/strip-disguise.ts";
import { nextMoment } from "../../rules/moment.ts";
import type { ProofCycle } from "../../rules/proof.ts";
import type { Progress } from "../../storage/progress.ts";
import { planRun } from "./plan.ts";

const empty = (): Progress => ({ learner: null, attempts: new Map(), runs: new Map(), cycles: new Map() });
const NOW = Date.UTC(2026, 5, 10, 12);
const moment = () => nextMoment(null, NOW);
const cycle = (over: Partial<ProofCycle>): ProofCycle => ({
  moveId: pack.moveId, timeZone: "UTC", state: "held", earnedOn: "2026-06-01", anchor: "2026-06-01",
  entries: [{ id: "e3", day: 3, due: "2026-06-04", status: "scheduled" }, { id: "e7", day: 7, due: "2026-06-30", status: "scheduled" }],
  history: [], ...over,
});

describe("planRun", () => {
  it("solo: ten distinct questions, a ten-minute deadline, no snapshot before ten practice questions", () => {
    const { run, questions } = planRun(empty(), "solo", NOW, "r1", moment, Math.random)!;
    expect(new Set(run.questionIds).size).toBe(10);
    expect(questions.map((q) => q.id)).toEqual(run.questionIds);
    expect(run.deadline - run.started.at).toBe(10 * 60_000);
    expect(run.practiceSnapshot).toBeNull();
  });
  it("recheck is refused when nothing is due", () => {
    expect(planRun(empty(), "recheck", NOW, "r", moment, Math.random)).toBeNull();
    const p = empty();
    p.cycles.set(pack.moveId, cycle({ entries: [{ id: "e7", day: 7, due: "2026-06-30", status: "scheduled" }] }));
    expect(planRun(p, "recheck", NOW, "r", moment, Math.random)).toBeNull();
  });
  it("recheck: five questions covering what is due; recovery while fading", () => {
    const p = empty();
    p.cycles.set(pack.moveId, cycle({}));
    const due = planRun(p, "recheck", NOW, "r", moment, Math.random)!.run;
    expect(due).toMatchObject({ purpose: "scheduled", coveredEntryIds: ["e3"] });
    expect(due.questionIds).toHaveLength(5);
    expect(due.deadline - due.started.at).toBe(5 * 60_000);
    p.cycles.set(pack.moveId, cycle({ state: "fading", entries: [] }));
    expect(planRun(p, "recheck", NOW, "r", moment, Math.random)!.run.purpose).toBe("recovery");
  });
});
