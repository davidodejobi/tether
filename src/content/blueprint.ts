// The approved English stage blueprint (owner approval, 14 October 2026; course-journey.md "Counts, destinations").
// One stage is one move: a teachable technique with its own reviewed pack, lesson, practice, solo proof and rechecks.
// Order is the recommended journey. Only stages with a `moveId` are available; the rest are planned and Coming soon.
// Planned stages carry an approved identity and scope only; they never show progress, proof or assessment controls.

export const BLUEPRINT_VERSION = 1;
export const BLUEPRINT_APPROVED = "2026-10-14";

export type SectionId = "lexis-and-structure" | "comprehension-and-summary" | "oral-forms";

export interface PlannedStage {
  /** 1-based position in the whole English journey. */
  n: number;
  id: string;
  title: string;
  section: SectionId;
  /** Tether teaching group inside the official section (not an official JAMB category name unless it matches one). */
  topic: string;
  topicName: string;
  /** Present only once a reviewed pack exists: the stage is then available. */
  moveId?: string;
}

const B = "lexis-and-structure", A = "comprehension-and-summary", C = "oral-forms";

const rows: [string, string, SectionId, string, string, string?][] = [
  // B. Lexis and Structure
  ["strip-disguise", "Strip the Disguise", B, "concord", "Concord", "strip-disguise"],
  ["nearest-subject", "Either…or, neither…nor: the nearest subject", B, "concord", "Concord", "nearest-subject"],
  ["collective-nouns", "Collective nouns", B, "concord", "Concord", "collective-nouns"],
  ["indefinite-pronouns", "Each, everyone, none", B, "concord", "Concord", "indefinite-pronouns"],
  ["one-of-the", "One of the … who/that", B, "concord", "Concord", "one-of-the"],
  ["plural-looking-singulars", "Plural-looking singulars", B, "concord", "Concord"],
  ["there-is-there-are", "There is, there are", B, "concord", "Concord"],
  ["a-number-the-number", "A number of, the number of", B, "concord", "Concord"],
  ["sequence-of-tenses", "Sequence of tenses", B, "tense-and-mood", "Tense and mood"],
  ["perfect-vs-past", "Perfect or simple past", B, "tense-and-mood", "Tense and mood"],
  ["conditionals", "Conditionals", B, "tense-and-mood", "Tense and mood"],
  ["reported-speech", "Reported speech", B, "tense-and-mood", "Tense and mood"],
  ["subjunctive", "If I were, I wish", B, "tense-and-mood", "Tense and mood"],
  ["question-tags", "Positive and negative tags", B, "question-tags", "Question tags"],
  ["special-tags", "Special tags", B, "question-tags", "Question tags"],
  ["comparison", "Comparatives and superlatives", B, "degree", "Degree"],
  ["word-class-in-context", "Word class in context", B, "word-classes", "Word classes and functions"],
  ["pronoun-case", "Between you and me", B, "word-classes", "Word classes and functions"],
  ["prepositions", "Prepositions after verbs and adjectives", B, "word-classes", "Word classes and functions"],
  ["adjective-or-adverb", "Adjective or adverb", B, "word-classes", "Word classes and functions"],
  ["clause-types", "Clause types", B, "clause-patterns", "Clause and sentence patterns"],
  ["sentence-types", "Sentence types", B, "clause-patterns", "Clause and sentence patterns"],
  ["spelling", "Commonly misspelt words", B, "mechanics", "Mechanics"],
  ["punctuation", "Punctuation", B, "mechanics", "Mechanics"],
  ["synonyms-in-context", "Synonyms in context", B, "synonyms", "Synonyms"],
  ["synonyms-verbs-nouns", "Synonyms: verbs and nouns", B, "synonyms", "Synonyms"],
  ["idiomatic-synonyms", "Idiomatic synonyms", B, "synonyms", "Synonyms"],
  ["antonyms-in-context", "Antonyms in context", B, "antonyms", "Antonyms"],
  ["antonym-prefix-traps", "Antonyms: prefix traps", B, "antonyms", "Antonyms"],
  ["common-idioms", "Common idioms", B, "idioms", "Idioms and figurative usage"],
  ["figures-of-speech", "Figures of speech", B, "idioms", "Idioms and figurative usage"],
  ["interpret-plain", "Interpreting plain sentences", B, "sentence-interpretation", "Sentence interpretation"],
  ["interpret-idiomatic", "Interpreting idiomatic sentences", B, "sentence-interpretation", "Sentence interpretation"],
  // A. Comprehension and Summary
  ["main-idea", "Main idea", A, "comprehension-passage", "Comprehension passage"],
  ["inference", "Inference", A, "comprehension-passage", "Comprehension passage"],
  ["meaning-in-context", "Word meaning in context", A, "comprehension-passage", "Comprehension passage"],
  ["writers-tone", "The writer's tone", A, "comprehension-passage", "Comprehension passage"],
  ["topic-sentences", "Topic sentences", A, "summary-passage", "Summary passage"],
  ["summarising", "Summarising", A, "summary-passage", "Summary passage"],
  ["cloze-grammar", "Cloze: grammar clues", A, "cloze", "Cloze"],
  ["cloze-vocabulary", "Cloze: vocabulary clues", A, "cloze", "Cloze"],
  ["reading-text", "Set text: plot, characters and themes", A, "reading-text", "Approved reading text"],
  // C. Oral Forms
  ["pure-vowels", "Pure vowels", C, "vowels", "Vowels"],
  ["diphthongs", "Diphthongs and triphthongs", C, "vowels", "Vowels"],
  ["consonant-sounds", "Consonant sounds", C, "consonants", "Consonants"],
  ["clusters-silent-letters", "Clusters and silent letters", C, "consonants", "Consonants"],
  ["rhymes-homophones", "Rhymes and homophones", C, "rhymes", "Rhymes"],
  ["stress-two-syllables", "Stress in two-syllable words", C, "word-stress", "Word stress"],
  ["stress-longer-words", "Stress in longer words", C, "word-stress", "Word stress"],
  ["emphatic-stress", "Emphatic stress", C, "emphatic-stress", "Emphatic stress"],
];

export const blueprint: readonly PlannedStage[] = rows.map(([id, title, section, topic, topicName, moveId], i) => ({ n: i + 1, id, title, section, topic, topicName, moveId }));

export const plannedTotal = blueprint.length;
export const availableStages = blueprint.filter((s) => s.moveId);
export const stagesInSection = (section: SectionId) => blueprint.filter((s) => s.section === section);
/** "Stage n of N" within a section. */
export const positionInSection = (s: PlannedStage) => stagesInSection(s.section).indexOf(s) + 1;
