// Shared pieces for the concord moves after Strip the Disguise (stages 2 to 5). Each move file owns its word lists and its rule.
import type { Combo, Part } from "./generate.ts";
import { stripDisguise } from "./strip-disguise.ts";
import type { NumberTag, Review, Verb } from "./types.ts";

/** All five stages sit under the same syllabus line as move 1: agreement/concord. */
export const CONCORD_SOURCE = stripDisguise.source;
export const COUNT_WORDS = stripDisguise.countWords;
/** Written for review; learners see an Unreviewed tag until a named reviewer approves (docs/content/moves-2-5-review.md). */
export const UNREVIEWED: Record<"en" | "pcm", Review> = { en: { status: "unreviewed" }, pcm: { status: "unreviewed" } };

export const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A verb with its singular and plural forms, two forms that never fit the blank, and the predicates it is used with. */
export const verb = (id: string, sg: string, pl: string, distractors: [string, string], ...predicates: string[]): Verb => ({
  id,
  sg,
  pl,
  distractors,
  predicates: predicates.map((text) => ({ id: slug(text), text })),
});

/** Verbs for sentences about people (stages 2 and 4 draw from these). */
export const PEOPLE_VERBS: Verb[] = [
  verb("be", "is", "are", ["am", "be"], "in the hall.", "ready for the test."),
  verb("have", "has", "have", ["having", "to have"], "finished the project."),
  verb("walk", "walks", "walk", ["walking", "to walk"], "to school every morning."),
  verb("live", "lives", "live", ["living", "to live"], "near the market."),
  verb("sit", "sits", "sit", ["sitting", "to sit"], "in the front row."),
  verb("arrive", "arrives", "arrive", ["arriving", "to arrive"], "early on Mondays."),
];

/** Every verb and predicate pair, in order. */
export const predicatesOf = (verbs: Verb[]) => verbs.flatMap((v) => v.predicates.map((p) => ({ verb: v, p })));

/**
 * One question. `parts` are the words before the blank; the "subject" part decides the verb, which takes `number`.
 * `decoy` is the number the covered words suggest: a question is "same" when that shortcut happens to give the right
 * answer and "opposite" when it misleads, so proof runs keep the shortcut below the pass mark.
 */
export function combo(id: string, parts: Part[], v: Verb, predicate: string, number: NumberTag, decoy: NumberTag): Combo {
  const of = (role: Part["role"]) => parts.filter((p) => p.role === role).map((p) => p.text).join(" … ");
  return { id, subject: of("subject"), covered: of("covered"), parts, verb: v, predicate, number, pairing: decoy === number ? "same" : "opposite" };
}

export const subject = (text: string): Part => ({ text, role: "subject" });
export const covered = (text: string): Part => ({ text, role: "covered" });
export const plain = (text: string): Part => ({ text, role: "plain" });
