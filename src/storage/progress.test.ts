import "fake-indexeddb/auto";
import { describe, expect, test, vi } from "vitest";
import { drawRun, nextPracticeQuestion, SOLO_SHAPE, type Question } from "../content/generate.ts";
import { stripDisguise } from "../content/strip-disguise.ts";
import { check, giveReason, startAttempt } from "../rules/practice.ts";
import { seen, startRun, submit } from "../rules/runs.ts";
import { idbKV, memoryKV, openKV, type KV } from "./kv.ts";
import {
  attemptsOf,
  AVATAR_GEN,
  cleanNickname,
  completeRunBatch,
  newLearner,
  openProgress,
  ProgressStore,
  recoverRun,
  resumePoint,
  SCHEMA_VERSION,
  StorageError,
  type SavedRun,
} from "./progress.ts";

const LAGOS = "Africa/Lagos";
const T0 = Date.UTC(2026, 9, 13, 9, 0);
let dbCount = 0;
const freshDb = () => `tether-test-${++dbCount}`;
const rng = () => 0.5;

/** Opens the database the way a page load does: a new store with nothing carried over in memory. */
const reopen = (kv: KV, writer = true) => ProgressStore.open(kv, { durable: true, writer });

function practiceQuestion(): Question {
  return nextPracticeQuestion(stripDisguise, rng);
}

async function startedSolo(store: ProgressStore, at = T0): Promise<SavedRun> {
  const questions = drawRun(stripDisguise, rng, SOLO_SHAPE);
  const run = startRun({ id: `solo-${at}`, kind: "solo", questionIds: questions.map((q) => q.id), practiceSnapshot: null }, store.moment(at));
  const saved = { run, questions };
  await store.save({ runs: [saved] });
  return saved;
}

/** Answers `count` questions of the saved run (all correct unless `wrong` lists positions), saving after each. */
async function answer(store: ProgressStore, saved: SavedRun, count: number, from: number, wrong: number[] = []): Promise<SavedRun> {
  let s = saved;
  for (let i = 0; i < count; i++) {
    const q = s.questions[s.run.submissions.length]!;
    s = { ...s, run: submit(s.run, q.id, !wrong.includes(i), store.moment(from + i * 1000)) };
    await store.save({ runs: [s] });
  }
  return s;
}

describe("settings and nickname", () => {
  test("nickname is trimmed, non-empty and at most 30 characters", () => {
    expect(cleanNickname("  Amaka  ")).toBe("Amaka");
    expect(cleanNickname("   ")).toBeNull();
    expect(cleanNickname("a".repeat(30))).toHaveLength(30);
    expect(cleanNickname("a".repeat(31))).toBeNull();
  });

  test("learner settings survive a reload; skipping setup uses the spec defaults", async () => {
    const kv = idbKV(freshDb());
    const store = await reopen(kv);
    const learner = newLearner("Amaka");
    expect(learner).toMatchObject({ coach: "character", lang: "en", readAloud: false, partner: null, schemaVersion: SCHEMA_VERSION });
    await store.save({ learner: { ...learner, lang: "pcm", readAloud: true } });
    expect((await reopen(kv)).progress.learner).toMatchObject({ nickname: "Amaka", lang: "pcm", readAloud: true });
  });
});

