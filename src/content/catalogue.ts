// The English destination, as far as it is verified (spec section 14b). Question counts appear only where the
// source quantifies a category; a topic or move never inherits one. Stage counts are Tether units, not exam weights.
import { positionInSection, stagesInSection, type SectionId } from "./blueprint.ts";
import { stripDisguise } from "./strip-disguise.ts";

export const CATALOGUE_VERSION = 1;

export const source = {
  name: "JAMB UTME syllabus: Use of English (IBASS)",
  url: stripDisguise.source.pdfUrl,
  retrieved: "2026-10-14",
  version: "The PDF prints no exam year; the file is dated July 2025.",
  sha256: stripDisguise.source.pdfSha256,
};

/** A planned stage; it is available only when `moveId` is set. `position` is its place in the section, `of` the section size. */
export interface Stage { n: number; id: string; title: string; moveId?: string; position: number; of: number }
export interface Topic { id: string; name: string; /** Only where the source quantifies this category. */ questions?: number; stages: Stage[] }
export interface Section { id: SectionId; letter: string; name: string; questions: number; topics: Topic[] }

/** Official categories that carry source question counts, by blueprint topic id. Tether teaching groups have none. */
const QUESTIONS: Record<string, number> = {
  "comprehension-passage": 5, "summary-passage": 5, cloze: 10, "reading-text": 5,
  "sentence-interpretation": 5, antonyms: 5, synonyms: 5,
  vowels: 2, consonants: 2, rhymes: 2, "word-stress": 2, "emphatic-stress": 2,
};

function topicsOf(section: SectionId): Topic[] {
  const topics: Topic[] = [];
  for (const b of stagesInSection(section)) {
    let t = topics.find((x) => x.id === b.topic);
    if (!t) topics.push((t = { id: b.topic, name: b.topicName, questions: QUESTIONS[b.topic], stages: [] }));
    t.stages.push({ n: b.n, id: b.id, title: b.title, moveId: b.moveId, position: positionInSection(b), of: stagesInSection(section).length });
  }
  return topics;
}

const section = (id: SectionId, letter: string, name: string, questions: number): Section => ({ id, letter, name, questions, topics: topicsOf(id) });

export const english = {
  id: "english",
  name: "English",
  sections: [
    section("comprehension-and-summary", "A", "Comprehension and Summary", 25),
    section("lexis-and-structure", "B", "Lexis and Structure", 25),
    section("oral-forms", "C", "Oral Forms", 10),
  ] satisfies Section[],
};

export const allStages = (x: Section | Topic | typeof english): Stage[] =>
  "sections" in x ? x.sections.flatMap(allStages) : "topics" in x ? x.topics.flatMap((t) => t.stages) : x.stages;

export const plannedIn = (x: Section | Topic): number => allStages(x).length;
export const availableIn = (x: Section | Topic): number => allStages(x).filter((s) => s.moveId).length;

export const sectionById = (id?: string) => english.sections.find((s) => s.id === id);
export const topicById = (s: Section, id?: string) => s.topics.find((t) => t.id === id);
