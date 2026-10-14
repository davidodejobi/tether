// "Learn the move": a short, animated concept lesson before a move's first practice (one idea per card, Brilliant-style).
// Basics first (subject, verb, agreement), then the move: a contrasting pair, two worked examples, a "why" check that
// asks the learner to explain the answer, and one try. Nothing here is scored or saved. Every answer comes from the
// sentence's number, as in practice; src/content/learn.test.ts checks each sentence sits outside its move's questions.
// English only for now, and Unreviewed until a named reviewer signs docs/content/moves-2-5-review.md (Learn section).
import type { Part } from "./generate.ts";
import type { NumberTag, Review } from "./types.ts";

/** A sentence with one blank before its predicate. Parts use the same roles as questions; `number` decides the verb. */
export interface LessonSentence {
  parts: Part[];
  sg: string;
  pl: string;
  /** Two forms that never fit; the try card shows all four. */
  distractors: [string, string];
  number: NumberTag;
  predicate: string;
}
export const answerOf = (s: LessonSentence) => (s.number === "sg" ? s.sg : s.pl);

export type LessonCard =
  /** A key word and its meaning, shown on a sentence with the word's role highlighted. */
  | { kind: "define"; title: string; text: string; words: { text: string; mark?: "subject" | "verb" }[] }
  /** Shared: the -s hops from the verb to the noun ("The girl sings" → "The girls sing"). */
  | { kind: "agree" }
  /** Two sentences, one after the other, whose difference teaches the point. */
  | { kind: "pair"; title: string; text: string; first: LessonSentence; second: LessonSentence }
  /** One sentence played in three beats: cover, find the subject and count it, fill the verb. */
  | { kind: "worked"; title: string; sentence: LessonSentence; why: string }
  /** Explain it: pick the reason the answer is right. Wrong reasons say what trap they fell into. */
  | { kind: "why"; sentence: LessonSentence; question: string; options: { text: string; correct?: true; feedback: string }[] }
  /** The learner's turn: tap the subject, then pick the verb. Not scored. */
  | { kind: "try"; title: string; sentence: LessonSentence };

export interface Lesson {
  moveId: string;
  review: Review;
  /** One or two sentences on what this move is for. */
  intro: string;
  cards: LessonCard[];
}

const s = (text: string): Part => ({ text, role: "subject" });
const c = (text: string): Part => ({ text, role: "covered" });
const p = (text: string): Part => ({ text, role: "plain" });
const BE = { sg: "is", pl: "are", distractors: ["am", "be"] as [string, string] };
const HAVE = { sg: "has", pl: "have", distractors: ["having", "to have"] as [string, string] };
const UNREVIEWED: Review = { status: "unreviewed" };

/** Shared by every move: the words the moves are built on. */
export const BASICS: LessonCard[] = [
  {
    kind: "define",
    title: "The subject",
    text: "The subject is who or what the sentence is about.",
    words: [{ text: "The girl", mark: "subject" }, { text: "sings" }, { text: "in the choir." }],
  },
  {
    kind: "define",
    title: "The verb",
    text: "The verb tells what the subject does or is: sings, is, has, walks.",
    words: [{ text: "The girl" }, { text: "sings", mark: "verb" }, { text: "in the choir." }],
  },
  { kind: "agree" },
  {
    kind: "try",
    title: "Your turn: find the subject, then the verb",
    sentence: { parts: [s("The boys")], sg: "plays", pl: "play", distractors: ["playing", "to play"], number: "pl", predicate: "football every day." },
  },
];

