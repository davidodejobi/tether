import type { Pack } from "./types.ts";

// Move 1: Strip the Disguise. Every line here is reviewed content (docs/content/move-1-review.md).
// The rule decides the answer: the verb matches the number of the subject before the side phrase.
export const stripDisguise = {
  moveId: "strip-disguise",
  version: 1,
  ruleId: "verb-matches-subject-before-side-phrase",
  title: "Strip the Disguise",
  source: {
    body: "Joint Admissions and Matriculation Board (JAMB)",
    document: "UTME syllabus: Use of English",
    section:
      "Section B: Lexis and Structure, (e) mood, tense, aspect, number, agreement/concord, degree (positive, comparative and superlative) and question tags",
    objective: "Candidates should be able to: iv. identify various grammatical patterns in use",
    examItem: "Section B (d) Basic Grammar: 10 questions",
    pages: "198–200",
    portalUrl: "https://ibass.jamb.gov.ng/",
    pdfUrl: "https://ibass.jamb.gov.ng/static/media/Use-of-English.885e843b1f51e6a3d062.pdf",
    pdfSha256: "f2b6bc4f2c30fc19ecf57bc14778100ce0deca59445beff9f7e10f34cbf7da18",
    retrieved: "2026-10-13",
    method: "Opened the PDF linked from JAMB's IBASS portal and read Section B.",
    line: "Topic: agreement/concord. JAMB UTME Use of English syllabus, Section B (Lexis and Structure).",
  },
  review: {
    en: { status: "pending" },
    pcm: { status: "unreviewed" },
  },
  subjects: [
    { id: "tunde", text: "Tunde", number: "sg" },
    { id: "amina", text: "Amina", number: "sg" },
    { id: "emeka", text: "Emeka", number: "sg" },
    { id: "ngozi", text: "Ngozi", number: "sg" },
    { id: "head-boy", text: "The head boy", number: "sg" },
    { id: "head-girl", text: "The head girl", number: "sg" },
    { id: "students", text: "The students", number: "pl" },
    { id: "prefects", text: "The prefects", number: "pl" },
    { id: "players", text: "The players", number: "pl" },
    { id: "twins", text: "The twins", number: "pl" },
    { id: "classmates", text: "My classmates", number: "pl" },
    { id: "new-pupils", text: "The new pupils", number: "pl" },
  ],
  sidePhrases: [
    // Plural side phrases, used with singular subjects.
    { id: "two-classmates", text: "as well as two classmates", number: "pl", linker: "as well as" },
    { id: "other-players", text: "as well as the other players", number: "pl", linker: "as well as" },
    { id: "three-friends", text: "along with three friends", number: "pl", linker: "along with" },
    { id: "the-new-pupils", text: "along with the new pupils", number: "pl", linker: "along with" },
    { id: "the-prefects", text: "together with the prefects", number: "pl", linker: "together with" },
    { id: "some-teachers", text: "together with some teachers", number: "pl", linker: "together with" },
    { id: "two-students", text: "in addition to two other students", number: "pl", linker: "in addition to" },
    { id: "class-captains", text: "in addition to the class captains", number: "pl", linker: "in addition to" },
    // Singular side phrases, used with plural subjects.
    { id: "their-teacher", text: "as well as their teacher", number: "sg", linker: "as well as" },
    { id: "class-captain", text: "as well as the class captain", number: "sg", linker: "as well as" },
    { id: "their-coach", text: "along with their coach", number: "sg", linker: "along with" },
    { id: "head-teacher", text: "along with the head teacher", number: "sg", linker: "along with" },
    { id: "form-teacher", text: "together with their form teacher", number: "sg", linker: "together with" },
    { id: "the-librarian", text: "together with the librarian", number: "sg", linker: "together with" },
    { id: "the-principal", text: "in addition to the principal", number: "sg", linker: "in addition to" },
    { id: "vice-principal", text: "in addition to the vice principal", number: "sg", linker: "in addition to" },
  ],
  verbs: [
    {
      id: "be",
      sg: "is",
      pl: "are",
      distractors: ["am", "be"],
      predicates: [
        { id: "in-hall", text: "in the hall." },
        { id: "at-gate", text: "waiting at the school gate." },
        { id: "ready-trip", text: "ready for the trip." },
      ],
    },
    {
      id: "have",
      sg: "has",
      pl: "have",
      distractors: ["having", "to have"],
      predicates: [
        { id: "finished-project", text: "finished the project." },
        { id: "seen-timetable", text: "seen the new timetable." },
      ],
    },
    { id: "walk", sg: "walks", pl: "walk", distractors: ["walking", "to walk"], predicates: [{ id: "walk-school", text: "to school every morning." }] },
    { id: "live", sg: "lives", pl: "live", distractors: ["living", "to live"], predicates: [{ id: "live-market", text: "near the market." }] },
    { id: "arrive", sg: "arrives", pl: "arrive", distractors: ["arriving", "to arrive"], predicates: [{ id: "arrive-early", text: "early on Mondays." }] },
    { id: "sit", sg: "sits", pl: "sit", distractors: ["sitting", "to sit"], predicates: [{ id: "sit-front", text: "in the front row." }] },
    { id: "eat", sg: "eats", pl: "eat", distractors: ["eating", "to eat"], predicates: [{ id: "eat-canteen", text: "lunch in the canteen." }] },
  ],
  lessonExample: {
    subject: "Chidi",
    number: "sg",
    sidePhrase: "as well as his friends",
    verbId: "be",
    predicate: "in the hall.",
  },
  tutorialIds: ["amina.two-classmates.in-hall", "students.their-teacher.at-gate", "head-boy.three-friends.walk-school"],
  countWords: {
    en: { sg: "one", pl: "more than one" },
    pcm: { sg: "one", pl: "plenty" },
  },
  coach: {
    en: {
      rule: "Cover the side phrase. Read what's left. Match the verb.",
      explanation:
        "As well as, along with, together with and in addition to only add extra people. They never change the subject. Cover that side phrase, read what's left, and match the verb to it.",
      nudge: "Cover the side phrase and read it again.",
      showMe: ["Cover the side phrase: {covered}.", "What's left: {subject}. That's {count}.", "{count} → {answer}."],
      goDeeper: {
        subject: "Tap the subject: who is the sentence really about?",
        subjectHint: "That's part of the side phrase. Cover it and look again.",
        count: "Is that one, or more than one?",
        countHint: "Count only the subject, not the side phrase.",
        verb: "Now pick the verb that matches.",
        verbHint: "Does that verb match {count}? Try again.",
      },
      verify: "Tap the part you covered.",
    },
    pcm: {
      rule: "Cover the side talk. Read wetin remain. Match the verb.",
      explanation:
        "As well as, along with, together with and in addition to just dey add extra people. Dem no dey change the subject. Cover that side talk, read wetin remain, then match the verb.",
      nudge: "Cover the side talk, read am again.",
      showMe: ["Cover the side talk: {covered}.", "Wetin remain: {subject}. Na {count}.", "{count} → {answer}."],
      goDeeper: {
        subject: "Tap the subject: na who the sentence dey really talk about?",
        subjectHint: "Na part of the side talk be that. Cover am, look again.",
        count: "Na one, or plenty?",
        countHint: "Count only the subject, no count the side talk.",
        verb: "Now pick the verb wey match.",
        verbHint: "That verb match {count}? Try again.",
      },
      verify: "Tap the part wey you cover.",
    },
  },
} satisfies Pack;
