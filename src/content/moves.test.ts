import { describe, expect, test } from "vitest";
import { availableStages } from "./blueprint.ts";
import { drawRun, practicePool, RECHECK_SHAPES, sentence, SOLO_SHAPE, type Question, type Rng } from "./generate.ts";
import { moveById, moves } from "./moves.ts";
import { validateMove } from "./validate.ts";

function seeded(seed: number): Rng {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const later = moves.slice(1);

test("the five available stages are the five moves, in journey order", () => {
  expect(availableStages.map((s) => s.moveId)).toEqual(moves.map((m) => m.moveId));
  expect(availableStages.map((s) => s.n)).toEqual([1, 2, 3, 4, 5]);
});

test("question IDs are unique across every move", () => {
  const ids = moves.flatMap((m) => m.combos.map((c) => c.id));
  expect(new Set(ids).size).toBe(ids.length);
});

describe.each(later.map((m) => [m.moveId, m] as const))("%s", (_, move) => {
  test("passes validation, and stays Unreviewed until a named reviewer approves it", () => {
    const { errors, releaseBlockers } = validateMove(move);
    expect(errors).toEqual([]);
    expect(move.review.en.status).toBe("unreviewed");
    expect(releaseBlockers).toHaveLength(1);
  });

  test("solo runs and both recheck shapes can be drawn twice without repeating a question", () => {
    const rng = seeded(7);
    for (const shape of [SOLO_SHAPE, ...RECHECK_SHAPES]) {
      const first = drawRun(move, rng, shape);
      const second = drawRun(move, rng, shape, new Set(first.map((q) => q.id)));
      expect(second.some((q) => first.some((f) => f.id === q.id))).toBe(false);
    }
  });

  // Following the covered words (or doing the opposite) must never pass a proof run.
  test("the covered-words shortcut and its opposite fail every proof run", () => {
    const rng = seeded(11);
    const decoy = (q: Question) => (q.pairing === "same" ? q.number : q.number === "sg" ? "pl" : "sg");
    const score = (run: Question[], follow: boolean) => run.filter((q) => (decoy(q) === q.number) === follow).length;
    for (let i = 0; i < 50; i++) {
      const solo = drawRun(move, rng, SOLO_SHAPE);
      expect(Math.max(score(solo, true), score(solo, false))).toBeLessThan(8);
      for (const shape of RECHECK_SHAPES) {
        const run = drawRun(move, rng, shape);
        expect(Math.max(score(run, true), score(run, false))).toBeLessThan(4);
      }
    }
  });

  test("every sentence keeps the blank between its parts and its predicate", () => {
    for (const c of practicePool(move)) expect(sentence(c)).toMatch(/^[A-Z][^_]* ___ [^_]+\.$/);
  });
});

// Spot checks of the rules on fixed sentences (docs/content/move-N-questions.txt lists them all).
const answerOf = (moveId: string, text: string) => {
  const c = moveById(moveId)!.combos.find((x) => sentence(x) === text);
  if (!c) throw new Error(`No question "${text}"`);
  return c.verb[c.number];
};

test.each([
  ["nearest-subject", "Neither Tunde nor the twins ___ near the market.", "live"],
  ["nearest-subject", "Either the students or Amina ___ near the market.", "lives"],
  ["nearest-subject", "Either the teachers or the head boy ___ finished the project.", "has"],
  ["collective-nouns", "The team of eleven players ___ ready to start.", "is"],
  ["collective-nouns", "The two committees from our street ___ ready to start.", "are"],
  ["collective-nouns", "The band from the next town ___ every Friday.", "meets"],
  ["indefinite-pronouns", "Each of the students ___ in the hall.", "is"],
  ["indefinite-pronouns", "Neither of the captains ___ early on Mondays.", "arrives"],
  ["indefinite-pronouns", "Many in our street ___ finished the project.", "have"],
  ["indefinite-pronouns", "None of the water ___ clean.", "is"],
  ["one-of-the", "One of the students ___ always early.", "is"],
  ["one-of-the", "One of the new pupils from our school ___ to school every morning.", "walks"],
  ["one-of-the", "Ngozi is one of the students who ___ to school every morning.", "walk"],
  ["one-of-the", "Ngozi is one of the students from our school who ___ in the school choir.", "are"],
  ["one-of-the", "This is one of the books that ___ missing.", "are"],
])("%s: %s → %s", (moveId, text, answer) => expect(answerOf(moveId, text)).toBe(answer));
