import type { Page } from "@playwright/test";
import { LEARNER } from "./practice-helpers";

const DAY = 86_400_000;
const NOW = Date.now();
const q = (i: number) => ({ id: `q${i}`, moveId: "strip-disguise", contentVersion: 1, subject: "The teacher", covered: "as well as the pupils", predicate: "the room", number: "sg", pairing: "x", options: ["enters", "enter", "entering", "entered"], answer: "enters" });

/** A finished run as the app saves it: `{run, questions}` under key `run:<id>`. `daysAgo` orders it; seq makes the true order. */
export function finishedRun(id: string, kind: "solo" | "recheck", score: number, opts: { n: number; practice?: number | null; daysAgo?: number; purpose?: "scheduled" | "recovery" }) {
  const total = kind === "solo" ? 10 : 5;
  const pass = kind === "solo" ? 8 : 4;
  const qs = Array.from({ length: total }, (_, i) => ({ ...q(i), id: `${id}-q${i}` }));
  const at = NOW - (opts.daysAgo ?? 0) * DAY;
  const run = {
    id, kind, purpose: opts.purpose, questionIds: qs.map((x) => x.id),
    submissions: qs.map((x, i) => ({ questionId: x.id, correct: i < score, at: { at, seq: opts.n * 100 + i + 1 } })),
    started: { at, seq: opts.n * 100 }, deadline: at + 600_000, lastSeenAt: at, status: "completed", endedAt: at + 1000,
    result: { score, total, passed: score >= pass, timedOut: false },
    ...(kind === "solo" ? { practiceSnapshot: opts.practice ?? null } : { coveredEntryIds: [] }),
  };
  return { key: `run:${id}`, value: { run, questions: qs } };
}

export function cycle(state: "proved" | "held" | "fading", firstRunId: string, anchor: string, due: string) {
  return {
    key: "cycle:strip-disguise",
    value: {
      moveId: "strip-disguise", timeZone: "UTC", state, earnedOn: anchor, anchor,
      entries: [{ id: `${anchor}+3`, day: 3, due, status: "scheduled" }],
      history: [{ runId: firstRunId, kind: "solo", on: anchor, passed: true, entryIds: [] }],
    },
  };
}

/** Writes the learner and the given records straight into IndexedDB, then opens `path`. */
export async function seedRecords(page: Page, records: { key: string; value: unknown }[], path: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).waitFor();
  await page.evaluate(
    (items) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("tether");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction("records", "readwrite");
          for (const r of items) tx.objectStore("records").put(r.value, r.key);
          tx.oncomplete = () => resolve();
        };
      }),
    [{ key: "learner", value: LEARNER }, ...records],
  );
  await page.goto(path);
}