describe("sounds and avatar fields", () => {
  // An older record has neither field: build one by removing them.
  const old = () => {
    const { sounds, avatarSeed, avatarGen, ...rest } = newLearner("Amaka");
    return { ...rest, lang: "pcm" as const, readAloud: true, coach: "text" as const, partner: { name: "Ife" }, honestyIntroSeen: true };
  };

  test("a new learner has sounds off and a random seed unrelated to the nickname", () => {
    const a = newLearner("Amaka");
    const b = newLearner("Amaka");
    expect(a).toMatchObject({ sounds: false, avatarGen: AVATAR_GEN });
    expect(a.avatarSeed).toMatch(/^[0-9a-f]{24}$/);
    expect(a.avatarSeed).not.toBe(b.avatarSeed);
  });

  test("an older record is backfilled once, keeping every setting and record", async () => {
    const kv = memoryKV();
    const q = practiceQuestion();
    const attempt = startAttempt("a1", q.id, "practice", { seq: 1, at: T0 });
    await kv.setMany([["learner", old()], ["attempt:a1", { attempt, question: q }]]);
    const store = await reopen(kv);
    expect(store.progress.learner!.avatarSeed).toBeUndefined();
    await store.backfill();
    const filled = store.progress.learner!;
    expect(filled).toMatchObject({ nickname: "Amaka", lang: "pcm", readAloud: true, coach: "text", partner: { name: "Ife" }, honestyIntroSeen: true, sounds: false, avatarGen: AVATAR_GEN });
    expect(filled.avatarSeed).toBeTruthy();
    expect(store.progress.attempts.size).toBe(1);
    const again = await reopen(kv);
    expect(again.progress.learner).toEqual(filled);
    const writes = vi.spyOn(kv, "setMany");
    await again.backfill();
    expect(writes).not.toHaveBeenCalled(); // already filled: no second write
  });

  test("a failed backfill is retried with the same seed, and a stale copy or nickname change keeps the avatar", async () => {
    const kv = memoryKV();
    await kv.setMany([["learner", old()]]);
    const real = kv.setMany.bind(kv);
    let fail = true;
    kv.setMany = async (items) => (fail ? Promise.reject(new Error("full")) : real(items));
    const store = await reopen(kv);
    await expect(store.backfill()).rejects.toMatchObject({ reason: "failed" });
    expect(store.progress.learner!.avatarSeed).toBeUndefined();
    fail = false;
    await store.backfill();
    const seed = store.progress.learner!.avatarSeed;
    expect(seed).toBeTruthy();
    // A copy made before the backfill (no seed) and a renamed copy both keep the saved avatar.
    await store.save({ learner: { ...old(), nickname: "Ada" } });
    expect(store.progress.learner).toMatchObject({ nickname: "Ada", avatarSeed: seed });
  });

  test("retry of a failed first save reuses one seed", async () => {
    const kv = memoryKV();
    await kv.setMany([["learner", old()]]);
    const real = kv.setMany.bind(kv);
    const seen: unknown[] = [];
    let fail = true;
    kv.setMany = async (items) => {
      seen.push((items.find(([k]) => k === "learner")![1] as { avatarSeed: string }).avatarSeed);
      return fail ? Promise.reject(new Error("full")) : real(items);
    };
    const store = await reopen(kv);
    await expect(store.save({ learner: old() })).rejects.toBeInstanceOf(StorageError);
    fail = false;
    await store.save({ learner: old() });
    expect(seen[0]).toBe(seen[1]);
    expect(store.progress.learner!.avatarSeed).toBe(seen[0]);
  });
});

describe("saving progress", () => {
  test("attempts, runs and proof cycles round-trip with the exact question shown", async () => {
    const kv = idbKV(freshDb());
    const store = await reopen(kv);
    const q = practiceQuestion();
    const attempt = check(startAttempt("a1", q.id, "practice", store.moment(T0)), true, store.moment(T0 + 1000));
    await store.save({ attempts: [{ attempt, question: q }] });
    let solo = await startedSolo(store, T0 + 10_000);
    solo = await answer(store, solo, 10, T0 + 11_000);
    await store.save(completeRunBatch(store.progress, solo, LAGOS));

    const after = (await reopen(kv)).progress;
    expect(after.attempts.get("a1")).toEqual({ attempt, question: q });
    expect(after.runs.get(solo.run.id)!.run.result).toMatchObject({ score: 10, passed: true });
    expect(after.cycles.get("strip-disguise")).toMatchObject({ state: "proved", timeZone: LAGOS });
  });

  test("saving the same record twice keeps one copy", async () => {
    const kv = idbKV(freshDb());
    const store = await reopen(kv);
    const q = practiceQuestion();
    const saved = { attempt: check(startAttempt("a1", q.id, "practice", store.moment(T0)), true, store.moment(T0 + 1)), question: q };
    await store.save({ attempts: [saved] });
    await store.save({ attempts: [saved] });
    expect((await reopen(kv)).progress.attempts.size).toBe(1);
  });

  test("the event sequence continues after a reload and never repeats", async () => {
    const kv = idbKV(freshDb());
    const first = await reopen(kv);
    const q = practiceQuestion();
    const m1 = first.moment(T0);
    await first.save({ attempts: [{ attempt: startAttempt("a1", q.id, "practice", m1), question: q }] });
    const m2 = (await reopen(kv)).moment(T0 - 60_000); // clock set back
    expect(m2.seq).toBeGreaterThan(m1.seq);
  });

  test("a failed save changes nothing on disk or in memory, and the same batch can be retried", async () => {
    const real = idbKV(freshDb());
    let failing = true;
    const flaky: KV = {
      entries: () => real.entries(),
      setMany: (items) => (failing ? Promise.reject(new DOMException("quota", "QuotaExceededError")) : real.setMany(items)),
    };
    const store = await reopen(flaky);
    const q = practiceQuestion();
    const batch = { attempts: [{ attempt: check(startAttempt("a1", q.id, "practice", store.moment(T0)), true, store.moment(T0 + 1)), question: q }] };
    await expect(store.save(batch)).rejects.toBeInstanceOf(StorageError);
    expect(store.progress.attempts.size).toBe(0);
    expect((await reopen(real)).progress.attempts.size).toBe(0);
    failing = false;
    await store.save(batch);
    expect(store.progress.attempts.size).toBe(1);
    expect((await reopen(real)).progress.attempts.size).toBe(1);
  });
});

