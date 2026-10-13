import { allCombos, buildQuestion, lessonCombo, practicePool, sentence } from "./generate.ts";
import type { CoachCopy, Linker, Pack } from "./types.ts";

export interface ValidationResult {
  /** Structural problems. Any error fails the build. */
  errors: string[];
  /** Things a person must sign off before learners see the pack. Reported, not failed. */
  releaseBlockers: string[];
}

const LINKERS: Linker[] = ["as well as", "along with", "together with", "in addition to"];
const SHOW_ME_PLACEHOLDERS = new Set(["{covered}", "{subject}", "{count}", "{answer}"]);
const MIN_SENTENCES = 50;
const SOLO_PER_NUMBER = 5;

const placeholders = (s: string) => (s.match(/\{[^}]*\}/g) ?? []).sort();

function flatten(copy: CoachCopy): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (v: unknown, path: string) => {
    if (typeof v === "string") out[path] = v;
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(copy, "");
  return out;
}

export function validatePack(pack: Pack): ValidationResult {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);

  // IDs
  const ids = [
    ...pack.subjects.map((x) => `subject:${x.id}`),
    ...pack.sidePhrases.map((x) => `side:${x.id}`),
    ...pack.verbs.map((x) => `verb:${x.id}`),
    ...pack.verbs.flatMap((v) => v.predicates.map((p) => `predicate:${p.id}`)),
  ];
  for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) err(`Duplicate ID ${id}`);

  // Word-list hygiene
  const clean = (where: string, t: string) => {
    if (/[{}]/.test(t)) err(`${where}: unfilled placeholder in "${t}"`);
    if (t !== t.trim() || /\s{2,}/.test(t)) err(`${where}: stray whitespace in "${t}"`);
  };
  for (const s of pack.subjects) {
    clean(`subject ${s.id}`, s.text);
    if (!/^[A-Z]/.test(s.text)) err(`subject ${s.id}: must start with a capital letter`);
  }
  for (const p of pack.sidePhrases) {
    clean(`side phrase ${p.id}`, p.text);
    if (!p.text.startsWith(`${p.linker} `)) err(`side phrase ${p.id}: must start with "${p.linker}"`);
  }
  for (const n of ["sg", "pl"] as const) {
    if (!pack.subjects.some((s) => s.number === n)) err(`No ${n} subjects`);
    for (const l of LINKERS)
      if (!pack.sidePhrases.some((p) => p.number === n && p.linker === l)) err(`No ${n} side phrase for "${l}"`);
  }
  for (const v of pack.verbs) {
    const forms = [v.sg, v.pl, ...v.distractors];
    for (const f of forms) clean(`verb ${v.id}`, f);
    if (new Set(forms.map((f) => f.toLowerCase())).size !== 4) err(`verb ${v.id}: options are not four distinct forms`);
    if (v.predicates.length === 0) err(`verb ${v.id}: no predicates`);
    for (const p of v.predicates) {
      clean(`predicate ${p.id}`, p.text);
      if (!p.text.endsWith(".")) err(`predicate ${p.id}: must end with a full stop`);
    }
  }

  // The whole question space, plus the lesson example
  const combos = allCombos(pack);
  const sentences = new Map<string, string>();
  const fixed = () => 0; // option order is irrelevant to these checks
  for (const c of [...combos, ...(pack.verbs.some((v) => v.id === pack.lessonExample.verbId) ? [lessonCombo(pack)] : [])]) {
    const q = buildQuestion(pack, c, fixed);
    const text = sentence(q);
    if (/[{}]/.test(text)) err(`${c.id}: unfilled placeholder`);
    const dup = sentences.get(text);
    if (dup) err(`${c.id} repeats the sentence of ${dup}`);
    sentences.set(text, c.id);
    if (q.options.length !== 4 || new Set(q.options).size !== 4) err(`${c.id}: needs four distinct options`);
    if (q.options.filter((o) => o === q.answer).length !== 1) err(`${c.id}: needs exactly one correct option`);
    if (q.answer !== c.verb[c.number]) err(`${c.id}: answer does not follow the rule`);
  }
  if (!pack.verbs.some((v) => v.id === pack.lessonExample.verbId)) err(`Lesson example uses unknown verb ${pack.lessonExample.verbId}`);

  const comboIds = new Set(combos.map((c) => c.id));
  for (const id of pack.tutorialIds) if (!comboIds.has(id)) err(`Tutorial question ${id} is not in the question space`);
  if (new Set(pack.tutorialIds).size !== pack.tutorialIds.length) err("Tutorial questions repeat");

  const pool = practicePool(pack);
  if (pool.length < MIN_SENTENCES) err(`Only ${pool.length} practice sentences; at least ${MIN_SENTENCES} required`);
  for (const n of ["sg", "pl"] as const) {
    const count = pool.filter((c) => c.number === n).length;
    // Two back-to-back solo runs must be able to use different questions.
    if (count < 2 * SOLO_PER_NUMBER) err(`Only ${count} ${n} practice sentences; ${2 * SOLO_PER_NUMBER} needed`);
  }

  // Coach copy: same keys and placeholders in every language; only the last Show me beat may state the answer
  const en = flatten(pack.coach.en);
  for (const lang of Object.keys(pack.coach) as (keyof Pack["coach"])[]) {
    const copy = flatten(pack.coach[lang]);
    for (const k of new Set([...Object.keys(en), ...Object.keys(copy)])) {
      if (!copy[k]?.trim()) err(`coach.${lang}.${k} is missing`);
      else if (en[k] !== undefined && placeholders(copy[k]).join() !== placeholders(en[k]).join())
        err(`coach.${lang}.${k}: placeholders differ from English`);
    }
    for (const [k, v] of Object.entries(copy)) {
      if (v.includes("{answer}") && k !== "showMe.2") err(`coach.${lang}.${k} must not state the answer`);
      for (const ph of placeholders(v)) if (!SHOW_ME_PLACEHOLDERS.has(ph)) err(`coach.${lang}.${k}: unknown placeholder ${ph}`);
    }
    // Go deeper steps must not hand over what the learner is being asked to find.
    for (const k of ["goDeeper.subject", "goDeeper.subjectHint"]) if (copy[k]?.includes("{subject}")) err(`coach.${lang}.${k} gives the subject away`);
    for (const k of ["goDeeper.count", "goDeeper.countHint"]) if (copy[k]?.includes("{count}")) err(`coach.${lang}.${k} gives the count away`);
    for (const n of ["sg", "pl"] as const) if (!pack.countWords[lang]?.[n]) err(`countWords.${lang}.${n} is missing`);
  }

  // Source
  for (const [k, v] of Object.entries(pack.source)) if (!v.trim()) err(`source.${k} is empty`);
  for (const k of ["portalUrl", "pdfUrl"] as const)
    if (!pack.source[k].startsWith("https://")) err(`source.${k} must be an https URL`);

  const releaseBlockers: string[] = [];
  if (pack.review.en.status !== "approved" || !pack.review.en.reviewer)
    releaseBlockers.push("English word lists, sentences and coach copy need a named reviewer's approval");

  return { errors, releaseBlockers };
}
