import { expect, test, type Page } from "@playwright/test";

// Browser behaviour that claimWriter (src/platform/storage.ts) relies on. Its wait-and-give-up logic is unit tested.
// A separate lock name, because the app itself holds "tether-writer" once it loads.
const take = (page: Page, wait: boolean) =>
  page.evaluate(
    (wait) =>
      new Promise<boolean>((resolve) => {
        const hold = () => {
          resolve(true);
          return new Promise<void>(() => {});
        };
        if (wait) void navigator.locks.request("e2e-writer", hold);
        else void navigator.locks.request("e2e-writer", { ifAvailable: true }, (lock) => (lock ? hold() : resolve(false)));
      }),
    wait,
  );

test("a reloaded page gets the writer lock back", async ({ page }) => {
  await page.goto("/");
  expect(await take(page, true)).toBe(true);
  for (let i = 0; i < 5; i++) {
    await page.reload();
    expect(await take(page, true)).toBe(true);
  }
});

test("a second tab cannot take the lock the first tab holds", async ({ page, context }) => {
  await page.goto("/");
  expect(await take(page, true)).toBe(true);
  const other = await context.newPage();
  await other.goto("/");
  expect(await take(other, false)).toBe(false);
});
