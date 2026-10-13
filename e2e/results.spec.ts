import { expect, test } from "@playwright/test";
import { cycle, finishedRun, seedRecords } from "./results-helpers";

const iso = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10);

test("first result with an absent practice score shows alone and no gap claim", async ({ page }) => {
  await seedRecords(page, [finishedRun("a", "solo", 6, { n: 1, practice: null })], "/result/a");
  await expect(page.getByRole("heading", { name: "Not yet" })).toBeVisible();
  await expect(page.getByRole("group", { name: "With help score" })).toContainText("Not yet");
  await expect(page.getByText("to see your first gap")).toBeVisible();
  await expect(page.getByText(/^Gap \d/)).toHaveCount(0);
});

test("first complete comparison says first gap and no change", async ({ page }) => {
  await seedRecords(page, [finishedRun("a", "solo", 6, { n: 1, practice: 9 })], "/result/a");
  await expect(page.getByText("Gap 3")).toBeVisible();
  await expect(page.getByText("Your first gap")).toBeVisible();
  await expect(page.getByText(/shrank/)).toHaveCount(0);
});

test("improved needs a smaller gap and a higher alone score; otherwise neutral", async ({ page }) => {
  const first = finishedRun("a", "solo", 5, { n: 1, practice: 9, daysAgo: 4 });
  await seedRecords(page, [first, finishedRun("b", "solo", 7, { n: 2, practice: 9 })], "/result/b");
  await expect(page.getByText(/gap shrank from 4 to 2 and your alone score rose from 5 to 7/)).toBeVisible();
  await expect(page.getByText("One more correct answer would pass")).toBeVisible();

});

test("a gap that shrinks because practice fell is not improvement", async ({ page }) => {
  const first = finishedRun("a", "solo", 5, { n: 1, practice: 9, daysAgo: 4 });
  await seedRecords(page, [first, finishedRun("c", "solo", 5, { n: 3, practice: 7 })], "/result/c");
  await expect(page.getByText(/Compared with/)).toBeVisible();
  await expect(page.getByText(/shrank/)).toHaveCount(0);
});

test("a pass shows Proved with the next check date and goes Home", async ({ page }) => {
  await seedRecords(page, [finishedRun("a", "solo", 9, { n: 1, practice: 9 }), cycle("proved", "a", iso(0), iso(3))], "/result/a");
  await expect(page.getByRole("heading", { name: /Passed/ })).toBeVisible();
  await expect(page.getByRole("img", { name: "Proved" })).toBeVisible();
  await expect(page.getByText(/Next check:/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Try anyway" })).toHaveCount(0);
  await page.getByRole("button", { name: "Back to Home" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("not yet offers Practise again and Try anyway", async ({ page }) => {
  await seedRecords(page, [finishedRun("a", "solo", 4, { n: 1, practice: 8 })], "/result/a");
  await expect(page.getByRole("img", { name: /Proved|Held|Fading/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Practise again" })).toBeVisible();
  await page.getByRole("button", { name: "Try anyway" }).click();
  await expect(page).toHaveURL(/\/solo-entry$/);
});

test("a failed recheck shows Fading and the recovery line", async ({ page }) => {
  await seedRecords(page, [finishedRun("a", "solo", 9, { n: 1, practice: 9, daysAgo: 5 }), cycle("fading", "a", iso(-5), iso(-2)), finishedRun("r", "recheck", 2, { n: 2 })], "/result/r");
  await expect(page.getByText("It slipped a bit. Practise the move, then pass 4 of 5 to restore it.")).toBeVisible();
  await expect(page.getByRole("img", { name: /Fading/ })).toBeVisible();
});

test("the misses review records a free look and changes no result", async ({ page }) => {
  await seedRecords(page, [finishedRun("a", "solo", 8, { n: 1, practice: 9 }), cycle("proved", "a", iso(0), iso(3))], "/result/a");
  await page.getByRole("button", { name: "See your misses" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Show me" }).first().click();
  await expect(page.getByText("Free look: nothing lost")).toBeVisible();
  const saved = () =>
    page.evaluate(
      () =>
        new Promise<any[]>((resolve) => {
          const open = indexedDB.open("tether");
          open.onsuccess = () => {
            const req = open.result.transaction("records").objectStore("records").getAll();
            req.onsuccess = () => resolve(req.result as any[]);
          };
        }),
    );
  await expect.poll(async () => (await saved()).filter((r) => r?.attempt?.freeLook).length).toBe(1);
  const records = await saved();
  const look = records.find((r) => r?.attempt?.freeLook).attempt;
  expect(look.completedAt).toBeUndefined();
  expect(look.help).toEqual([]);
  expect(records.find((r) => r?.run?.id === "a").run.result.score).toBe(8);
});

test("an unknown run id says result not found", async ({ page }) => {
  await seedRecords(page, [], "/result/nope");
  await expect(page.getByRole("heading", { name: "Result not found" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Home" }).click();
  await expect(page).toHaveURL(/\/$/);
});
