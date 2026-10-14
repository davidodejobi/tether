import { describe, expect, test } from "vitest";
import { sentence } from "./generate.ts";
import { answerOf, BASICS, lessonOf, lessons, type LessonCard, type LessonSentence } from "./learn.ts";
import { moves } from "./moves.ts";

const sentencesOf = (cards: LessonCard[]): LessonSentence[] =>
  cards.flatMap((c) => (c.kind === "pair" ? [c.first, c.second] : c.kind === "worked" || c.kind === "why" || c.kind === "try" ? [c.sentence] : []));
const text = (x: LessonSentence) => sentence({ subject: "", covered: "", parts: x.parts, predicate: x.predicate });

test("every playable move has a lesson, in journey order", () => {
  expect(lessons.map((l) => l.moveId)).toEqual(moves.map((m) => m.moveId));
  for (const m of moves) expect(lessonOf(m.moveId)).toBeDefined();
});

describe.each([["basics", BASICS] as const, ...lessons.map((l) => [l.moveId, l.cards] as const)])("%s", (_, cards) => {
  test("every sentence has one subject, a capital, a full stop and four distinct options", () => {
    for (const x of sentencesOf(cards)) {
      expect(x.parts.filter((p) => p.role === "subject")).toHaveLength(1);
      expect(text(x)).toMatch(/^[A-Z"][^_]* ___ [^_]+\.$/);
      expect(new Set([x.sg, x.pl, ...x.distractors].map((o) => o.toLowerCase())).size).toBe(4);
      expect(answerOf(x)).toBe(x.number === "sg" ? x.sg : x.pl);
    }
  });
  test("each why card has exactly one correct reason, and every reason explains itself", () => {
    for (const c of cards)
      if (c.kind === "why") {
        expect(c.options.filter((o) => o.correct)).toHaveLength(1);
        for (const o of c.options) expect(o.feedback.length).toBeGreaterThan(10);
      }
  });
});

test.each(lessons.map((l) => [l.moveId, l] as const))("%s: lesson sentences never repeat a practice or proof question", (moveId, lesson) => {
  const asked = new Set(moves.find((m) => m.moveId === moveId)!.combos.map((x) => sentence(x)));
  for (const x of sentencesOf(lesson.cards)) expect(asked.has(text(x))).toBe(false);
});

test("each move lesson has a contrast, a worked example, a why check and a try", () => {
  for (const l of lessons) for (const kind of ["pair", "worked", "why", "try"]) expect(l.cards.some((c) => c.kind === kind), `${l.moveId} ${kind}`).toBe(true);
});
