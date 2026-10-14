// Pure helpers for the help ladder: beat text filling and Go deeper step checks (spec section 5).
import type { Question } from "../../content/generate.ts";
import { stripDisguise } from "../../content/strip-disguise.ts";
import type { Lang, Pack } from "../../content/types.ts";

export const pack: Pack = stripDisguise;

/**
 * Fills {covered} {subject} {count}. {answer} is filled only when `withAnswer` is true (Show me beat 3);
 * otherwise a stray {answer} stays as it is, so it can never leak early.
 */
export function fill(pack: Pick<Pack, "countWords">, text: string, q: Question, lang: Lang, withAnswer = false): string {
  return text
    .replaceAll("{covered}", q.covered)
    .replaceAll("{subject}", q.subject)
    .replaceAll("{count}", pack.countWords[lang][q.number])
    .replaceAll("{answer}", withAnswer ? q.answer : "{answer}");
}

export type Chip = { text: string; kind: "subject" | "side" | "other" };

/** The sentence as word chips around the blank (Go deeper step 1). The blank sits between `before` and `after`. */
export function chips(q: Question): { before: Chip[]; after: Chip[] } {
  const words = (s: string, kind: Chip["kind"]): Chip[] => s.split(" ").map((text) => ({ text, kind }));
  return {
    before: [...words(`${q.subject},`, "subject"), ...words(`${q.covered},`, "side")],
    after: words(q.predicate, "other"),
  };
}

export const countOk = (q: Question, choice: "one" | "many") => (choice === "one") === (q.number === "sg");
export const verbOk = (q: Question, word: string) => word === q.answer;
