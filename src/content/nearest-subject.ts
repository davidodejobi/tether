// Move 2: the nearest subject. With either…or and neither…nor, the verb matches the subject nearer to it.
import type { Combo, Move } from "./generate.ts";
import { combo, CONCORD_SOURCE, COUNT_WORDS, covered, PEOPLE_VERBS, predicatesOf, subject, UNREVIEWED, verb } from "./concord.ts";
import type { NumberTag } from "./types.ts";

const MOVE_ID = "nearest-subject";

const PEOPLE: { id: string; text: string; number: NumberTag }[] = [
  { id: "tunde", text: "Tunde", number: "sg" },
  { id: "amina", text: "Amina", number: "sg" },
  { id: "emeka", text: "Emeka", number: "sg" },
  { id: "head-boy", text: "the head boy", number: "sg" },
  { id: "class-captain", text: "the class captain", number: "sg" },
  { id: "students", text: "the students", number: "pl" },
  { id: "prefects", text: "the prefects", number: "pl" },
  { id: "players", text: "the players", number: "pl" },
  { id: "twins", text: "the twins", number: "pl" },
  { id: "teachers", text: "the teachers", number: "pl" },
];

// Every ordered pair of different people, alternating either…or and neither…nor, each with three predicates.
function combos(): Combo[] {
  const all = predicatesOf(PEOPLE_VERBS);
  const out: Combo[] = [];
  let i = 0;
  for (const far of PEOPLE)
    for (const near of PEOPLE) {
      if (far === near) continue;
      const [a, b] = i % 2 ? ["Neither", "nor"] : ["Either", "or"];
      for (const k of [0, 2, 4]) {
        const { verb: v, p } = all[(i + k) % all.length]!;
        // The rule: the verb takes the number of the nearer subject; the farther one is covered.
        out.push(combo(`${MOVE_ID}.${far.id}.${near.id}.${p.id}`, [covered(`${a} ${far.text} ${b}`), subject(near.text)], v, p.text, near.number, far.number));
      }
      i++;
    }
  return out;
}

export const nearestSubject: Move = {
  moveId: MOVE_ID,
  version: 1,
  ruleId: "verb-matches-nearest-subject",
  title: "Either…or, neither…nor: the nearest subject",
  source: CONCORD_SOURCE,
  review: UNREVIEWED,
  countWords: COUNT_WORDS,
  example: combo("example", [covered("Neither Chidi nor"), subject("his friends")], verb("be", "is", "are", ["am", "be"]), "in the hall.", "pl", "sg"),
  combos: combos(),
  tutorialIds: [],
  coach: {
    en: {
      rule: "Either…or, neither…nor: the verb matches the subject nearest to it.",
      explanation:
        "When either…or or neither…nor joins two subjects, only the one nearer the blank controls the verb. Cover the first part, read the nearest subject, and match the verb to it.",
      nudge: "Look at the subject right next to the blank.",
      showMe: ["Cover the far part: {covered}.", "Nearest subject: {subject}. That's {count}.", "{count} → {answer}."],
      goDeeper: {
        subject: "Tap the subject nearest to the blank.",
        subjectHint: "That subject is further away. Look closer to the blank.",
        count: "Is that one, or more than one?",
        countHint: "Count only the nearest subject.",
        verb: "Now pick the verb that matches.",
        verbHint: "Does that verb match {count}? Try again.",
      },
      verify: "Tap the part you covered.",
    },
    pcm: {
      rule: "Either…or, neither…nor: the verb go follow the subject wey near am pass.",
      explanation:
        "When either…or or neither…nor join two subjects, na only the one wey near the blank dey control the verb. Cover the first part, read the subject wey near, then match the verb.",
      nudge: "Look the subject wey dey near the blank.",
      showMe: ["Cover the far part: {covered}.", "The one wey near: {subject}. Na {count}.", "{count} → {answer}."],
      goDeeper: {
        subject: "Tap the subject wey near the blank.",
        subjectHint: "That one dey far. Look near the blank.",
        count: "Na one, or plenty?",
        countHint: "Count only the subject wey near.",
        verb: "Now pick the verb wey match.",
        verbHint: "That verb match {count}? Try again.",
      },
      verify: "Tap the part wey you cover.",
    },
  },
};
