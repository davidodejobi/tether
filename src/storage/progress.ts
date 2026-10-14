// Learner progress on this device (spec sections 2 and 13). The rules decide; this module saves their
// results atomically and restores them on reopen.
import { endSession, touch, type Session } from "../rules/session.ts";
import type { Question } from "../content/generate.ts";
import { inOrder, nextMoment, type Moment } from "../rules/moment.ts";
import { asksReason, type PracticeAttempt } from "../rules/practice.ts";
import { applyRun, type ProofCycle } from "../rules/proof.ts";
import { convert, finish, onReturn, type Run } from "../rules/runs.ts";
import type { KV, Opened } from "./kv.ts";

export const SCHEMA_VERSION = 1;
const NICKNAME_MAX = 30;
/** Blobatar 2 draws one frozen generation; a seed saved for another is not drawn (initials show). */
export const AVATAR_GEN = 2;

const newSeed = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");

export interface Learner {
  nickname: string;
  lessonDone: boolean;
  onboarded: boolean;
  coach: "character" | "text";
  lang: "en" | "pcm";
  readAloud: boolean;
  partner: { name?: string; phone?: string } | null;
  /** The honesty rule was shown once in regular practice (spec section 4). Absent on older records, so no migration. */
  honestyIntroSeen?: boolean;
  /** Interaction sounds (spec section 14a). Absent on older records, read as off. */
  sounds?: boolean;
  /** Random avatar identity, independent of nickname, phone, email or device. Absent on older records until the first successful save backfills it. */
  avatarSeed?: string;
  /** Blobatar generation the seed was made for; an unsupported one shows initials instead. */
  avatarGen?: number;
  schemaVersion: number;
}

/** Records keep the exact question shown (options in their shuffled order, content version), so a reopen or a content update never changes it. */
export interface SavedAttempt {
  attempt: PracticeAttempt;
  question: Question;
  /** Options already checked as wrong, so a reload keeps them struck out. */
  struck?: string[];
}
export interface SavedRun {
  run: Run;
  questions: Question[];
}

export interface Progress {
  learner: Learner | null;
  attempts: Map<string, SavedAttempt>;
  runs: Map<string, SavedRun>;
  /** Proof cycles by move ID. */
  cycles: Map<string, ProofCycle>;
}

/** Everything that must be saved together, such as a checked answer and its effects. */
export interface Batch {
  learner?: Learner;
  attempts?: SavedAttempt[];
  runs?: SavedRun[];
  cycles?: ProofCycle[];
}

export type ReadOnlyReason = "newerSchema" | "otherTab";

export class StorageError extends Error {
  constructor(
    readonly reason: "failed" | "busy" | "timedOut" | ReadOnlyReason,
    cause?: unknown,
  ) {
    super(`Progress was not saved (${reason})`, { cause });
  }
}

/** Trimmed, non-empty and at most 30 characters; null if not valid. */
export function cleanNickname(input: string): string | null {
  const name = input.trim().replace(/\s+/g, " ");
  return name && [...name].length <= NICKNAME_MAX ? name : null;
}

/** The defaults used when setup is skipped. */
export function newLearner(nickname: string): Learner {
  return { nickname, lessonDone: false, onboarded: false, coach: "character", lang: "en", readAloud: false, partner: null, sounds: false, avatarSeed: newSeed(), avatarGen: AVATAR_GEN, schemaVersion: SCHEMA_VERSION };
}

// Key prefixes are part of the stored format. Never rename them; add a migration instead.
const KEY = {
  learner: "learner",
  attempt: (id: string) => `attempt:${id}`,
  run: (id: string) => `run:${id}`,
  cycle: (moveId: string) => `cycle:${moveId}`,
  schema: "meta:schema",
  lastMoment: "meta:lastMoment",
  calendarUses: "meta:calendarUses",
  sessions: "meta:sessions",
};

function highestMoment(p: Progress, stored: Moment | null): Moment | null {
  let top = stored;
  const consider = (m: Moment | undefined) => {
    if (m && (!top || m.seq > top.seq)) top = m;
  };
  for (const { attempt: a } of p.attempts.values()) {
    consider(a.startedAt);
    consider(a.completedAt);
    consider(a.reasonAt);
    consider(a.verifiedAt);
    a.resets.forEach(consider);
  }
  for (const { run } of p.runs.values()) {
    consider(run.started);
    run.submissions.forEach((s) => consider(s.at));
  }
  return top;
}

export class ProgressStore {
  private issued: Moment | null;
  private saving = false;
  /** Used if a record has no avatar yet; kept so a retried backfill reuses the same seed. */
  private readonly seed = newSeed();

