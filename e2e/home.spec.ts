import { expect, test } from "@playwright/test";
import { finishedRun, seedRecords } from "./results-helpers";

const cycle = (state: string, due: string) => ({
  key: "cycle:strip-disguise",
  value: {
    moveId: "strip-disguise", timeZone: "UTC", state, earnedOn: "2026-10-01", anchor: "2026-10-01",
    entries: [{ id: "2026-10-01+3", day: 3, due, status: "scheduled" }],
    history: [{ runId: "s1", kind: "solo", on: "2026-10-01", passed: true, entryIds: [] }],
  },
});

test("a new learner's Home offers practice, solo and Settings, and Coming soon nodes do nothing", async ({ page }) => {
  await seedRecords(page, [], "/");
  await expect(page.getByRole("link", { name: "Practise Move 1" })).toHaveAttribute("href", "/practice");
  await expect(page.getByRole("link", { name: "Solo check" })).toHaveAttribute("href", "/solo-entry");
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  // Move 1 is the only working node; the other four moves and exam day are plain text.
  const map = page.getByRole("region", { name: "Journey map, scrollable" });
  await expect(map.getByRole("link")).toHaveCount(1);
  await expect(map.getByRole("button")).toHaveCount(0);
  await expect(map.getByText("Coming soon")).toHaveCount(5);
  await expect(map.getByText("Current")).toBeVisible();
  // Centred on Move 1: the scroll box has moved down towards the bottom of the art.
  expect(await map.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await expect(page.getByText("No gap yet.")).toBeVisible();
});

test("the map art loads lazily and the screen works without it", async ({ page }) => {
  await page.route("**/*.svg", (r) => (r.request().url().includes("/map/") || /day|night/.test(r.request().url()) ? r.abort() : r.continue()));
  await seedRecords(page, [], "/");
  await expect(page.getByRole("link", { name: "Practise Move 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Move 1: Strip/ })).toBeVisible();
});

test("a due recheck is the primary action, shown as Held with a Due badge and dated like the result page", async ({ page }) => {
  await seedRecords(page, [finishedRun("s1", "solo", 6, { n: 1, practice: 10 }), cycle("held", "2026-10-04")], "/");
  await expect(page.getByRole("link", { name: "Start recheck" })).toHaveAttribute("href", "/recheck-entry");
  await expect(page.getByRole("link", { name: /Move 1.*Held, due/ })).toBeVisible();
  await expect(page.getByText("Latest gap: 4")).toBeVisible();
  await expect(page.getByRole("link", { name: "Solo check" })).toBeVisible();
  await page.goto("/?demo=2026-10-02");
  await expect(page.getByText("First recheck")).toHaveCount(0); // held: nothing due yet, so the next date is shown
  await expect(page.getByText("Next recheck: 4 Oct 2026")).toBeVisible();
  await expect(page.getByText(/\d{4}-\d{2}-\d{2}/)).toHaveCount(0);
});

test("a fading move offers recovery", async ({ page }) => {
  await seedRecords(page, [finishedRun("s1", "solo", 9, { n: 1, practice: 9 }), cycle("fading", "2026-10-04")], "/");
  await expect(page.getByRole("link", { name: "Practise to recover" })).toHaveAttribute("href", "/practice");
  await expect(page.getByRole("link", { name: /Move 1.*Fading/ })).toBeVisible();
  await expect(page.getByText("No help gap on your latest solo check")).toBeVisible();
});

for (const [name, width, height] of [["phone", 360, 800], ["tablet", 768, 1024], ["laptop", 1366, 768]] as const) {
  test(`Settings is reachable from Home on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await seedRecords(page, [], "/");
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