describe("refreshes and interrupted sessions", () => {
  test("an unfinished practice question reopens with the same options", async () => {
    const kv = idbKV(freshDb());
    const store = await reopen(kv);
    const q = practiceQuestion();
    await store.save({ attempts: [{ attempt: check(startAttempt("a1", q.id, "practice", store.moment(T0)), false, store.moment(T0 + 1)), question: q }] });
    const resume = resumePoint((await reopen(kv)).progress);
    expect(resume).toMatchObject({ kind: "question", saved: { question: { options: q.options } } });
  });

  test("a pending How did you know, and a pending verification, resume on return", async () => {
    const kv = idbKV(freshDb());
    const store = await reopen(kv);
    const q = practiceQuestion();
    const correct = check(startAttempt("a1", q.id, "practice", store.moment(T0)), true, store.moment(T0 + 1));
    await store.save({ attempts: [{ attempt: correct, question: q }] });
    expect(resumePoint((await reopen(kv)).progress)?.kind).toBe("reason");
    await store.save({ attempts: [{ attempt: giveReason(correct, "move", () => 0, store.moment(T0 + 2)), question: q }] });
    expect(resumePoint((await reopen(kv)).progress)?.kind).toBe("verify");
  });

  test("a run reopened within ten seconds continues", async () => {
    const kv = idbKV(freshDb());
    const store = await reopen(kv);
    const saved = await answer(store, await startedSolo(store), 3, T0 + 1000);
    const r = recoverRun((await reopen(kv)).progress, saved.run.lastSeenAt + 9_900, LAGOS)!;
    expect(r.outcome).toBe("continue");
    expect(r.saved.run.submissions).toHaveLength(3);
  });

  test("a run reopened after ten seconds converts once: answers become practice, nothing duplicates", async () => {
    const kv = idbKV(freshDb());
    const store = await reopen(kv);
    const saved = await answer(store, await startedSolo(store), 3, T0 + 1000, [1]);
    const later = saved.run.lastSeenAt + 60_000;

    const page1 = await reopen(kv);
    const r = recoverRun(page1.progress, later, LAGOS)!;
    expect(r.outcome).toBe("convert");
    expect(r.unsubmitted).toHaveLength(7);
    await page1.save(r.batch);
    await page1.save(r.batch); // a retry of the same batch

    const page2 = await reopen(kv);
    expect(recoverRun(page2.progress, later + 5_000, LAGOS)).toBeNull();
    const converted = attemptsOf(page2.progress).filter((a) => a.origin === "converted");
    expect(converted.map((a) => a.correctOnCheck)).toEqual([1, undefined, 1]);
    expect(page2.progress.runs.get(saved.run.id)!.run.status).toBe("converted");
    expect(page2.progress.cycles.size).toBe(0);
  });

  test("a run whose deadline passed during a short absence is scored once and proof is awarded once", async () => {
    const kv = idbKV(freshDb());
    const store = await reopen(kv);
    let saved = await answer(store, await startedSolo(store), 8, T0 + 1000);
    saved = { ...saved, run: seen(saved.run, saved.run.deadline - 2_000) };
    await store.save({ runs: [saved] });

    const page1 = await reopen(kv);
    const r = recoverRun(page1.progress, saved.run.deadline + 1_000, LAGOS)!;
    expect(r.outcome).toBe("timeout");
    expect(r.saved.run.result).toMatchObject({ score: 8, passed: true, timedOut: true });
    await page1.save(r.batch);

    const page2 = await reopen(kv);
    expect(recoverRun(page2.progress, saved.run.deadline + 9_000, LAGOS)).toBeNull();
    await page2.save(completeRunBatch(page2.progress, page2.progress.runs.get(saved.run.id)!, LAGOS)); // applied again by mistake
    const cycle = (await reopen(kv)).progress.cycles.get("strip-disguise")!;
    expect(cycle.history.filter((h) => h.runId === saved.run.id)).toHaveLength(1);
  });
});