export const lessons: Lesson[] = [
  {
    moveId: "strip-disguise",
    review: UNREVIEWED,
    intro: "Some sentences squeeze extra people in between the subject and the verb. This move teaches you to see past them.",
    cards: [
      {
        kind: "pair",
        title: "Extra people don't change the subject",
        text: "As well as, along with, together with and in addition to only add people. The subject is still Tunde: one person, so is.",
        first: { parts: [s("Tunde")], ...BE, number: "sg", predicate: "in the hall." },
        second: { parts: [s("Tunde,"), c("as well as his friends,")], ...BE, number: "sg", predicate: "in the hall." },
      },
      {
        kind: "worked",
        title: "Watch it once",
        sentence: { parts: [s("Chidi,"), c("as well as his friends,")], ...BE, number: "sg", predicate: "at the gate." },
        why: "Cover the side phrase. Chidi is one person, so is.",
      },
      {
        kind: "worked",
        title: "Now the other way round",
        sentence: { parts: [s("The girls,"), c("together with their mother,")], ...BE, number: "pl", predicate: "at the market." },
        why: "Cover the side phrase. The girls are more than one, so are.",
      },
      {
        kind: "why",
        sentence: { parts: [s("Amaka,"), c("along with her brothers,")], sg: "lives", pl: "live", distractors: ["living", "to live"], number: "sg", predicate: "near the school." },
        question: "Why is it lives, not live?",
        options: [
          { text: "The verb matches Amaka, one person. \"Along with her brothers\" is only a side phrase.", correct: true, feedback: "Yes. Cover the side phrase and only Amaka is left." },
          { text: "Because brothers is plural.", feedback: "Brothers is plural, but it sits in the side phrase. Cover it: the subject is Amaka." },
          { text: "Because lives sounds right.", feedback: "Sounding right can trick you. Check the subject: Amaka, one person." },
        ],
      },
      {
        kind: "try",
        title: "Your turn",
        sentence: { parts: [s("The boys,"), c("as well as their teacher,")], sg: "walks", pl: "walk", distractors: ["walking", "to walk"], number: "pl", predicate: "home together." },
      },
    ],
  },
  {
    moveId: "nearest-subject",
    review: UNREVIEWED,
    intro: "Sometimes two subjects share one verb, joined by either…or or neither…nor. Only one of them gets to choose the verb.",
    cards: [
      {
        kind: "pair",
        title: "The nearer subject decides",
        text: "Same two subjects, swapped. The verb follows whichever one is closer to it.",
        first: { parts: [c("Either the teacher or"), s("the students")], ...BE, number: "pl", predicate: "coming." },
        second: { parts: [c("Either the students or"), s("the teacher")], ...BE, number: "sg", predicate: "coming." },
      },
      {
        kind: "worked",
        title: "Watch it once",
        sentence: { parts: [c("Neither Chidi nor"), s("his friends")], ...BE, number: "pl", predicate: "at the gate." },
        why: "Cover the far part. The nearer subject is his friends, more than one, so are.",
      },
      {
        kind: "worked",
        title: "Now the other way round",
        sentence: { parts: [c("Either my sisters or"), s("my mother")], sg: "does", pl: "do", distractors: ["doing", "to do"], number: "sg", predicate: "the cooking on Sundays." },
        why: "Cover the far part. The nearer subject is my mother, one person, so does.",
      },
      {
        kind: "why",
        sentence: { parts: [c("Neither the coach nor"), s("the players")], ...BE, number: "pl", predicate: "happy." },
        question: "Why is it are, not is?",
        options: [
          { text: "The players are nearer the verb, and they are more than one.", correct: true, feedback: "Yes. The nearer subject chooses the verb." },
          { text: "Because the coach comes first.", feedback: "The first subject doesn't decide. Look at the one next to the blank." },
          { text: "Because neither always takes are.", feedback: "Neither…nor can take is or are. It depends on the nearer subject." },
        ],
      },
      {
        kind: "try",
        title: "Your turn",
        sentence: { parts: [c("Either the twins or"), s("Bola")], sg: "washes", pl: "wash", distractors: ["washing", "to wash"], number: "sg", predicate: "the plates." },
      },
    ],
  },
  {
    moveId: "collective-nouns",
    review: UNREVIEWED,
    intro: "A collective noun is one word for a whole group: team, choir, committee, crowd, flock.",
    cards: [
      {
        kind: "define",
        title: "Collective nouns",
        text: "A collective noun names a group as one thing. One team. One choir. One crowd.",
        words: [{ text: "The crowd", mark: "subject" }, { text: "is", mark: "verb" }, { text: "cheering loudly." }],
      },
      {
        kind: "pair",
        title: "One group, one verb",
        text: "Many fans, but still one crowd. Cover \"of fans\": the crowd is excited.",
        first: { parts: [s("The crowd")], ...BE, number: "sg", predicate: "excited." },
        second: { parts: [s("The crowd"), c("of fans")], ...BE, number: "sg", predicate: "excited." },
      },
      {
        kind: "worked",
        title: "Watch it once",
        sentence: { parts: [s("A bunch"), c("of keys")], ...BE, number: "sg", predicate: "on the table." },
        why: "Cover \"of keys\". A bunch is one group, so is.",
      },
      {
        kind: "worked",
        title: "When the group word is plural",
        sentence: { parts: [s("The two classes"), c("of pupils")], ...BE, number: "pl", predicate: "in the field." },
        why: "Cover \"of pupils\". The group word itself is plural, two classes, so are.",
      },
      {
        kind: "why",
        sentence: { parts: [s("The committee"), c("of seven teachers")], sg: "meets", pl: "meet", distractors: ["meeting", "to meet"], number: "sg", predicate: "every Monday." },
        question: "Why is it meets, not meet?",
        options: [
          { text: "The committee is one group, so the verb is singular.", correct: true, feedback: "Yes. However many people are in it, it is one committee." },
          { text: "Because teachers is plural, so meet.", feedback: "Teachers sits in the \"of\" phrase. Cover it: the committee is one group." },
          { text: "Because seven means more than one.", feedback: "Seven counts the teachers, not the committees. There is one committee." },
        ],
      },
      {
        kind: "try",
        title: "Your turn",
        sentence: { parts: [s("The flock"), c("of birds")], sg: "flies", pl: "fly", distractors: ["flying", "to fly"], number: "sg", predicate: "over the river." },
      },
    ],
  },
  {
    moveId: "indefinite-pronouns",
    review: UNREVIEWED,
    intro: "Words like each, everyone and nobody stand in for people without naming them. Some always mean one; some always mean more than one.",
    cards: [
      {
        kind: "define",
        title: "One at a time",
        text: "Each, every one, either, neither, everyone, everybody, no one and nobody look at people one at a time. They take the singular verb.",
        words: [{ text: "Everyone", mark: "subject" }, { text: "is", mark: "verb" }, { text: "here." }],
      },
      {
        kind: "define",
        title: "More than one",
        text: "Both, many, few and several always mean more than one. They take the plural verb.",
        words: [{ text: "Both", mark: "subject" }, { text: "are", mark: "verb" }, { text: "here." }],
      },
      {
        kind: "pair",
        title: "The \"of\" phrase doesn't change it",
        text: "\"Of the girls\" adds people, but each still means one at a time.",
        first: { parts: [s("Each girl")], ...HAVE, number: "sg", predicate: "a bag." },
        second: { parts: [s("Each"), c("of the girls")], ...HAVE, number: "sg", predicate: "a bag." },
      },
      {
        kind: "worked",
        title: "Watch it once",
        sentence: { parts: [s("Many"), c("of the boys")], sg: "plays", pl: "play", distractors: ["playing", "to play"], number: "pl", predicate: "football." },
        why: "Cover \"of the boys\". Many always means more than one, so play.",
      },
      {
        kind: "define",
        title: "None",
        text: "None with a word you can't count, like food, water or money, is singular.",
        words: [{ text: "None of the rice", mark: "subject" }, { text: "is", mark: "verb" }, { text: "left." }],
      },
      {
        kind: "why",
        sentence: { parts: [s("Neither"), c("of the twins")], ...BE, number: "sg", predicate: "ready yet." },
        question: "Why is it is, not are?",
        options: [
          { text: "Neither means not this one and not that one: one at a time, so is.", correct: true, feedback: "Yes. Neither looks at the twins one at a time." },
          { text: "Because twins is plural, so are.", feedback: "Twins sits in the \"of\" phrase. Cover it: neither means one at a time." },
          { text: "Because neither…nor rules apply.", feedback: "That's a different move. Here neither stands alone, so it is singular." },
        ],
      },
      {
        kind: "try",
        title: "Your turn",
        sentence: { parts: [s("Everybody"), c("in the village")], sg: "knows", pl: "know", distractors: ["knowing", "to know"], number: "sg", predicate: "the chief." },
      },
    ],
  },
  {
    moveId: "one-of-the",
    review: UNREVIEWED,
    intro: "\"One of the …\" sentences have a twist: sometimes the verb belongs to one, and sometimes to the group.",
    cards: [
      {
        kind: "pair",
        title: "One, or the group?",
        text: "In the first, the verb belongs to one. In the second, who points back to the girls, so the verb after who is plural.",
        first: { parts: [s("One"), c("of the girls")], ...BE, number: "sg", predicate: "late." },
        second: { parts: [c("Bola is one of"), s("the girls"), p("who")], ...BE, number: "pl", predicate: "late." },
      },
      {
        kind: "worked",
        title: "Watch it once",
        sentence: { parts: [c("Bola is one of"), s("the girls"), p("who")], ...BE, number: "pl", predicate: "in the choir." },
        why: "Who points back to the girls, more than one, so are.",
      },
      {
        kind: "worked",
        title: "Without who",
        sentence: { parts: [s("One"), c("of the books")], ...BE, number: "sg", predicate: "torn." },
        why: "Cover \"of the books\". The verb belongs to one, so is.",
      },
      {
        kind: "why",
        sentence: { parts: [c("Ada is one of"), s("the pupils"), p("who")], sg: "arrives", pl: "arrive", distractors: ["arriving", "to arrive"], number: "pl", predicate: "early." },
        question: "Why is it arrive, not arrives?",
        options: [
          { text: "Who points back to the pupils, more than one, so arrive.", correct: true, feedback: "Yes. The verb after who agrees with the group it points back to." },
          { text: "Because one is singular, so arrives.", feedback: "The verb comes after who, and who points back to the pupils, not to one." },
          { text: "Because Ada is one person, so arrives.", feedback: "Ada goes with \"is\". The blank belongs to who, which means the pupils." },
        ],
      },
      {
        kind: "try",
        title: "Your turn",
        sentence: { parts: [s("One"), c("of my friends")], sg: "lives", pl: "live", distractors: ["living", "to live"], number: "sg", predicate: "in Kano." },
      },
    ],
  },
];

export const lessonOf = (moveId: string) => lessons.find((l) => l.moveId === moveId);
