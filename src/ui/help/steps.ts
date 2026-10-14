// Pure helpers for the help ladder: beat text filling and Go deeper step checks (spec section 5).
import { partsOf, type Move, type Question } from "../../content/generate.ts";
import type { Lang } from "../../content/types.ts";

/**
 * Fills {covered} {subject} {count}. {answer} is filled only when `withAnswer` is true (Show me beat 3);
 * otherwise a stray {answer} stays as it is, so it can never leak early.
 */
export function fill(move: Pick<Move, "countWords">, text: string, q: Question, lang: Lang, withAnswer = false): string {
  return text
    .replaceAll("{covered}", q.covered)
    .replaceAll("{subject}", q.subject)
    .replaceAll("{count}", move.countWords[lang][q.number])
    .replaceAll("{answer}", withAnswer ? q.answer : "{answer}");
}

export type Chip = { text: string; kind: "subject" | "side" | "other" };

/** The sentence as word chips around the blank (Go deeper step 1). The blank sits between `before` and `after`. */
export function chips(q: Question): { before: Chip[]; after: Chip[] } {
  const words = (s: string, kind: Chip["kind"]): Chip[] => s.split(" ").map((text) => ({ text, kind }));
  const kind = { subject: "subject", covered: "side", plain: "other" } as const;
  return {
    before: partsOf(q).flatMap((p) => words(p.text, kind[p.role])),
    after: words(q.predicate, "other"),
  };
}

export const countOk = (q: Question, choice: "one" | "many") => (choice === "one") === (q.number === "sg");
export const verbOk = (q: Question, word: string) => word === q.answer;
