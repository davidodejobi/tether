import type { NumberTag, Pack, Verb } from "./types.ts";

/** Returns a float in [0, 1). Math.random in the app; seeded in tests. */
export type Rng = () => number;

export interface Combo {
  id: string;
  subject: string;
  covered: string;
  verb: Verb;
  predicate: string;
  number: NumberTag;
}

export interface Question {
  id: string;
  moveId: string;
  contentVersion: number;
  subject: string;
  /** The side phrase Strip the Disguise covers. */
  covered: string;
  predicate: string;
  number: NumberTag;
  /** Four shuffled, distinct options. */
  options: string[];
  answer: string;
}

/** Every question the pack can produce: each subject with each opposite-number side phrase and each predicate. */
export function allCombos(pack: Pack): Combo[] {
  const combos: Combo[] = [];
  for (const s of pack.subjects)
    for (const p of pack.sidePhrases.filter((p) => p.number !== s.number))
      for (const verb of pack.verbs)
        for (const pr of verb.predicates)
          combos.push({ id: `${s.id}.${p.id}.${pr.id}`, subject: s.text, covered: p.text, verb, predicate: pr.text, number: s.number });
  return combos;
}

export function lessonCombo(pack: Pack): Combo {
  const e = pack.lessonExample;
  const verb = pack.verbs.find((v) => v.id === e.verbId);
  if (!verb) throw new Error(`Lesson example uses unknown verb ${e.verbId}`);
  return { id: "lesson", subject: e.subject, covered: e.sidePhrase, verb, predicate: e.predicate, number: e.number };
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

/** One practice question, never the same as the previous one. */
export function nextPracticeQuestion(pack: Pack, rng: Rng, previousId?: string): Question {
  const pool = practicePool(pack).filter((c) => c.id !== previousId);
  return buildQuestion(pack, pool[Math.floor(rng() * pool.length)]!, rng);
}

/**
 * Distinct questions for a solo check (5 + 5) or a recheck (3 + 2 or 2 + 3), in shuffled order.
 * Questions in `avoid` (the previous proof run) are used only if the pool runs out.
 */
export function drawRun(
  pack: Pack,
  rng: Rng,
  counts: { sg: number; pl: number },
  avoid: ReadonlySet<string> = new Set(),
): Question[] {
  const picked: Combo[] = [];
  for (const n of ["sg", "pl"] as const) {
    const pool = practicePool(pack).filter((c) => c.number === n);
    const fresh = shuffle(pool.filter((c) => !avoid.has(c.id)), rng);
    const reused = shuffle(pool.filter((c) => avoid.has(c.id)), rng);
    const chosen = [...fresh, ...reused].slice(0, counts[n]);
    if (chosen.length < counts[n]) throw new Error(`Only ${pool.length} ${n} questions; ${counts[n]} needed`);
    picked.push(...chosen);
  }
  return shuffle(picked, rng).map((c) => buildQuestion(pack, c, rng));
}
