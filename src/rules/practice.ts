// Practice attempts, the "with help" score, readiness dots and the move hint (spec sections 5, 5a and 6).
// Pure functions over plain records: callers pass the time and randomness.

export type AnswerHelp = "nudge" | "showMe" | "goDeeper" | "ai";
export type Reason = "move" | "sounded" | "guessed";
export type Origin = "practice" | "tutorial" | "converted";

export interface PracticeAttempt {
  id: string;
  questionId: string;
  origin: Origin;
  startedAt: number;
  /** Set when the question is finished; unfinished questions never enter the score window. */
  completedAt?: number;
  /** Checked answers so far. Selecting or changing a tile is not a check. */
  checks: number;
  /** 1-based check that was correct. */
  correctOnCheck?: number;
  /** Answer help used before the correct check, in order. A miss adds "nudge". */
  help: AnswerHelp[];
  /** A Show me after a correct answer. Changes neither score nor dots. */
  freeLook: boolean;
  /** The move sheet was opened. Not answer help; recorded for measurement. */
  moveSheetOpened: boolean;
  reason?: Reason;
  /** Decided once when "I used the move" is claimed; a reload cannot reroll it. */
  verifySampled?: boolean;
  verifyResult?: "passed" | "failed";
}

export const VERIFY_PROBABILITY = 1 / 3;
export const PRACTICE_WINDOW = 10;
export const MAX_DOTS = 3;
const HONEST_RESPONSES_BEFORE_HINT = 3;

export function startAttempt(id: string, questionId: string, origin: Origin, now: number): PracticeAttempt {
  return { id, questionId, origin, startedAt: now, checks: 0, help: [], freeLook: false, moveSheetOpened: false };
}

const open = (a: PracticeAttempt) => a.completedAt === undefined;

/** A checked answer. A miss marks help (the nudge); a correct answer finishes the question. */
export function check(a: PracticeAttempt, correct: boolean, now: number): PracticeAttempt {
  if (!open(a)) return a;
  const checks = a.checks + 1;
  if (correct) return { ...a, checks, correctOnCheck: checks, completedAt: now };
  return { ...a, checks, help: a.help.includes("nudge") ? a.help : [...a.help, "nudge"] };
}

/** What the help ladder does after this many misses on one question. */
export function afterMisses(misses: number): "retry" | "nudge" | "offerShowMe" | "goDeeper" {
  return misses <= 0 ? "retry" : misses === 1 ? "nudge" : misses === 2 ? "offerShowMe" : "goDeeper";
}

/**
 * Voluntary answer help: Show me, Go deeper or an accepted AI explanation. Only counts while the question
 * is open; after a correct answer a Show me is a free look instead. Failed or cancelled AI requests are
 * never passed here.
 */
export function useHelp(a: PracticeAttempt, kind: Exclude<AnswerHelp, "nudge">): PracticeAttempt {
  if (!open(a)) return kind === "showMe" ? { ...a, freeLook: true } : a;
  return { ...a, help: [...a.help, kind] };
}

export function openMoveSheet(a: PracticeAttempt): PracticeAttempt {
  return a.moveSheetOpened ? a : { ...a, moveSheetOpened: true };
}

/** Unaided correct on the first check: the learner is asked How did you know. */
export function asksReason(a: PracticeAttempt): boolean {
  return a.origin === "practice" && a.correctOnCheck === 1 && a.help.length === 0;
}

/** Records the reason once. A move claim is sampled for verification once, here. */
export function giveReason(a: PracticeAttempt, reason: Reason, rng: () => number): PracticeAttempt {
  if (!asksReason(a) || a.reason) return a;
  return reason === "move" ? { ...a, reason, verifySampled: rng() < VERIFY_PROBABILITY } : { ...a, reason };
}

export function verify(a: PracticeAttempt, tappedCovered: boolean): PracticeAttempt {
  if (a.reason !== "move" || !a.verifySampled || a.verifyResult) return a;
  return { ...a, verifyResult: tappedCovered ? "passed" : "failed" };
}

/**
 * One point for a correct answer on the first or second check with no Show me, Go deeper or AI before it.
 * Tutorial questions never score.
 */
export function point(a: PracticeAttempt): 0 | 1 {
  if (a.origin === "tutorial" || a.completedAt === undefined || a.correctOnCheck === undefined) return 0;
  return a.correctOnCheck <= 2 && a.help.every((h) => h === "nudge") ? 1 : 0;
}

/** "With help": points in the latest ten completed practice questions, or null if there are fewer than ten. */
export function practiceScore(attempts: readonly PracticeAttempt[]): number | null {
  const done = attempts
    .filter((a) => a.origin !== "tutorial" && a.completedAt !== undefined)
    .sort((x, y) => x.completedAt! - y.completedAt!);
  if (done.length < PRACTICE_WINDOW) return null;
  return done.slice(-PRACTICE_WINDOW).reduce((sum, a) => sum + point(a), 0);
}

/**
 * Readiness dots from the practice timeline and the start times of every solo or recheck run
 * (including runs later converted or exited). Dots recommend; they never gate a run.
 */
export function readiness(attempts: readonly PracticeAttempt[], runStarts: readonly number[]) {
  type Event = { at: number; attempt?: PracticeAttempt };
  const events: Event[] = [
    ...attempts.filter((a) => a.origin === "practice").map((attempt) => ({ at: attempt.startedAt, attempt })),
    ...runStarts.map((at) => ({ at })),
  ].sort((x, y) => x.at - y.at);

  let dots = 0;
  let honestStreak = 0;
  let offerMove = false;
  for (const { attempt: a } of events) {
    offerMove = false;
    if (!a) {
      dots = 0; // a genuine solo or recheck begins
      continue;
    }
    if (a.help.length > 0) {
      dots = 0; // miss, nudge, voluntary help or accepted AI before correct
      honestStreak = 0;
    } else if (a.reason === "move") {
      honestStreak = 0;
      if (!a.verifySampled || a.verifyResult === "passed") dots = Math.min(MAX_DOTS, dots + 1);
    } else if (a.reason === "sounded" || a.reason === "guessed") {
      honestStreak += 1;
      offerMove = honestStreak === HONEST_RESPONSES_BEFORE_HINT;
    }
  }
  return { dots, ready: dots === MAX_DOTS, offerMove };
}