describe("storage failures and versions", () => {
  test("unavailable IndexedDB falls back to memory and says progress is temporary", async () => {
    const original = globalThis.indexedDB;
    // @ts-expect-error simulating a browser without IndexedDB
    delete globalThis.indexedDB;
    try {
      const opened = await openKV(freshDb());
      expect(opened).toMatchObject({ durable: false, reason: "unavailable" });
      const store = await openProgress(async () => opened, async () => "owner");
      expect(store.durable).toBe(false);
    } finally {
      globalThis.indexedDB = original;
    }
  });

  test("working IndexedDB is reported as durable", async () => {
    expect((await openKV(freshDb())).durable).toBe(true);
  });

  test("tabs opening at the same moment both find working storage", async () => {
    const db = freshDb();
    let t = 0;
    const now = vi.spyOn(Date, "now").mockImplementation(() => ++t); // each tab opens a millisecond apart
    try {
      const opens = await Promise.all(Array.from({ length: 5 }, () => openKV(db)));
      expect(opens.map((o) => o.durable)).toEqual([true, true, true, true, true]);
    } finally {
      now.mockRestore();
    }
  });

  test("storage that fails its probe falls back to temporary memory", async () => {
    const opened = await openKV(freshDb(), 1000, async () => {
      throw new Error("blocked");
    });
    expect(opened).toMatchObject({ durable: false, reason: "unavailable" });
  });

  test("storage that does not answer in time is not replaced by an empty store", async () => {
    const opened = await openKV(freshDb(), 20, () => new Promise(() => {}));
    expect(opened).toEqual({ kv: null, durable: false, reason: "timedOut" });
    await expect(openProgress(async () => opened, async () => "owner")).rejects.toMatchObject({ reason: "timedOut" });
  });

  test("one save at a time: a second save while one is in flight is refused", async () => {
    let release!: () => void;
    let calls = 0;
    const slow: KV = { entries: async () => [], setMany: () => (++calls === 1 ? new Promise<void>((r) => (release = r)) : Promise.resolve()) };
    const store = await reopen(slow);
    const first = store.save({ learner: newLearner("Amaka") });
    await expect(store.save({ learner: newLearner("Amaka") })).rejects.toMatchObject({ reason: "busy" });
    release();
    await first;
    await expect(store.save({ learner: newLearner("Amaka") })).resolves.toBeUndefined();
  });

  test("data from a newer app version opens read-only and is never rewritten", async () => {
    const kv = memoryKV();
    await kv.setMany([
      ["meta:schema", SCHEMA_VERSION + 1],
      ["learner", newLearner("Amaka")],
    ]);
    const store = await reopen(kv);
    expect(store.readOnly).toBe("newerSchema");
    expect(store.progress.learner?.nickname).toBe("Amaka");
    await expect(store.save({ learner: newLearner("Other") })).rejects.toMatchObject({ reason: "newerSchema" });
  });

  test("a second tab without the writer lock reads progress but cannot write", async () => {
    const kv = memoryKV();
    await (await reopen(kv)).save({ learner: newLearner("Amaka") });
    const other = await reopen(kv, false);
    expect(other.readOnly).toBe("otherTab");
    expect(other.progress.learner?.nickname).toBe("Amaka");
    await expect(other.save({ learner: newLearner("Amaka") })).rejects.toMatchObject({ reason: "otherTab" });
  });
});

describe("calendar uses (spec section 11)", () => {
  test("are kept locally across reopen, learner-independent, and not written by a read-only tab", async () => {
    const kv = idbKV(freshDb());
    const store = await reopen(kv);
    await store.recordCalendarUse(T0);
    await store.recordCalendarUse(T0 + 5);
    expect((await reopen(kv)).calendarUseTimes).toEqual([T0, T0 + 5]);
    const other = await reopen(kv, false);
    await other.recordCalendarUse(T0 + 9);
    expect((await reopen(kv)).calendarUseTimes).toEqual([T0, T0 + 5]);
  });
});
