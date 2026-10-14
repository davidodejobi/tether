// Move 3: collective nouns. A group word names one group acting as one, so its verb is singular, even with
// "of + many people" after it; a plural group word ("the two teams") takes a plural verb. Only the one-unit
// sense is tested; the members-acting-separately sense ("the jury were divided") is left for a later stage.
import type { Combo, Move } from "./generate.ts";
import { combo, CONCORD_SOURCE, COUNT_WORDS, covered, predicatesOf, subject, UNREVIEWED, verb } from "./concord.ts";

const MOVE_ID = "collective-nouns";

// Predicates that describe the group acting as one unit.
const VERBS = [
  verb("be", "is", "are", ["am", "be"], "ready to start.", "on the bus now."),
  verb("have", "has", "have", ["having", "to have"], "arrived at the hall."),
  verb("meet", "meets", "meet", ["meeting", "to meet"], "every Friday."),
  verb("travel", "travels", "travel", ["travelling", "to travel"], "to Abuja next week."),
];

// Each group word, singular and plural, with "of" phrases naming its members (plural) and "from" phrases naming a place (singular).
const GROUPS = [
  { id: "team", one: "The team", many: "The two teams", members: ["of eleven players", "of young players"], places: ["from our school", "from the next town"] },
  { id: "choir", one: "The choir", many: "The two choirs", members: ["of forty singers", "of young singers"], places: ["from our church", "from our school"] },
  { id: "committee", one: "The committee", many: "The two committees", members: ["of five teachers", "of seven parents"], places: ["from our school", "from our street"] },
  { id: "band", one: "The band", many: "The two bands", members: ["of young drummers", "of twelve musicians"], places: ["from our school", "from the next town"] },
  { id: "club", one: "The club", many: "The two clubs", members: ["of young readers", "of thirty members"], places: ["from our street", "from our school"] },
];

function combos(): Combo[] {
  const out: Combo[] = [];
  for (const g of GROUPS)
    for (const [head, number] of [[g.one, "sg"], [g.many, "pl"]] as const) {
      if (!head) continue;
      for (const [phrases, decoy] of [[g.members, "pl"], [g.places, "sg"]] as const)
        for (const c of phrases)
          for (const { verb: v, p } of predicatesOf(VERBS))
            // The rule: the verb takes the number of the group word; its "of" or "from" phrase is covered.
            out.push(combo(`${MOVE_ID}.${g.id}-${number}.${c.replaceAll(" ", "-")}.${p.id}`, [subject(head), covered(c)], v, p.text, number, decoy));
    }
  return out;
}

export const collectiveNouns: Move = {
  moveId: MOVE_ID,
  version: 1,
  ruleId: "collective-noun-acting-as-one",
  title: "Collective nouns",
  source: CONCORD_SOURCE,
  review: UNREVIEWED,
  countWords: COUNT_WORDS,
  example: combo("example", [subject("A bunch"), covered("of keys")], verb("be", "is", "are", ["am", "be"]), "on the table.", "sg", "pl"),
  combos: combos(),
  tutorialIds: [],
  coach: {
    en: {
      rule: "A group word such as team, choir or committee is one group: singular verb, even with of + many people after it.",
      explanation:
        "Team, choir, committee, band and club each name one group. When the group acts as one, the verb is singular, even when of eleven players or of five teachers follows. Cover the of or from phrase, read the group word, and match the verb. If the group word is itself plural, like the two teams, the verb is plural.",
      nudge: "Cover the of or from phrase. Is the group word one group, or more?",
      showMe: ["Cover: {covered}.", "What's left: {subject}. That's {count}.", "{count} → {answer}."],
      goDeeper: {
        subject: "Tap the group word the verb belongs to.",
        subjectHint: "That's the part to cover. Look at the group word.",
        count: "Is that one group, or more than one?",
        countHint: "One team or one choir is one group, however many people are in it.",
        verb: "Now pick the verb that matches.",
        verbHint: "Does that verb match {count}? Try again.",
      },
      verify: "Tap the part you covered.",
    },
    pcm: {
      rule: "Group word like team, choir or committee na one group: singular verb, even if of + plenty people follow am.",
      explanation:
        "Team, choir, committee, band and club, each one na one group. When the group dey act as one, the verb na singular, even if of eleven players or of five teachers follow am. Cover the of or from part, read the group word, then match the verb. If the group word itself na plenty, like the two teams, the verb na plural.",
      nudge: "Cover the of or from part. The group word na one group, or plenty?",
      showMe: ["Cover: {covered}.", "Wetin remain: {subject}. Na {count}.", "{count} → {answer}."],
      goDeeper: {
        subject: "Tap the group word wey the verb belong to.",
        subjectHint: "Na the part to cover be that. Look the group word.",
        count: "Na one group, or plenty?",
        countHint: "One team or one choir na one group, no matter how many people dey inside.",
        verb: "Now pick the verb wey match.",
        verbHint: "That verb match {count}? Try again.",
      },
      verify: "Tap the part wey you cover.",
    },
  },
};
