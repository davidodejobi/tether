import type { NumberTag, Pack, Verb } from "./types.ts";

/** The only rule this generator implements; a pack must name it. */
export const RULE_ID = "verb-matches-subject-before-side-phrase";

/** Returns a float in [0, 1). Math.random in the app; seeded in tests. */
export type Rng = () => number;

export type Pairing = "same" | "opposite";

export interface Combo {
  id: string;
  subject: string;
  covered: string;
  verb: Verb;
  predicate: string;
  number: NumberTag;
  /** Whether the side phrase has the same number as the subject. */
  pairing: Pairing;
}

/** How many questions of each subject number and pairing a run contains. */
export type RunShape = Record<NumberTag, Record<Pairing, number>>;

// Choosing the verb that disagrees with the side phrase answers every opposite-number item and
// misses every same-number item. These shapes keep that shortcut below the pass marks.
/** Solo: 5 singular + 5 plural, four same-number. The shortcut scores 6/10; passing needs 8/10. */
export const SOLO_SHAPE: RunShape = { sg: { same: 2, opposite: 3 }, pl: { same: 2, opposite: 3 } };
/** Rechecks alternate 3 + 2 and 2 + 3, two same-number each. The shortcut scores 3/5; passing needs 4/5. */
export const RECHECK_SHAPES: readonly [RunShape, RunShape] = [
  { sg: { same: 1, opposite: 2 }, pl: { same: 1, opposite: 1 } },
  { sg: { same: 1, opposite: 1 }, pl: { same: 1, opposite: 2 } },
];
/** Practice mixes pairings in the same proportion as solo. */
export const PRACTICE_SAME_SHARE = 0.4;

export interface Question {
  id: string;
  moveId: string;
  contentVersion: number;
  subject: string;
  /** The side phrase Strip the Disguise covers. */
  covered: string;
  predicate: string;
  number: NumberTag;
  pairing: Pairing;
  /** Four shuffled, distinct options. */
  options: string[];
  answer: string;
}

/**
 * Every question the pack can produce: each subject with each opposite-number side phrase, plus each
 * same-number side phrase marked `sameNumber`, and each predicate.
 */
export function allCombos(pack: Pack): Combo[] {
  const combos: Combo[] = [];
  for (const s of pack.subjects)
    for (const p of pack.sidePhrases.filter((p) => p.number !== s.number || p.sameNumber))
      for (const verb of pack.verbs)
        for (const pr of verb.predicates)
          combos.push({
            id: `${s.id}.${p.id}.${pr.id}`,
            subject: s.text,
            covered: p.text,
            verb,
            predicate: pr.text,
            number: s.number,
            pairing: p.number === s.number ? "same" : "opposite",
          });
  return combos;
}

export function lessonCombo(pack: Pack): Combo {
  const e = pack.lessonExample;
  const verb = pack.verbs.find((v) => v.id === e.verbId);
  if (!verb) throw new Error(`Lesson example uses unknown verb ${e.verbId}`);
  return { id: "lesson", subject: e.subject, covered: e.sidePhrase, verb, predicate: e.predicate, number: e.number, pairing: "opposite" };
}

export function sentence(q: Pick<Question, "subject" | "covered" | "predicate">, blank = "___"): string {
  return `${q.subject}, ${q.covered}, ${blank} ${q.predicate}`;
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function buildQuestion(pack: Pack, c: Combo, rng: Rng): Question {
  const answer = c.verb[c.number]; // the rule: the verb takes the number of the subject before the side phrase
  return {
    id: c.id,
    moveId: pack.moveId,
    contentVersion: pack.version,
    subject: c.subject,
    covered: c.covered,
    predicate: c.predicate,
    number: c.number,
    pairing: c.pairing,
    options: shuffle([c.verb.sg, c.verb.pl, ...c.verb.distractors], rng),
    answer,
  };
}

/** Practice and proof never use the lesson example or the tutorial questions. */
export function practicePool(pack: Pack): Combo[] {
  const reserved = new Set<string>(pack.tutorialIds);
  return allCombos(pack).filter((c) => !reserved.has(c.id));
}

export function tutorialQuestions(pack: Pack, rng: Rng): Question[] {
  const byId = new Map(allCombos(pack).map((c) => [c.id, c]));
  return pack.tutorialIds.map((id) => {
    const c = byId.get(id);
    if (!c) throw new Error(`Unknown tutorial question ${id}`);
    return buildQuestion(pack, c, rng);
  });
}

/** One practice question, never the same as the previous one; about 40% same-number pairings. */
export function nextPracticeQuestion(pack: Pack, rng: Rng, previousId?: string): Question {
  const pairing: Pairing = rng() < PRACTICE_SAME_SHARE ? "same" : "opposite";
  const pool = practicePool(pack).filter((c) => c.id !== previousId);
  const preferred = pool.filter((c) => c.pairing === pairing);
  const from = preferred.length ? preferred : pool;
  return buildQuestion(pack, from[Math.floor(rng() * from.length)]!, rng);
}

/**
 * Distinct questions for a solo check or recheck, with exactly the counts in `shape`, in shuffled order.
 * Questions in `avoid` (the previous proof run) are used only if the pool runs out.
 */
export function drawRun(pack: Pack, rng: Rng, shape: RunShape, avoid: ReadonlySet<string> = new Set()): Question[] {
  const picked: Combo[] = [];
  const pool = practicePool(pack);
  for (const n of ["sg", "pl"] as const)
    for (const pairing of ["same", "opposite"] as const) {
      const want = shape[n][pairing];
      const cell = pool.filter((c) => c.number === n && c.pairing === pairing);
      const fresh = shuffle(cell.filter((c) => !avoid.has(c.id)), rng);
      const reused = shuffle(cell.filter((c) => avoid.has(c.id)), rng);
      const chosen = [...fresh, ...reused].slice(0, want);
      if (chosen.length < want) throw new Error(`Only ${cell.length} ${n} ${pairing} questions; ${want} needed`);
      picked.push(...chosen);
    }
  return shuffle(picked, rng).map((c) => buildQuestion(pack, c, rng));
}

/** The full question list David reviews (docs/content/move-1-questions.txt). */
export function questionListing(pack: Pack): string {
  const reserved = new Set<string>(pack.tutorialIds);
  const lines = allCombos(pack).map(
    (c) => `${c.id}\t${c.number}\t${c.pairing}\t${c.verb[c.number]}\t${sentence(c)}${reserved.has(c.id) ? "\t[tutorial]" : ""}`,
  );
  const header = [`# ${pack.title} (${pack.moveId}) v${pack.version}: ${lines.length} questions`, "# id\tnumber\tpairing\tanswer\tsentence"];
  return [...header, ...lines, ""].join("\n");
}
