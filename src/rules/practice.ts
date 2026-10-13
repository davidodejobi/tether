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
  /** When the first miss or help happened: dots reset at that moment, not when the question started. */
  helpAt?: number;
  /** A Show me after a correct answer. Changes neither score nor dots. */
  freeLook: boolean;
  /** The move sheet was opened. Not answer help; recorded for measurement. */
  moveSheetOpened: boolean;
  reason?: Reason;
  reasonAt?: number;
  /** Decided once when "I used the move" is claimed; a reload cannot reroll it. */
  verifySampled?: boolean;
  verifyResult?: "passed" | "failed";
  verifiedAt?: number;
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
  return { ...a, checks, help: a.help.includes("nudge") ? a.help : [...a.help, "nudge"], helpAt: a.helpAt ?? now };
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
export function useHelp(a: PracticeAttempt, kind: Exclude<AnswerHelp, "nudge">, now: number): PracticeAttempt {
  if (!open(a)) return kind === "showMe" ? { ...a, freeLook: true } : a;
  return { ...a, help: [...a.help, kind], helpAt: a.helpAt ?? now };
}

export function openMoveSheet(a: PracticeAttempt): PracticeAttempt {
  return a.moveSheetOpened ? a : { ...a, moveSheetOpened: true };
}

/** Unaided correct on the first check: the learner is asked How did you know. */
export function asksReason(a: PracticeAttempt): boolean {
  return a.origin === "practice" && a.correctOnCheck === 1 && a.help.length === 0;
}

/** Records the reason once. A move claim is sampled for verification once, here. */
export function giveReason(a: PracticeAttempt, reason: Reason, rng: () => number, now: number): PracticeAttempt {
  if (!asksReason(a) || a.reason) return a;
  const given = { ...a, reason, reasonAt: now };
  return reason === "move" ? { ...given, verifySampled: rng() < VERIFY_PROBABILITY } : given;
}

export function verify(a: PracticeAttempt, tappedCovered: boolean, now: number): PracticeAttempt {
  if (a.reason !== "move" || !a.verifySampled || a.verifyResult) return a;
  return { ...a, verifyResult: tappedCovered ? "passed" : "failed", verifiedAt: now };
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
 * (including runs later converted or exited). Effects apply when they happened: a miss on a resumed
 * question, or a verification finished later, counts at that moment. Dots recommend; they never gate a run.
 */
export function readiness(attempts: readonly PracticeAttempt[], runStarts: readonly number[]) {
  type Effect = "run" | "reset" | "claim" | "dot" | "honest";
  const events: { at: number; effect: Effect }[] = runStarts.map((at) => ({ at, effect: "run" }));
  for (const a of attempts) {
    if (a.origin !== "practice") continue;
    if (a.helpAt !== undefined) events.push({ at: a.helpAt, effect: "reset" });
    else if (a.reason === "move" && a.reasonAt !== undefined) {
      events.push({ at: a.reasonAt, effect: "claim" });
      if (!a.verifySampled) events.push({ at: a.reasonAt, effect: "dot" });
      else if (a.verifyResult === "passed" && a.verifiedAt !== undefined) events.push({ at: a.verifiedAt, effect: "dot" });
    } else if (a.reason && a.reasonAt !== undefined) events.push({ at: a.reasonAt, effect: "honest" });
  }
  events.sort((x, y) => x.at - y.at);

  let dots = 0;
  let honestStreak = 0;
  let offerMove = false;
  for (const { effect } of events) {
    offerMove = false;
    if (effect === "run") dots = 0; // a genuine solo or recheck begins
    else if (effect === "reset") {
      dots = 0;
      honestStreak = 0;
    } else if (effect === "claim") honestStreak = 0;
    else if (effect === "dot") dots = Math.min(MAX_DOTS, dots + 1);
    else {
      honestStreak += 1;
      offerMove = honestStreak === HONEST_RESPONSES_BEFORE_HINT;
    }
  }
  return { dots, ready: dots === MAX_DOTS, offerMove };
}
