import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { cycle, finishedRun, seedRecords } from "./results-helpers";

const iso = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
const passed = () => [finishedRun("a", "solo", 9, { n: 1, practice: 9 }), cycle("proved", "a", iso(0), iso(3))];

test("a passed solo offers Share proof", async ({ page }) => {
  await seedRecords(page, passed(), "/result/a");
  await expect(page.getByRole("button", { name: "Share proof" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share progress" })).toHaveCount(0);
});

test("a not-yet result with an improved gap offers only Share progress", async ({ page }) => {
  await seedRecords(page, [finishedRun("a", "solo", 5, { n: 1, practice: 9, daysAgo: 4 }), finishedRun("b", "solo", 7, { n: 2, practice: 9 })], "/result/b");
  await expect(page.getByRole("button", { name: "Share progress" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share proof" })).toHaveCount(0);
});

test("a failed recheck offers no share entry", async ({ page }) => {
  await seedRecords(page, [finishedRun("a", "solo", 9, { n: 1, practice: 9, daysAgo: 10 }), cycle("fading", "a", iso(-10), iso(-7)), finishedRun("r", "recheck", 2, { n: 2 })], "/result/r");
  await expect(page.getByRole("heading", { name: "Not yet" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Share/ })).toHaveCount(0);
});

test("laptop shows Download and Copy, never a share button, and the card downloads as a PNG", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => Object.assign(navigator, { share: () => Promise.resolve(), canShare: () => true }));
  await seedRecords(page, passed(), "/share/a?kind=proof");
  await expect(page.locator("img.sh-card")).toBeVisible();
  await expect(page.getByRole("button", { name: "Share", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy text" })).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download card" }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  const bytes = readFileSync((await download.path())!);
  expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
});

test("cancelling the phone share sheet leaves the page usable and says nothing alarming", async ({ page }) => {
  await page.addInitScript(() => Object.assign(navigator, { canShare: () => true, share: () => Promise.reject(new DOMException("cancelled", "AbortError")) }));
  await seedRecords(page, passed(), "/share/a?kind=proof");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("");
  await expect(page.getByRole("button", { name: "Download card" })).toBeEnabled();
  await page.getByRole("button", { name: "Back to result" }).click();
  await expect(page.getByRole("heading", { name: /Proved/ })).toBeVisible();
});

test("the preview and download work offline, with a connection note", async ({ page, context }) => {
  await seedRecords(page, passed(), "/share/a?kind=proof");
  await context.setOffline(true);
  await expect(page.getByText(/may need a connection/)).toBeVisible();
  await expect(page.locator("img.sh-card")).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download card" }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
});
