// Five-question practice rounds (spec section 5), derived from saved attempts so a reload never loses its place.
import type { PracticeAttempt } from "./practice.ts";
import { inOrder } from "./moment.ts";

export const ROUND_SIZE = 5;

const donePractice = (attempts: readonly PracticeAttempt[]) =>
  attempts.filter((a) => a.origin === "practice" && a.completedAt !== undefined).sort((x, y) => inOrder(x.completedAt!, y.completedAt!));

/** Completed practice questions in the current round (0 to 4); a full round starts the next one at 0. */
export const doneInRound = (attempts: readonly PracticeAttempt[]) => donePractice(attempts).length % ROUND_SIZE;

/** The five questions of the round that just finished, in order. */
export const lastRound = (attempts: readonly PracticeAttempt[]) => donePractice(attempts).slice(-ROUND_SIZE);

/** Right on the first check. */
export const firstTry = (a: PracticeAttempt) => a.correctOnCheck === 1;
