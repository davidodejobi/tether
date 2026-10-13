export type NumberTag = "sg" | "pl";
export type Lang = "en" | "pcm";
export type Linker = "as well as" | "along with" | "together with" | "in addition to";

export interface Verb {
  id: string;
  sg: string;
  pl: string;
  /** Forms that are never correct in the blank, whatever the subject's number. */
  distractors: [string, string];
  predicates: { id: string; text: string }[];
}

export interface CoachCopy {
  rule: string;
  explanation: string;
  nudge: string;
  /** Three beats. Placeholders: {covered} {subject} {count}; {answer} only in the third beat. */
  showMe: [string, string, string];
  goDeeper: {
    subject: string;
    subjectHint: string;
    count: string;
    countHint: string;
    verb: string;
    verbHint: string;
  };
  verify: string;
}

export interface Review {
  status: "pending" | "unreviewed" | "approved";
  reviewer?: string;
  date?: string;
}

export interface Pack {
  moveId: string;
  /** Bump when any list or copy changes; stored questions keep the version they were built with. */
  version: number;
  ruleId: string;
  title: string;
  source: {
    body: string;
    document: string;
    section: string;
    objective: string;
    examItem: string;
    pages: string;
    portalUrl: string;
    pdfUrl: string;
    pdfSha256: string;
    retrieved: string;
    method: string;
    /** What the learner sees. Names the syllabus topic, not the rule. */
    line: string;
  };
  review: Record<Lang, Review>;
  subjects: { id: string; text: string; number: NumberTag }[];
  /** A side phrase is only paired with subjects of the opposite number, so every question carries the trap. */
  sidePhrases: { id: string; text: string; number: NumberTag; linker: Linker }[];
  verbs: Verb[];
  /** The lesson's own example. It sits outside the question space so it never appears in practice or proof. */
  lessonExample: { subject: string; number: NumberTag; sidePhrase: string; verbId: string; predicate: string };
  /** Combination IDs used by the three tutorial questions; excluded from practice and proof. */
  tutorialIds: [string, string, string];
  countWords: Record<Lang, Record<NumberTag, string>>;
  coach: Record<Lang, CoachCopy>;
}
