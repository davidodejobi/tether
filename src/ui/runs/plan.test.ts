import { describe, expect, it } from "vitest";
import { moveById, stripDisguiseMove as pack } from "../../content/moves.ts";
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

describe("planRun per move", () => {
  const m3 = moveById("collective-nouns")!;
  it("draws only the asked move's questions and avoids only that move's previous run", () => {
    const p = empty();
    const first = planRun(p, m3, "solo", NOW, "r3", moment, Math.random)!;
    expect(first.questions.every((q) => q.moveId === "collective-nouns")).toBe(true);
    p.runs.set("r3", first);
    // A later move-1 run is not "the previous run" of move 3: move 3's own run is avoided.
    const other = planRun(p, pack, "solo", NOW, "r1", () => nextMoment(first.run.started, NOW), Math.random)!;
    p.runs.set("r1", other);
    const again = planRun(p, m3, "solo", NOW, "r3b", () => nextMoment(other.run.started, NOW), Math.random)!;
    const overlap = again.run.questionIds.filter((id) => first.run.questionIds.includes(id));
    expect(overlap.length).toBeLessThan(first.run.questionIds.length);
  });
  it("snapshots practice from the asked move only", () => {
    const p = empty();
    expect(planRun(p, m3, "solo", NOW, "r", moment, Math.random)!.run.practiceSnapshot).toBeNull();
  });
  it("a recheck uses that move's cycle", () => {
    const p = empty();
    p.cycles.set(pack.moveId, cycle({}));
    expect(planRun(p, m3, "recheck", NOW, "r", moment, Math.random)).toBeNull();
    p.cycles.set(m3.moveId, cycle({ moveId: m3.moveId }));
    expect(planRun(p, m3, "recheck", NOW, "r", moment, Math.random)!.questions.every((q) => q.moveId === m3.moveId)).toBe(true);
  });
});

describe("planRun", () => {
  it("solo: ten distinct questions, a ten-minute deadline, no snapshot before ten practice questions", () => {
    const { run, questions } = planRun(empty(), pack, "solo", NOW, "r1", moment, Math.random)!;
    expect(new Set(run.questionIds).size).toBe(10);
    expect(questions.map((q) => q.id)).toEqual(run.questionIds);
    expect(run.deadline - run.started.at).toBe(10 * 60_000);
    expect(run.practiceSnapshot).toBeNull();
  });
  it("recheck is refused when nothing is due", () => {
    expect(planRun(empty(), pack, "recheck", NOW, "r", moment, Math.random)).toBeNull();
    const p = empty();
    p.cycles.set(pack.moveId, cycle({ entries: [{ id: "e7", day: 7, due: "2026-06-30", status: "scheduled" }] }));
    expect(planRun(p, pack, "recheck", NOW, "r", moment, Math.random)).toBeNull();
  });
  it("recheck: five questions covering what is due; recovery while fading", () => {
    const p = empty();
    p.cycles.set(pack.moveId, cycle({}));
    const due = planRun(p, pack, "recheck", NOW, "r", moment, Math.random)!.run;
    expect(due).toMatchObject({ purpose: "scheduled", coveredEntryIds: ["e3"] });
    expect(due.questionIds).toHaveLength(5);
    expect(due.deadline - due.started.at).toBe(5 * 60_000);
    p.cycles.set(pack.moveId, cycle({ state: "fading", entries: [] }));
    expect(planRun(p, pack, "recheck", NOW, "r", moment, Math.random)!.run.purpose).toBe("recovery");
  });
});