  private constructor(
    private readonly kv: KV,
    private state: Progress,
    lastMoment: Moment | null,
    private calendarUses: number[],
    private sessions: Session[],
    /** False when progress lives only in memory and disappears on reload. */
    readonly durable: boolean,
    /** Set when this tab must not write: another tab owns the session, or the data is from a newer app. */
    readonly readOnly: ReadOnlyReason | null,
  ) {
    this.issued = lastMoment;
  }

  static async open(kv: KV, opts: { durable: boolean; writer: boolean }): Promise<ProgressStore> {
    const records = new Map(await kv.entries());
    const schema = (records.get(KEY.schema) as number | undefined) ?? SCHEMA_VERSION;
    const p: Progress = { learner: null, attempts: new Map(), runs: new Map(), cycles: new Map() };
    for (const [key, value] of records) {
      if (key === KEY.learner) p.learner = value as Learner;
      else if (key.startsWith("attempt:")) p.attempts.set(key.slice(8), value as SavedAttempt);
      else if (key.startsWith("run:")) p.runs.set(key.slice(4), value as SavedRun);
      else if (key.startsWith("cycle:")) p.cycles.set(key.slice(6), value as ProofCycle);
    }
    // Schema migrations go here when SCHEMA_VERSION rises. Data from a newer app is never rewritten.
    const readOnly: ReadOnlyReason | null = schema > SCHEMA_VERSION ? "newerSchema" : opts.writer ? null : "otherTab";
    const last = highestMoment(p, (records.get(KEY.lastMoment) as Moment | undefined) ?? null);
    const uses = records.get(KEY.calendarUses);
    const sessions = records.get(KEY.sessions);
    return new ProgressStore(kv, p, last, Array.isArray(uses) ? (uses as number[]) : [], Array.isArray(sessions) ? (sessions as Session[]) : [], opts.durable, readOnly);
  }

  get progress(): Readonly<Progress> {
    return this.state;
  }

  /** Timestamps of Add to calendar uses: a local pilot metric, learner-independent, never uploaded (spec section 11). */
  get calendarUseTimes(): readonly number[] {
    return this.calendarUses;
  }

  /** Records one calendar export. Best effort: a failure never blocks the download. */
  async recordCalendarUse(at: number): Promise<void> {
    if (this.readOnly) return;
    const next = [...this.calendarUses, at];
    await this.kv.setMany([[KEY.calendarUses, next]]);
    this.calendarUses = next;
  }

  /** Local session log for the pilot (spec section 15); never uploaded. */
  get sessionLog(): readonly Session[] {
    return this.sessions;
  }

  /** An interaction happened. Best effort: a failure never blocks the learner. */
  async recordActivity(at: number, hiddenMs = 0): Promise<void> {
    await this.saveSessions(touch(this.sessions, at, hiddenMs));
  }

  /** Done for today. */
  async endSession(): Promise<void> {
    await this.saveSessions(endSession(this.sessions));
  }

  private async saveSessions(next: Session[]): Promise<void> {
    if (this.readOnly) return;
    await this.kv.setMany([[KEY.sessions, next]]);
    this.sessions = next;
  }

  /** The next moment in this learner's timeline. Saved with the next batch; never repeats, even after a failed save. */
  moment(at: number): Moment {
    this.issued = nextMoment(this.issued, at);
    return this.issued;
  }

  /**
   * Saves the batch in one transaction, then updates what the app shows. On failure nothing changes:
   * keep the current screen, offer retry with the same batch and never say the result was saved.
   * One save at a time: wait for each to finish before advancing, so an older batch can never land after a newer one.
   */
  async save(batch: Batch): Promise<void> {
    if (this.readOnly) throw new StorageError(this.readOnly);
    if (this.saving) throw new StorageError("busy");
    this.saving = true;
    try {
      await this.write(batch);
    } finally {
      this.saving = false;
    }
  }

  /** Gives an older learner record its sounds default and avatar once. Every learner save does this too, with the same seed. */
  async backfill(): Promise<void> {
    const l = this.state.learner;
    if (l && !this.readOnly && !(l.avatarSeed && l.avatarGen)) await this.save({ learner: l });
  }

  private fill(l: Learner): Learner {
    if (l.avatarSeed && l.avatarGen) return l;
    const old = this.state.learner;
    return { ...l, sounds: l.sounds ?? false, avatarSeed: l.avatarSeed ?? old?.avatarSeed ?? this.seed, avatarGen: l.avatarGen ?? old?.avatarGen ?? AVATAR_GEN };
  }

