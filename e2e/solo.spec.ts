import { expect, test, type Page } from "@playwright/test";
import { LEARNER } from "./practice-helpers";

// Solo and recheck runs (spec section 7). Cues are counted from the sound service's own log (window.__soundLog);
// writes can be failed with window.__failWrites.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__soundLog = [];
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: [any, any?]) {
      if (w.__failWrites) throw new DOMException("simulated write failure", "QuotaExceededError");
      return put.apply(this, args);
    };
  });
});

const idb = <T,>(page: Page, fn: (rows: [string, any][]) => T) =>
  page.evaluate(
    (src) =>
      new Promise<any>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const store = open.result.transaction("records").objectStore("records");
          const keys = store.getAllKeys();
          keys.onsuccess = () => {
            const vals = store.getAll();
            vals.onsuccess = () => resolve(new Function("rows", `return (${src})(rows)`)(keys.result.map((k, i) => [k, vals.result[i]])));
          };
        };
      }),
    fn.toString(),
  ) as Promise<T>;
const runs = (page: Page) => idb(page, (rows) => rows.filter(([k]) => String(k).startsWith("run:")).map(([, v]) => v));
const activeRun = async (page: Page) => (await runs(page)).find((r: any) => r.run.status === "active");

async function put(page: Page, key: string, value: unknown) {
  await page.evaluate(
    ([k, v]) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const tx = open.result.transaction("records", "readwrite");
          tx.objectStore("records").put(v, k as string);
          tx.oncomplete = () => resolve();
        };
      }),
    [key, value] as const,
  );
}
async function start(page: Page, path = "/run/solo", learner: object = { ...LEARNER, sounds: true }) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).waitFor();
  await put(page, "learner", learner);
  await page.goto(path);
}
const heading = (page: Page, n: number, of = 10) => page.getByRole("heading", { name: new RegExp(`^Question ${n} of ${of}`) });

