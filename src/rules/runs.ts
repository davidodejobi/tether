// Solo checks and rechecks: deadlines, submissions, absences, timeouts and conversion to practice (spec section 7).
import type { Moment } from "./moment.ts";
import type { PracticeAttempt } from "./practice.ts";

export type RunKind = "solo" | "recheck";
export type RunStatus = "active" | "completed" | "converted" | "exited";

export interface Run {
  id: string;
  kind: RunKind;
  /** Rechecks only: fixed at entry. A recovery recheck runs while proof is Fading. */
  purpose?: "scheduled" | "recovery";
  questionIds: string[];
  /** One entry per submitted question, in order; no backtracking. */
  submissions: { questionId: string; correct: boolean; at: Moment }[];
  /** Run start; `started.at` is also when dots reset. */
  started: Moment;
  deadline: number;
  /** Latest wall-clock time the run was known to be visible. Never moves backwards. */
  lastSeenAt: number;
  status: RunStatus;
  endedAt?: number;
  result?: { score: number; total: number; passed: boolean; timedOut: boolean };
  /** Solo only: the "with help" score at entry, or null if fewer than ten practice questions existed. */
  practiceSnapshot?: number | null;
  /** Recheck only: the schedule entries due at entry. Crossing midnight does not change them. */
  coveredEntryIds?: string[];
}

export const RUN_RULES = {
  solo: { questions: 10, minutes: 10, pass: 8 },
  recheck: { questions: 5, minutes: 5, pass: 4 },
} as const;
export const ABSENCE_LIMIT_MS = 10_000;
export const LOW_TIME_MS = 20_000;

export function startRun(
  r: Pick<Run, "id" | "kind" | "purpose" | "questionIds" | "practiceSnapshot" | "coveredEntryIds">,
  now: Moment,
): Run {
  const rules = RUN_RULES[r.kind];
  if (r.questionIds.length !== rules.questions) throw new Error(`A ${r.kind} run has ${rules.questions} questions`);
  return { ...r, submissions: [], started: now, deadline: now.at + rules.minutes * 60_000, lastSeenAt: now.at, status: "active" };
}

/**
 * The device clock is earlier than evidence already saved for this run, so the remaining time cannot be
 * trusted. The run must convert to practice (spec section 7).
 */
export const clockWentBack = (run: Run, now: number) => now < run.lastSeenAt || now < run.started.at;

export const lowTime = (run: Run, now: number) => run.status === "active" && run.deadline - now <= LOW_TIME_MS;

/**
 * Submits the answer to the next question. Ignored if the run is over, the question is not next, or the
 * clock went back (the caller converts the run).
 */
export function submit(run: Run, questionId: string, correct: boolean, now: Moment): Run {
  if (run.status !== "active" || now.at >= run.deadline || clockWentBack(run, now.at)) return run;
  if (run.questionIds[run.submissions.length] !== questionId) return run;
  const next = { ...run, submissions: [...run.submissions, { questionId, correct, at: now }], lastSeenAt: now.at };
  return next.submissions.length === run.questionIds.length ? finish(next, now.at) : next;
}

/** Scores the run. Unsubmitted questions count as wrong, and a timed-out run ends at its deadline, not when it was noticed. */
export function finish(run: Run, now: number): Run {
  if (run.status !== "active") return run;
  const rules = RUN_RULES[run.kind];
  const score = run.submissions.filter((s) => s.correct).length;
  const timedOut = run.submissions.length < run.questionIds.length;
  return {
    ...run,
    status: "completed",
    endedAt: timedOut ? Math.min(now, run.deadline) : now,
    result: { score, total: rules.questions, passed: score >= rules.pass, timedOut },
  };
}

/** Marks the run as visible now (called while the learner is on the run screen). Earlier times never overwrite later evidence. */
export const seen = (run: Run, now: number): Run =>
  run.status === "active" && now > run.lastSeenAt ? { ...run, lastSeenAt: now } : run;

/**
 * What happens when the learner comes back, after hiding the page or reopening the app.
 * `hiddenSince` is when the page was hidden, or `run.lastSeenAt` on reopen; null when unknown. Unknown
 * absences, absences of ten seconds or more, and clocks that went backwards (against the hide time or any
 * saved evidence) convert to practice, even if the deadline passed while away.
 */
export function onReturn(run: Run, now: number, hiddenSince: number | null): "continue" | "timeout" | "convert" {
  if (run.status !== "active") return "continue";
  if (hiddenSince === null || now < hiddenSince || hiddenSince < run.lastSeenAt || clockWentBack(run, now)) return "convert";
  if (now - hiddenSince >= ABSENCE_LIMIT_MS) return "convert";
  return now >= run.deadline ? "timeout" : "continue";
}

/**
 * Leave (explicit exit) or a long absence. Recorded once: submitted answers become completed practice
 * attempts with their one-check correctness; the unsubmitted questions continue as ordinary practice.
 */
export function convert(
  run: Run,
  now: number,
  status: "converted" | "exited",
): { run: Run; attempts: PracticeAttempt[]; unsubmitted: string[] } {
  if (run.status !== "active") return { run, attempts: [], unsubmitted: [] };
  const attempts = run.submissions.map(
    (s, i): PracticeAttempt => ({
      id: `${run.id}:${i}`,
      questionId: s.questionId,
      origin: "converted",
      startedAt: s.at,
      completedAt: s.at,
      checks: 1,
      correctOnCheck: s.correct ? 1 : undefined,
      help: [],
      resets: [],
      freeLook: false,
      moveSheetOpened: false,
    }),
  );
  return {
    run: { ...run, status, endedAt: now },
    attempts,
    unsubmitted: run.questionIds.slice(run.submissions.length),
  };
}