  private async write(raw: Batch): Promise<void> {
    const batch = raw.learner ? { ...raw, learner: this.fill(raw.learner) } : raw;
    const items: [string, unknown][] = [
      [KEY.schema, SCHEMA_VERSION],
      [KEY.lastMoment, this.issued],
    ];
    if (batch.learner) items.push([KEY.learner, batch.learner]);
    for (const a of batch.attempts ?? []) items.push([KEY.attempt(a.attempt.id), a]);
    for (const r of batch.runs ?? []) items.push([KEY.run(r.run.id), r]);
    for (const c of batch.cycles ?? []) items.push([KEY.cycle(c.moveId), c]);
    try {
      await this.kv.setMany(items);
    } catch (e) {
      throw new StorageError("failed", e);
    }
    const next: Progress = {
      learner: batch.learner ?? this.state.learner,
      attempts: new Map(this.state.attempts),
      runs: new Map(this.state.runs),
      cycles: new Map(this.state.cycles),
    };
    for (const a of batch.attempts ?? []) next.attempts.set(a.attempt.id, a);
    for (const r of batch.runs ?? []) next.runs.set(r.run.id, r);
    for (const c of batch.cycles ?? []) next.cycles.set(c.moveId, c);
    this.state = next;
  }
}

/** Saves a completed run with its effect on the proof cycle (applied once per run ID). */
export function completeRunBatch(p: Progress, saved: SavedRun, timeZone: string): Batch {
  const moveId = saved.questions[0]!.moveId;
  const cycle = applyRun(p.cycles.get(moveId) ?? null, saved.run, moveId, p.cycles.get(moveId)?.timeZone ?? timeZone);
  return { runs: [saved], cycles: cycle ? [cycle] : [] };
}

/**
 * What to do with a run that was active when the app closed or reloaded. Judge it before marking it seen,
 * then save the returned batch once (retry the same batch on failure). Converted answers keep deterministic
 * IDs, so saving twice never duplicates them.
 */
export function recoverRun(
  p: Progress,
  now: number,
  timeZone: string,
): { outcome: "continue" | "timeout" | "convert"; saved: SavedRun; batch: Batch; unsubmitted: Question[] } | null {
  const saved = [...p.runs.values()].find((r) => r.run.status === "active");
  if (!saved) return null;
  const outcome = onReturn(saved.run, now, saved.run.lastSeenAt);
  if (outcome === "continue") return { outcome, saved, batch: {}, unsubmitted: [] };
  if (outcome === "timeout") {
    const done = { ...saved, run: finish(saved.run, now) };
    return { outcome, saved: done, batch: completeRunBatch(p, done, timeZone), unsubmitted: [] };
  }
  const c = convertBatch(saved, now, "converted");
  return { outcome, saved: c.saved, batch: c.batch, unsubmitted: c.unsubmitted };
}

/** Converts an active run to practice (long absence, clock anomaly, or Leave): submitted answers become completed attempts. */
export function convertBatch(saved: SavedRun, now: number, status: "converted" | "exited") {
  const { run, attempts } = convert(saved.run, now, status);
  const byId = new Map(saved.questions.map((q) => [q.id, q]));
  const done = { ...saved, run };
  return {
    saved: done,
    batch: { runs: [done], attempts: attempts.map((attempt) => ({ attempt, question: byId.get(attempt.questionId)! })) } as Batch,
    unsubmitted: saved.questions.slice(run.submissions.length),
  };
}

/** Where practice or the tutorial left off: an unfinished question, a pending How did you know, or a pending verification. */
export function resumePoint(p: Progress): { kind: "question" | "reason" | "verify"; saved: SavedAttempt } | null {
  const latest = [...p.attempts.values()]
    .filter((s) => s.attempt.origin !== "converted")
    .sort((x, y) => inOrder(x.attempt.startedAt, y.attempt.startedAt))
    .at(-1);
  if (!latest) return null;
  const a = latest.attempt;
  if (a.completedAt === undefined) return { kind: "question", saved: latest };
  if (asksReason(a) && !a.reason) return { kind: "reason", saved: latest };
  if (a.reason === "move" && a.verifySampled && !a.verifyResult) return { kind: "verify", saved: latest };
  return null;
}

/** Inputs for the rules: every attempt, and the start of every solo or recheck (dots reset when a run begins). */
export const attemptsOf = (p: Progress) => [...p.attempts.values()].map((s) => s.attempt);
export const runStartsOf = (p: Progress) => [...p.runs.values()].map((s) => s.run.started);

/** Opens this device's progress: IndexedDB if it works, the single-writer lock, then the saved records. */
/** Throws StorageError("timedOut") when storage did not answer: offer retry rather than starting empty. */
export async function openProgress(
  open: () => Promise<Opened>,
  claim: () => Promise<"owner" | "taken" | "unsupported">,
): Promise<ProgressStore> {
  const [opened, writer] = await Promise.all([open(), claim()]);
  if (!opened.kv) throw new StorageError("timedOut");
  return ProgressStore.open(opened.kv, { durable: opened.durable, writer: writer !== "taken" });
}
