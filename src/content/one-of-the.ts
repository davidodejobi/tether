// Move 5: one of the … who/that. In "One of the students is late" the verb belongs to "one": singular. In "Tunde is one
// of the students who are late", "who" points back to "the students": plural. The noun nearest the blank is a decoy:
// it is singular in "One of the players from our school is" and in "one of the players from our school who are".
import type { Combo, Move } from "./generate.ts";
import { combo, CONCORD_SOURCE, COUNT_WORDS, covered, plain, predicatesOf, subject, UNREVIEWED, verb } from "./concord.ts";

const MOVE_ID = "one-of-the";

const PEOPLE_VERBS = [
  verb("be", "is", "are", ["am", "be"], "always early.", "in the school choir."),
  verb("have", "has", "have", ["having", "to have"], "finished the project."),
  verb("walk", "walks", "walk", ["walking", "to walk"], "to school every morning."),
  verb("live", "lives", "live", ["living", "to live"], "near the market."),
  verb("sit", "sits", "sit", ["sitting", "to sit"], "in the front row."),
];
const BOOK_VERBS = [verb("be", "is", "are", ["am", "be"], "missing.", "on the reading list.")];

// People take "who"; things take "that".
const KINDS = [
  { names: ["Tunde", "Amina", "Emeka", "Ngozi"], groups: ["the students", "the players", "the prefects", "the new pupils"], places: ["from our school", "in my class", "from the next street"], rel: "who", verbs: PEOPLE_VERBS },
  { names: ["This"], groups: ["the books"], places: ["from the library"], rel: "that", verbs: BOOK_VERBS },
];

const id = (...bits: string[]) => [MOVE_ID, ...bits.map((b) => b.toLowerCase().replaceAll(" ", "-"))].join(".");

function combos(): Combo[] {
  const out: Combo[] = [];
  for (const k of KINDS) {
    const preds = predicatesOf(k.verbs);
    k.groups.forEach((g, gi) => {
      for (const { verb: v, p } of preds) {
        // One of the … : the verb belongs to "one". Covered: the "of" phrase, with or without a place.
        out.push(combo(id("one", g, p.id), [subject("One"), covered(`of ${g}`)], v, p.text, "sg", "pl"));
        for (const place of k.places) out.push(combo(id("one", g, place, p.id), [subject("One"), covered(`of ${g} ${place}`)], v, p.text, "sg", "sg"));
        // … one of the … who: the verb belongs to the group "who" points back to. Covered: the lead-in, and any place.
        k.names.forEach((name, ni) => {
          out.push(combo(id(name, g, k.rel, p.id), [covered(`${name} is one of`), subject(g), plain(k.rel)], v, p.text, "pl", "pl"));
          const place = k.places[(ni + gi) % k.places.length]!;
          out.push(combo(id(name, g, place, k.rel, p.id), [covered(`${name} is one of`), subject(g), covered(place), plain(k.rel)], v, p.text, "pl", "sg"));
        });
      }
    });
  }
  return out;
}

export const oneOfThe: Move = {
  moveId: MOVE_ID,
  version: 1,
  ruleId: "one-of-the-who",
  title: "One of the … who/that",
  source: CONCORD_SOURCE,
  review: UNREVIEWED,
  countWords: COUNT_WORDS,
  example: combo("example", [covered("Bola is one of"), subject("the girls"), plain("who")], verb("be", "is", "are", ["am", "be"]), "in the choir.", "pl", "pl"),
  combos: combos(),
  tutorialIds: [],
  coach: {
    en: {
      rule: "One of the … takes a singular verb. One of the … who or that takes a plural verb: who points back to the group.",
      explanation:
        "In One of the students is late, the verb belongs to one, so it is singular. In Tunde is one of the students who are late, who points back to the students, more than one, so its verb is plural. Ask what the verb belongs to: one, or the group that who or that points back to.",
      nudge: "Is there a who or that right before the blank? Find what the verb belongs to.",
      showMe: ["Cover: {covered}.", "The verb belongs to: {subject}. That's {count}.", "{count} → {answer}."],
      goDeeper: {
        subject: "Tap the word the verb belongs to.",
        subjectHint: "That part doesn't decide the verb. Cover it and look again.",
        count: "Is that one, or more than one?",
        countHint: "One means one. The group that who or that points back to is more than one.",
        verb: "Now pick the verb that matches.",
        verbHint: "Does that verb match {count}? Try again.",
      },
      verify: "Tap the part you covered.",
    },
    pcm: {
      rule: "One of the … dey take singular verb. One of the … who or that dey take plural verb: who dey point back to the group.",
      explanation:
        "For One of the students is late, the verb belong to one, so e na singular. For Tunde is one of the students who are late, who dey point back to the students, wey be plenty, so the verb na plural. Ask yourself: the verb belong to one, or to the group wey who or that dey point back to?",
      nudge: "Who or that dey before the blank? Find wetin the verb belong to.",
      showMe: ["Cover: {covered}.", "The verb belong to: {subject}. Na {count}.", "{count} → {answer}."],
      goDeeper: {
        subject: "Tap the word wey the verb belong to.",
        subjectHint: "That part no dey decide the verb. Cover am, look again.",
        count: "Na one, or plenty?",
        countHint: "One na one. The group wey who or that dey point back to na plenty.",
        verb: "Now pick the verb wey match.",
        verbHint: "That verb match {count}? Try again.",
      },
      verify: "Tap the part wey you cover.",
    },
  },
};
