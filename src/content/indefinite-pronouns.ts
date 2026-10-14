// Move 4: each, everyone, none. Each, every one, either, neither, everyone, everybody, no one and nobody take a
// singular verb, even with "of + plural" after them; both, many, several and few take a plural verb. None is tested
// only with uncountable words (none of the food is), where it is always singular; with plural nouns both forms are
// accepted in standard English, so a rule cannot mark one wrong.
import type { Combo, Move } from "./generate.ts";
import { combo, CONCORD_SOURCE, COUNT_WORDS, covered, PEOPLE_VERBS, predicatesOf, subject, UNREVIEWED, verb } from "./concord.ts";
import type { NumberTag } from "./types.ts";

const MOVE_ID = "indefinite-pronouns";

const OF_GROUP = ["of the students", "of the players", "of the prefects"]; // plural
const OF_TWO = ["of the twins", "of the captains"]; // plural, exactly two people
const IN_PLACE = ["in the class", "on the team", "in our street"]; // singular

// Each pronoun with the phrases it can take. The pronoun decides the number; the phrase is covered.
const PRONOUNS: { word: string; number: NumberTag; phrases: string[] }[] = [
  { word: "Each", number: "sg", phrases: OF_GROUP },
  { word: "Every one", number: "sg", phrases: OF_GROUP },
  { word: "Either", number: "sg", phrases: OF_TWO },
  { word: "Neither", number: "sg", phrases: OF_TWO },
  { word: "Everyone", number: "sg", phrases: IN_PLACE },
  { word: "Nobody", number: "sg", phrases: IN_PLACE },
  { word: "No one", number: "sg", phrases: IN_PLACE },
  { word: "Both", number: "pl", phrases: OF_TWO },
  { word: "Many", number: "pl", phrases: [...OF_GROUP, ...IN_PLACE] },
  { word: "Several", number: "pl", phrases: OF_GROUP },
  { word: "Few", number: "pl", phrases: OF_GROUP },
];
const phraseNumber = (phrase: string): NumberTag => (IN_PLACE.includes(phrase) ? "sg" : "pl");

// None with an uncountable word, each with predicates that fit it.
const BE = (...predicates: string[]) => verb("be", "is", "are", ["am", "be"], ...predicates);
const NONE = [
  { phrase: "of the food", v: BE("left.", "ready.") },
  { phrase: "of the water", v: BE("left.", "clean.") },
  { phrase: "of the money", v: BE("left.", "missing.") },
];

const id = (...bits: string[]) => [MOVE_ID, ...bits.map((b) => b.toLowerCase().replaceAll(" ", "-"))].join(".");

function combos(): Combo[] {
  const out: Combo[] = [];
  for (const w of PRONOUNS)
    for (const phrase of w.phrases)
      for (const { verb: v, p } of predicatesOf(PEOPLE_VERBS))
        out.push(combo(id(w.word, phrase, p.id), [subject(w.word), covered(phrase)], v, p.text, w.number, phraseNumber(phrase)));
  for (const n of NONE)
    for (const p of n.v.predicates) out.push(combo(id("None", n.phrase, p.id), [subject("None"), covered(n.phrase)], n.v, p.text, "sg", "sg"));
  return out;
}

export const indefinitePronouns: Move = {
  moveId: MOVE_ID,
  version: 1,
  ruleId: "indefinite-pronoun-number",
  title: "Each, everyone, none",
  source: CONCORD_SOURCE,
  review: UNREVIEWED,
  countWords: COUNT_WORDS,
  example: combo("example", [subject("Each"), covered("of the girls")], verb("have", "has", "have", ["having", "to have"]), "a new bag.", "sg", "pl"),
  combos: combos(),
  tutorialIds: [],
  coach: {
    en: {
      rule: "Each, every one, either, neither, everyone, no one: singular. Both, many, few, several: plural.",
      explanation:
        "Each, every one, either, neither, everyone, everybody, no one and nobody take one person at a time, so the verb is singular, even when \"of the students\" follows. Both, many, few and several always mean more than one, so the verb is plural. None with a word like food or money is singular. Cover the \"of\" or \"in\" phrase, read the first word, and match the verb.",
      nudge: "Cover the \"of\" or \"in\" phrase. Read the first word again.",
      showMe: ["Cover: {covered}.", "What's left: {subject}. That's {count}.", "{count} → {answer}."],
      goDeeper: {
        subject: "Tap the word the verb belongs to.",
        subjectHint: "That's the part to cover. Look at the first word.",
        count: "Does that word mean one, or more than one?",
        countHint: "Each, everyone and neither mean one at a time. Both, many and few mean more than one.",
        verb: "Now pick the verb that matches.",
        verbHint: "Does that verb match {count}? Try again.",
      },
      verify: "Tap the part you covered.",
    },
    pcm: {
      rule: "Each, every one, either, neither, everyone, no one: singular. Both, many, few, several: plural.",
      explanation:
        "Each, every one, either, neither, everyone, everybody, no one and nobody dey take one person at a time, so the verb na singular, even if \"of the students\" follow am. Both, many, few and several always mean plenty, so the verb na plural. None with word like food or money na singular. Cover the \"of\" or \"in\" part, read the first word, then match the verb.",
      nudge: "Cover the \"of\" or \"in\" part. Read the first word again.",
      showMe: ["Cover: {covered}.", "Wetin remain: {subject}. Na {count}.", "{count} → {answer}."],
      goDeeper: {
        subject: "Tap the word wey the verb belong to.",
        subjectHint: "Na the part to cover be that. Look the first word.",
        count: "That word mean one, or plenty?",
        countHint: "Each, everyone and neither mean one at a time. Both, many and few mean plenty.",
        verb: "Now pick the verb wey match.",
        verbHint: "That verb match {count}? Try again.",
      },
      verify: "Tap the part wey you cover.",
    },
  },
};
