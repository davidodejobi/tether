// Pure core of POST /api/explain (spec section 5a): request validation, prompt builder, output checker.
// No network, no SDK, no storage. Shared by functions/api/explain.ts, tools/ai-sample.ts and the unit tests.
import { stripDisguise } from "../src/content/strip-disguise.ts";
import type { Pack } from "../src/content/types.ts";

export type Style = "plain" | "analogy";
export interface ExplainRequest {
  moveId: string;
  contentVersion: number;
  style: Style;
}
export type Failure = "bad_request" | "rate" | "invalid" | "timeout" | "unavailable";
export type ExplainResponse = { ok: true; text: string } | { ok: false; reason: Failure };

export const MAX_WORDS = 90;
export const MAX_SENTENCES = 3;

const pack: Pack = stripDisguise;

/** Exactly { moveId, contentVersion, style }, nothing else, and only an approved pack version. */
export function parseRequest(body: unknown, p: Pack = pack): ExplainRequest | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const keys = Object.keys(body).sort().join(",");
  if (keys !== "contentVersion,moveId,style") return null;
  const { moveId, contentVersion, style } = body as Record<string, unknown>;
  if (style !== "plain" && style !== "analogy") return null;
  if (moveId !== p.moveId || contentVersion !== p.version) return null;
  if (p.review.en.status !== "approved") return null;
  return { moveId: p.moveId, contentVersion: p.version, style };
}

/** The prompt carries only the reviewed rule text. Never the learner's sentence, options or answer. */
export function buildPrompt(style: Style, p: Pack = pack): { system: string; user: string } {
  const c = p.coach.en;
  const system = [
    "You help a Nigerian secondary-school student preparing for the JAMB English exam.",
    `Explain one grammar move, "${p.title}", in another way. Use only this reviewed rule and nothing else.`,
    `Rule: ${c.rule}`,
    `Reviewed explanation: ${c.explanation}`,
    "Constraints:",
    `- Plain text only, at most ${MAX_SENTENCES} sentences and ${MAX_WORDS} words. No lists, headings, markdown or quotation of exam questions.`,
    "- Simple English. Explain the general idea, never a specific exam question.",
    "- Do not add grammar rules that are not in the reviewed rule.",
    "- Never give or choose an answer, never name a correct option, never grade or judge the student's work, and never tell the student which verb to pick.",
  ].join("\n");
  const user = style === "plain" ? "Explain the rule in plain, simple words." : "Explain the rule with one short everyday analogy.";
  return { system, user };
}

const verbWords = (p: Pack) => [...new Set(p.verbs.flatMap((v) => [v.sg, v.pl, ...v.distractors]))];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Returns null when the text is acceptable, otherwise a short internal reason (never shown to the learner). */
export function checkOutput(text: unknown, p: Pack = pack): string | null {
  if (typeof text !== "string") return "not text";
  const t = text.trim();
  if (!t) return "empty";
  if (/[*#`_<>|]|^\s*[-•\d]+[.)]?\s/m.test(t) || /\n/.test(t)) return "not plain text";
  const sentences = t.split(/[.!?]+(?:\s+|$)/).filter((s) => s.trim());
  if (sentences.length > MAX_SENTENCES) return "too many sentences";
  if (t.split(/\s+/).length > MAX_WORDS) return "too many words";
  const verbs = verbWords(p).map(esc).join("|");
  const instruction = new RegExp(`\\b(?:use|pick|choose|select|write|put|type|go with|tick|circle)\\s+(?:the\\s+|a\\s+)?(?:verb\\s+|word\\s+)?["'‘“]?(?:${verbs})\\b`, "i");
  if (instruction.test(t)) return "instructs a verb";
  if (/\b(the answer is|answer is|correct (?:option|answer|choice)|right (?:option|answer|choice)|choose|you (?:should|must|need to) (?:pick|choose|select)|you are (?:right|wrong|correct)|well done|you got)\b/i.test(t)) return "answer-giving or grading";
  return null;
}
