import { describe, expect, test } from "vitest";
import { allCombos, drawRun, nextPracticeQuestion, practicePool, tutorialQuestions, type Rng } from "./generate.ts";
import { stripDisguise } from "./strip-disguise.ts";
import type { Pack } from "./types.ts";
import { validatePack } from "./validate.ts";

// Small deterministic RNG so the tests repeat exactly.
function seeded(seed: number): Rng {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const copy = (): Pack => structuredClone(stripDisguise) as Pack;

describe("Move 1 pack", () => {
  test("passes validation; English review is the only release blocker", () => {
    const { errors, releaseBlockers } = validatePack(stripDisguise);
    expect(errors).toEqual([]);
    expect(releaseBlockers).toHaveLength(1);
  });

  test("has enough distinct practice sentences, balanced by number", () => {
    const pool = practicePool(stripDisguise);
    expect(pool.length).toBeGreaterThanOrEqual(50);
    for (const n of ["sg", "pl"]) expect(pool.filter((c) => c.number === n).length).toBeGreaterThanOrEqual(10);
  });
});

describe("generation", () => {
  const rng = seeded(1);

  test("every question has four shuffled options and exactly one correct answer, in every position", () => {
    const positions = new Set<number>();
    for (let i = 0; i < 400; i++) {
      const q = nextPracticeQuestion(stripDisguise, rng);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
      positions.add(q.options.indexOf(q.answer));
    }
    expect([...positions].sort()).toEqual([0, 1, 2, 3]);
  });

  test("the answer follows the subject before the side phrase, not the side phrase", () => {
    const byId = new Map(allCombos(stripDisguise).map((c) => [c.id, c]));
    const q = drawRun(stripDisguise, rng, { sg: 5, pl: 5 });
    for (const x of q) expect(x.answer).toBe(byId.get(x.id)!.verb[x.number]);
  });

  test("never repeats the previous practice question", () => {
    let prev: string | undefined;
    for (let i = 0; i < 500; i++) {
      const q = nextPracticeQuestion(stripDisguise, rng, prev);
      expect(q.id).not.toBe(prev);
      prev = q.id;
    }
  });

  test("solo runs are 5 + 5 distinct, and the next run avoids the previous one", () => {
    const first = drawRun(stripDisguise, rng, { sg: 5, pl: 5 });
    expect(new Set(first.map((q) => q.id)).size).toBe(10);
    expect(first.filter((q) => q.number === "sg")).toHaveLength(5);
    const second = drawRun(stripDisguise, rng, { sg: 5, pl: 5 }, new Set(first.map((q) => q.id)));
    expect(second.some((q) => first.some((f) => f.id === q.id))).toBe(false);
  });

  test("rechecks can be 3 + 2 or 2 + 3", () => {
    expect(drawRun(stripDisguise, rng, { sg: 3, pl: 2 }).filter((q) => q.number === "sg")).toHaveLength(3);
    expect(drawRun(stripDisguise, rng, { sg: 2, pl: 3 }).filter((q) => q.number === "pl")).toHaveLength(3);
  });

  test("tutorial questions never appear in practice or proof", () => {
    const tutorial = new Set(tutorialQuestions(stripDisguise, rng).map((q) => q.id));
    expect(tutorial.size).toBe(3);
    expect(practicePool(stripDisguise).some((c) => tutorial.has(c.id))).toBe(false);
  });
});

describe("validator catches broken packs", () => {
  test("duplicate option", () => {
    const p = copy();
    p.verbs[0]!.distractors = ["is", "be"];
    expect(validatePack(p).errors.join("\n")).toMatch(/four distinct/);
  });

  test("unfilled placeholder", () => {
    const p = copy();
    p.sidePhrases[0]!.text = "as well as {poss} friends";
    expect(validatePack(p).errors.join("\n")).toMatch(/unfilled placeholder/);
  });

  test("answer stated outside the last Show me beat", () => {
    const p = copy();
    p.coach.en.nudge = "The answer is {answer}.";
    expect(validatePack(p).errors.join("\n")).toMatch(/must not state the answer/);
  });

  test("Pidgin placeholders drift from English", () => {
    const p = copy();
    p.coach.pcm.showMe[1] = "Wetin remain: {subject}.";
    expect(validatePack(p).errors.join("\n")).toMatch(/placeholders differ/);
  });

  test("too few questions of one number for two separate solo runs", () => {
    const p = copy();
    p.subjects = p.subjects.filter((s) => s.number === "pl" || s.id === "tunde");
    p.sidePhrases = p.sidePhrases.filter((s) => s.number === "sg" || s.id === "two-classmates");
    p.verbs = p.verbs.slice(0, 1);
    expect(validatePack(p).errors.join("\n")).toMatch(/sg practice sentences/);
  });

  test("approved English review clears the release blocker", () => {
    const p = copy();
    p.review.en = { status: "approved", reviewer: "Reviewer", date: "2026-10-13" };
    expect(validatePack(p).releaseBlockers).toEqual([]);
  });
});
