import { expect, test, type Page } from "@playwright/test";
import { LEARNER, records } from "./practice-helpers";

// Cycles are seeded in the stored shape (src/storage/progress.ts: key cycle:<moveId>); dates come from ?demo=.
const entry = (day: number, due: string, status: string) => ({ id: `2026-10-13+${day}`, day, due, status });
const cycle = (state: string, statuses: [string, string, string]) => ({
  moveId: "strip-disguise", timeZone: "Africa/Lagos", state, earnedOn: "2026-10-13", anchor: "2026-10-13",
  entries: [entry(3, "2026-10-16", statuses[0]), entry(7, "2026-10-20", statuses[1]), entry(14, "2026-10-27", statuses[2])],
  history: [],
});

async function seedCycle(page: Page, c: object) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).waitFor();
  await page.evaluate(
    ([learner, c]) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const tx = open.result.transaction("records", "readwrite");
          tx.objectStore("records").put(learner, "learner");
          tx.objectStore("records").put(c, "cycle:strip-disguise");
          tx.oncomplete = () => resolve();
        };
      }),
    [LEARNER, c],
  );
}
const dump = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const store = open.result.transaction("records").objectStore("records");
          // Startup may backfill the learner's avatar; the simulation must leave the proof cycle and runs alone.
          const all = store.getAll();
          all.onsuccess = () => resolve(JSON.stringify(all.result.filter((r) => r?.moveId || r?.run)));
        };
      }),
  );

const proved = () => cycle("proved", ["scheduled", "scheduled", "scheduled"]);

test("before day 3 there is no recheck on Home", async ({ page }) => {
  await seedCycle(page, proved());
  await page.goto("/?demo=2026-10-15");
  await expect(page.getByRole("link", { name: "Start recheck" })).toHaveCount(0);
  await expect(page.getByText("First recheck: 16 Oct 2026")).toBeVisible();
});

test("due today previews Start recheck under a demo date, then the entry shows the same preview", async ({ page }) => {
  await seedCycle(page, proved());
  await page.goto("/?demo=2026-10-16");
  await expect(page.getByText("Recheck due today.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start recheck (demo preview)" })).toBeDisabled();
  await page.goto("/recheck-entry?demo=2026-10-16");
  await expect(page.getByRole("heading", { name: "Time for your recheck" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start recheck (demo preview)" })).toBeDisabled();
});

test("overdue is neutral and keeps the proof state", async ({ page }) => {
  await seedCycle(page, proved());
  await page.goto("/?demo=2026-10-18");
  await expect(page.getByText("Your recheck is waiting.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Proved, due" })).toBeVisible();
});

test("Fading offers Practise to recover and Try anyway", async ({ page }) => {
  await seedCycle(page, cycle("fading", ["missed", "paused", "paused"]));
  await page.goto("/");
  await expect(page.getByText("It slipped a bit. Practise the move, then pass 4 of 5 to restore it.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Practise to recover" })).toHaveAttribute("href", "/practice");
  await page.getByRole("link", { name: "Try anyway" }).click();
  await expect(page.getByRole("link", { name: "Start recheck" })).toHaveAttribute("href", /^\/run\/recheck/);
});

test("Held shows no invented date after the last pass", async ({ page }) => {
  await seedCycle(page, cycle("held", ["passed", "passed", "passed"]));
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Held" })).toBeVisible();
  await expect(page.getByText("Every scheduled recheck passed.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start recheck" })).toHaveCount(0);
});

test("a simulated date is labelled and never changes stored progress", async ({ page }) => {
  await seedCycle(page, proved());
  await page.goto("/");
  const before = await dump(page);
  await page.goto("/?demo");
  await page.getByLabel("Demo: simulate date").fill("2026-10-30");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("status")).toContainText("Simulated date: 30 Oct 2026");
  await expect(page.getByText("Your recheck is waiting.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start recheck (demo preview)" })).toBeDisabled();
  expect(await dump(page)).toBe(before);
});

test("a demo date is a read-only preview: nothing reaches /run/recheck and the cycle is unchanged", async ({ page }) => {
  await seedCycle(page, cycle("fading", ["missed", "paused", "paused"]));
  const before = await dump(page);
  const noRun = async () => {
    await expect(page.locator('a[href*="/run/"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: /demo preview/ }).first()).toBeDisabled();
  };
  await page.goto("/?demo=2026-10-20");
  await expect(page.getByRole("status")).toContainText("Simulated date: 20 Oct 2026");
  await expect(page.getByRole("link", { name: "Practise to recover" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Try anyway" })).toHaveCount(0);
  await noRun();
  await page.goto("/recheck-entry?demo=2026-10-20");
  await expect(page.getByRole("heading", { name: "Restore your proof" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Simulated date");
  await noRun();
  expect(await dump(page)).toBe(before);
  // The real date still offers the actions.
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Practise to recover" })).toBeVisible();
  await page.getByRole("link", { name: "Try anyway" }).click();
  await expect(page.getByRole("link", { name: "Start recheck" })).toHaveAttribute("href", "/run/recheck");
});

test("an unfinished question still leaves the recheck entry on Home", async ({ page }) => {
  await seedCycle(page, cycle("fading", ["missed", "paused", "paused"]));
  await page.goto("/practice");
  await expect(page.getByRole("button", { name: "Check" })).toBeVisible();
  await expect.poll(async () => (await records(page)).length).toBe(1); // the question is saved before leaving
  await page.goto("/");
  await expect(page.getByText("Your proof needs a quick restore.")).toBeVisible(); // a recheck is available, so its line stays
  await expect(page.getByRole("link", { name: "Continue where you stopped" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Try anyway" })).toHaveAttribute("href", "/recheck-entry");
});

for (const [name, width, height] of [["phone", 360, 800], ["laptop", 1366, 768]] as const)
  test(`no horizontal scroll on Home (${name})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await seedCycle(page, proved());
    await page.goto("/?demo=2026-10-18");
    await expect(page.getByText("Your recheck is waiting.")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