/** Answers the current question (right or deliberately wrong) and moves on. The saved run holds the answer; the UI never shows it. */
async function answer(page: Page, right: boolean, n: number, of = 10) {
  await expect(heading(page, n, of)).toBeVisible();
  await expect.poll(async () => (await activeRun(page))?.run.submissions.length).toBe(n - 1);
  const saved = await activeRun(page);
  const q = saved.questions[n - 1];
  const word = right ? q.answer : q.options.find((o: string) => o !== q.answer);
  await page.getByRole("radio", { name: new RegExp(`: ${word}$`) }).click();
  await page.getByRole("button", { name: n === of ? "Finish" : "Next" }).click();
}
const hide = (page: Page, hidden: boolean) =>
  page.evaluate((h) => {
    Object.defineProperty(document, "visibilityState", { value: h ? "hidden" : "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
const log = (page: Page) => page.evaluate(() => (window as any).__soundLog as string[]);

test("solo with 8 right passes, saves the proof cycle, and celebrates only after the save", async ({ page }) => {
  await start(page);
  for (let n = 1; n <= 10; n++) {
    await answer(page, n <= 8, n);
    if (n < 10) expect(await log(page)).toEqual([]); // no cue during the run, even for selecting and Next
  }
  await expect(page).toHaveURL(/\/result\/run-/);
  const [r] = await runs(page);
  expect(r.run).toMatchObject({ status: "completed", result: { score: 8, passed: true, timedOut: false } });
  expect((await idb(page, (rows) => rows.filter(([k]) => String(k).startsWith("cycle:"))))).toHaveLength(1);
  await expect.poll(() => log(page)).toEqual(["celebrate"]);
});

test("solo with 7 right is not yet: no cycle, no celebration", async ({ page }) => {
  await start(page);
  for (let n = 1; n <= 10; n++) await answer(page, n <= 7, n);
  await expect(page).toHaveURL(/\/result\/run-/);
  expect((await runs(page))[0].run.result).toMatchObject({ score: 7, passed: false });
  expect(await idb(page, (rows) => rows.filter(([k]) => String(k).startsWith("cycle:")))).toHaveLength(0);
  expect(await log(page)).toEqual([]);
});

test("the deadline scores unanswered questions as wrong and dates the run at the deadline", async ({ page }) => {
  await page.clock.install();
  await start(page);
  await answer(page, true, 1);
  await answer(page, true, 2);
  await expect(heading(page, 3)).toBeVisible();
  await page.clock.fastForward("10:30");
  await expect(page).toHaveURL(/\/result\/run-/);
  const [r] = await runs(page);
  expect(r.run.result).toMatchObject({ score: 2, passed: false, timedOut: true });
  expect(r.run.endedAt).toBe(r.run.deadline);
});

test("time almost up is announced in words, and the timer counts down", async ({ page }) => {
  await page.clock.install();
  await start(page);
  await expect(page.getByRole("timer")).toContainText("10:00");
  await page.clock.fastForward("09:45");
  await expect(page.getByText("Time is almost up")).toBeVisible();
  await expect(page.getByRole("timer")).toContainText("00:1");
});

test("reload mid-run resumes the same run at the same question", async ({ page }) => {
  await start(page);
  await answer(page, true, 1);
  await answer(page, false, 2);
  await expect(heading(page, 3)).toBeVisible();
  const before = await activeRun(page);
  await page.reload();
  await expect(heading(page, 3)).toBeVisible();
  await expect(page.getByText("Welcome back. Your solo run is still on.")).toBeVisible();
  expect((await activeRun(page)).run.id).toBe(before.run.id);
});

test("a short absence continues; a long one converts the run to practice", async ({ page }) => {
  await page.clock.install();
  await start(page);
  await answer(page, true, 1);
  await answer(page, false, 2);
  await expect(heading(page, 3)).toBeVisible();

  await hide(page, true);
  await page.clock.fastForward(5000);
  await hide(page, false);
  await expect(page.getByText("Welcome back. Your solo run is still on.")).toBeVisible();
  await expect(heading(page, 3)).toBeVisible();

  await hide(page, true);
  await page.clock.fastForward(12_000);
  await hide(page, false);
  await expect(page.getByRole("heading", { name: "You were away too long" })).toBeVisible();
  const [r] = await runs(page);
  expect(r.run.status).toBe("converted");
  expect(r.run.result).toBeUndefined();
  const attempts = await idb(page, (rows) => rows.filter(([k]) => String(k).startsWith("attempt:")).map(([, v]) => v.attempt));
  expect(attempts.map((a: any) => [a.origin, !!a.correctOnCheck])).toEqual([["converted", true], ["converted", false]]);
  expect(await idb(page, (rows) => rows.filter(([k]) => String(k).startsWith("cycle:")))).toHaveLength(0);
  await page.getByRole("button", { name: "Start a fresh solo run" }).click();
  await expect(heading(page, 1)).toBeVisible();
});

test("Leave asks first; Keep going stays, Leave converts what was answered and returns Home", async ({ page }) => {
  await start(page);
  await answer(page, true, 1);
  await expect(heading(page, 2)).toBeVisible();
  await page.getByRole("button", { name: "Leave this run" }).click();
  await expect(page.getByRole("dialog", { name: "Leave this run?" })).toBeVisible();
  await page.getByRole("button", { name: "Keep going" }).click();
  await expect(heading(page, 2)).toBeVisible();
  await page.getByRole("button", { name: "Leave this run" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  const [r] = await runs(page);
  expect(r.run.status).toBe("exited");
  expect(await idb(page, (rows) => rows.filter(([k]) => String(k).startsWith("attempt:")))).toHaveLength(1);
});

test("no help, Bo, move sheet or feedback is in the DOM during a run", async ({ page }) => {
  await start(page);
  await expect(heading(page, 1)).toBeVisible();
  await page.getByRole("radio").first().click();
  const body = (await page.locator("body").innerText()).toLowerCase();
  for (const w of ["show me", "nudge", "go deeper", "the move", "not quite", "correct", "try again", "help ladder"]) expect(body).not.toContain(w);
  await expect(page.locator(".bo, .qv-move, .qv-panel, dialog[open]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /show me|move/i })).toHaveCount(0);
  await expect(page.getByRole("radio")).toHaveCount(4);
});

test("a failed save keeps the screen with Retry and never claims the result is saved", async ({ page }) => {
  await start(page);
  for (let n = 1; n <= 9; n++) await answer(page, true, n);
  await expect(heading(page, 10)).toBeVisible();
  // Fail the last answer's save: the run does not finish and does not navigate.
  const saved = await activeRun(page);
  const q = saved.questions[9];
  await page.getByRole("radio", { name: new RegExp(`: ${q.answer}$`) }).click();
  await page.evaluate(() => ((window as any).__failWrites = true));
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("alert")).toContainText("Couldn't save");
  await expect(page.getByRole("button", { name: "Retry" })).toBeEnabled();
  await expect(page).toHaveURL(/\/run\/solo/);
  await expect(page.getByText(/result saved|saved your result/i)).toHaveCount(0);
  expect(await log(page)).toEqual([]);
  await page.evaluate(() => ((window as any).__failWrites = false));
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page).toHaveURL(/\/result\/run-/);
  expect((await runs(page))[0].run.result).toMatchObject({ score: 10, passed: true });
});

test("a recheck is refused when none is due, and runs five questions when one is", async ({ page }) => {
  await start(page, "/run/recheck");
  await expect(page.getByRole("heading", { name: "No recheck is due" })).toBeVisible();
  expect(await runs(page)).toHaveLength(0);

  const cycle = { moveId: "strip-disguise", timeZone: "UTC", state: "fading", earnedOn: "2026-01-01", anchor: "2026-01-01", entries: [], history: [] };
  await put(page, "cycle:strip-disguise", cycle);
  await page.goto("/run/recheck");
  await expect(heading(page, 1, 5)).toBeVisible();
  const r = await activeRun(page);
  expect(r.run).toMatchObject({ kind: "recheck", purpose: "recovery" });
  expect(r.run.questionIds).toHaveLength(5);
  for (let n = 1; n <= 5; n++) await answer(page, n <= 4, n, 5);
  await expect(page).toHaveURL(/\/result\/run-/);
  expect((await runs(page))[0].run.result).toMatchObject({ score: 4, total: 5, passed: true });
});

test("screenshots: running, time almost up, welcome back at 360 and 1366", async ({ page }) => {
  for (const [w, h] of [[360, 800], [1366, 768]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    await page.evaluate(() => indexedDB.deleteDatabase("tether"));
    await page.clock.install();
    await start(page);
    await expect(heading(page, 1)).toBeVisible();
    await page.screenshot({ path: `screenshots/step11-running-${w}.png` });
    await hide(page, true);
    await page.clock.fastForward(3000);
    await hide(page, false);
    await expect(page.getByText("Welcome back")).toBeVisible();
    await page.screenshot({ path: `screenshots/step11-welcome-back-${w}.png` });
    await page.clock.fastForward("09:40");
    await expect(page.getByText("Time is almost up")).toBeVisible();
    await page.screenshot({ path: `screenshots/step11-time-almost-up-${w}.png` });
  }
});

test("journey: a passed solo shows its result, then Home shows the proof and its next check", async ({ page }) => {
  await start(page);
  for (let n = 1; n <= 10; n++) await answer(page, n <= 9, n);
  await expect(page).toHaveURL(/\/result\/run-/);
  await expect(page.getByText("Passed. You are Proved.")).toBeVisible();
  await page.getByRole("button", { name: "Back to Home" }).or(page.getByRole("link", { name: "Back to Home" })).first().click();
  await expect(page).toHaveURL(/\/$/);
  const proof = page.getByRole("region", { name: "Your proof" });
  await expect(proof.getByRole("img", { name: "Proved" })).toBeVisible();
  await expect(proof.getByText(/First recheck:/)).toBeVisible();
});
