import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  allCombos,
  drawRun,
  nextPracticeQuestion,
  practicePool,
  questionListing,
  RECHECK_SHAPES,
  SOLO_SHAPE,
  tutorialQuestions,
  type Question,
  type Rng,
} from "./generate.ts";
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
const errorsOf = (p: Pack) => validatePack(p).errors.join("\n");
const combos = new Map(allCombos(stripDisguise).map((c) => [c.id, c]));

// The wrong strategy: pick the verb that disagrees with the side phrase, without stripping it.
function shortcutScore(run: Question[]): number {
  return run.filter((q) => {
    const sideId = q.id.split(".")[1];
    const side = stripDisguise.sidePhrases.find((p) => p.id === sideId)!;
    return combos.get(q.id)!.verb[side.number === "sg" ? "pl" : "sg"] === q.answer;
  }).length;
}

describe("Move 1 pack", () => {
  test("passes validation", () => {
    expect(validatePack(stripDisguise).errors).toEqual([]);
  });

  test("has enough distinct practice sentences in every number and pairing", () => {
    const pool = practicePool(stripDisguise);
    expect(pool.length).toBeGreaterThanOrEqual(50);
    for (const n of ["sg", "pl"])
      for (const pairing of ["same", "opposite"])
        expect(pool.filter((c) => c.number === n && c.pairing === pairing).length).toBeGreaterThanOrEqual(10);
  });

  test("the committed review listing matches the pack (run npm run content:list after edits)", () => {
    const committed = readFileSync(new URL("../../docs/content/move-1-questions.txt", import.meta.url), "utf8");
    expect(committed).toBe(questionListing(stripDisguise));
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

  test("the answer follows the subject before the side phrase", () => {
    for (const q of drawRun(stripDisguise, rng, SOLO_SHAPE)) expect(q.answer).toBe(combos.get(q.id)!.verb[q.number]);
  });

  test("practice mixes same-number and opposite-number pairings", () => {
    let same = 0;
    for (let i = 0; i < 1000; i++) if (nextPracticeQuestion(stripDisguise, rng).pairing === "same") same++;
    expect(same).toBeGreaterThan(300);
    expect(same).toBeLessThan(500);
  });

  test("never repeats the previous practice question", () => {
    let prev: string | undefined;
    for (let i = 0; i < 500; i++) {
      const q = nextPracticeQuestion(stripDisguise, rng, prev);
      expect(q.id).not.toBe(prev);
      prev = q.id;
    }
  });

  test("solo runs are 5 + 5 with four same-number items, and the next run avoids the previous one", () => {
    const first = drawRun(stripDisguise, rng, SOLO_SHAPE);
    expect(new Set(first.map((q) => q.id)).size).toBe(10);
    expect(first.filter((q) => q.number === "sg")).toHaveLength(5);
    expect(first.filter((q) => q.pairing === "same")).toHaveLength(4);
    const second = drawRun(stripDisguise, rng, SOLO_SHAPE, new Set(first.map((q) => q.id)));
    expect(second.some((q) => first.some((f) => f.id === q.id))).toBe(false);
  });

  test("rechecks are 3 + 2 or 2 + 3 with two same-number items", () => {
    const [a, b] = RECHECK_SHAPES.map((shape) => drawRun(stripDisguise, rng, shape));
    expect(a!.filter((q) => q.number === "sg")).toHaveLength(3);
    expect(b!.filter((q) => q.number === "pl")).toHaveLength(3);
    for (const run of [a!, b!]) expect(run.filter((q) => q.pairing === "same")).toHaveLength(2);
  });

  test("the disagree-with-the-side-phrase shortcut fails every proof run", () => {
    for (let i = 0; i < 50; i++) {
      expect(shortcutScore(drawRun(stripDisguise, rng, SOLO_SHAPE))).toBe(6); // pass needs 8/10
      for (const shape of RECHECK_SHAPES) expect(shortcutScore(drawRun(stripDisguise, rng, shape))).toBe(3); // pass needs 4/5
    }
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
    expect(errorsOf(p)).toMatch(/four distinct/);
  });

  test("empty correct verb or distractor", () => {
    const p = copy();
    p.verbs[0]!.sg = "";
    p.verbs[1]!.distractors = ["having", " "];
    expect(errorsOf(p)).toMatch(/verb be: empty text/);
    expect(errorsOf(p)).toMatch(/verb have: empty text/);
  });

  test("unfilled placeholder", () => {
    const p = copy();
    p.sidePhrases[0]!.text = "as well as {poss} friends";
    expect(errorsOf(p)).toMatch(/unfilled placeholder/);
  });

  test("required coach copy removed from both languages", () => {
    const p = copy();
    delete (p.coach.en as Partial<Pack["coach"]["en"]>).nudge;
    delete (p.coach.pcm as Partial<Pack["coach"]["pcm"]>).nudge;
    expect(errorsOf(p)).toMatch(/coach\.en\.nudge is missing/);
    expect(errorsOf(p)).toMatch(/coach\.pcm\.nudge is missing/);
  });

  test("answer stated outside the last Show me beat", () => {
    const p = copy();
    p.coach.en.nudge = "The answer is {answer}.";
    expect(errorsOf(p)).toMatch(/must not state the answer/);
  });

  test("Go deeper hint that gives the subject away", () => {
    const p = copy();
    p.coach.en.goDeeper.subjectHint = "The subject is {subject}.";
    expect(errorsOf(p)).toMatch(/gives the subject away/);
  });

  test("Pidgin placeholders drift from English", () => {
    const p = copy();
    p.coach.pcm.showMe[1] = "Wetin remain: {subject}.";
    expect(errorsOf(p)).toMatch(/placeholders differ/);
  });

  test("too few same-number questions for two separate solo runs", () => {
    const p = copy();
    p.subjects = p.subjects.filter((s) => s.number === "pl" || s.id === "tunde");
    p.sidePhrases = p.sidePhrases.filter((s) => s.number === "pl" || s.id === "class-captain");
    p.verbs = p.verbs.slice(0, 1);
    expect(errorsOf(p)).toMatch(/Only 3 sg same-number practice sentences; 4 needed/);
  });

  test("approved Pidgin without a named reviewer", () => {
    const p = copy();
    p.review.pcm = { status: "approved" };
    expect(errorsOf(p)).toMatch(/review\.pcm is approved without a reviewer/);
  });

  test("pending English review is a release blocker; a named approval clears it", () => {
    const p = copy();
    p.review.en = { status: "pending" };
    expect(validatePack(p).releaseBlockers).toHaveLength(1);
    p.review.en = { status: "approved", reviewer: "Reviewer", date: "2026-10-13" };
    expect(validatePack(p).errors).toEqual([]);
    expect(validatePack(p).releaseBlockers).toEqual([]);
  });
});
