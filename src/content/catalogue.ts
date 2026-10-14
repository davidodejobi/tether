// The English destination, as far as it is verified (spec section 14b). Question counts appear only where the
// source quantifies a category; a topic or move never inherits one. Stage counts are Tether units, not exam weights.
import { stripDisguise } from "./strip-disguise.ts";

export const CATALOGUE_VERSION = 1;

export const source = {
  name: "JAMB UTME syllabus: Use of English (IBASS)",
  url: stripDisguise.source.pdfUrl,
  retrieved: "2026-10-14",
  version: "The PDF prints no exam year; the file is dated July 2025.",
  sha256: stripDisguise.source.pdfSha256,
};

export interface Stage { id: string; title: string; moveId: string }
export interface Topic { id: string; name: string; /** Only where the source quantifies this category. */ questions?: number; stages: Stage[] }
export interface Section { id: string; letter: string; name: string; questions: number; topics: Topic[] }

const soon = (id: string, name: string, questions?: number): Topic => ({ id, name, questions, stages: [] });

export const english = {
  id: "english",
  name: "English",
  sections: [
    {
      id: "comprehension-and-summary", letter: "A", name: "Comprehension and Summary", questions: 25,
      topics: [soon("comprehension-passage", "Comprehension passage", 5), soon("summary-passage", "Summary passage", 5), soon("cloze", "Cloze", 10), soon("reading-text", "Approved reading text", 5)],
    },
    {
      id: "lexis-and-structure", letter: "B", name: "Lexis and Structure", questions: 25,
      topics: [
        { id: "concord", name: "Concord", stages: [{ id: "strip-disguise", title: "Strip the Disguise", moveId: stripDisguise.moveId }] },
        soon("sentence-interpretation", "Sentence interpretation", 5),
        soon("antonyms", "Antonyms", 5),
        soon("synonyms", "Synonyms", 5),
        soon("other-grammar", "Other basic grammar topics"),
      ],
    },
    {
      id: "oral-forms", letter: "C", name: "Oral Forms", questions: 10,
      topics: [soon("vowels", "Vowels", 2), soon("consonants", "Consonants", 2), soon("rhymes", "Rhymes", 2), soon("word-stress", "Word stress", 2), soon("emphatic-stress", "Emphatic stress", 2)],
    },
  ] satisfies Section[],
};

export const stagesIn = (x: Section | Topic): number => ("topics" in x ? x.topics.reduce((n, t) => n + t.stages.length, 0) : x.stages.length);

/** "1 stage available · more Coming soon", or just "Coming soon" when nothing is available. */
export function availability(x: Section | Topic): string {
  const n = stagesIn(x);
  return n === 0 ? "Coming soon" : `${n} stage${n === 1 ? "" : "s"} available · more Coming soon`;
}

export const sectionById = (id?: string) => english.sections.find((s) => s.id === id);
export const topicById = (s: Section, id?: string) => s.topics.find((t) => t.id === id);
