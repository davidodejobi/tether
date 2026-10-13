import { expect, test, type Page } from "@playwright/test";
import { current, lastAttempt, records, seed, tile } from "./practice-helpers";

// IndexedDB writes fail while window.__failWrites is true (the open probe runs before it is set).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: [any, any?]) {
      if ((window as any).__failWrites) throw new DOMException("simulated write failure", "QuotaExceededError");
      return put.apply(this, args);
    };
  });
});
const failWrites = (page: Page, on: boolean) => page.evaluate((v) => ((window as any).__failWrites = v), on);
const alert = (page: Page) => page.getByRole("alert").filter({ hasText: "Couldn't save this answer" });

test("a failed save keeps the screen, blocks everything, and Retry saves the same batch", async ({ page }) => {
  await seed(page);
  const q = await current(page);

  // 1. Check fails: nothing advances, Retry appears, controls are blocked.
  await tile(page, q.answer).click();
  await failWrites(page, true);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(alert(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeEnabled();
  await expect(page.getByRole("radio", { name: "I guessed" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Next/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Check" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Show me" })).toBeDisabled();
  await expect(page.getByRole("radio").first()).toHaveAttribute("aria-disabled", "true");
  await failWrites(page, false);
  expect((await records(page)).at(-1).attempt.checks).toBe(0);

  // 2. Retry saves the same check; a reload restores the pending reason prompt.
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
  await lastAttempt(page, (a) => a.checks === 1 && a.completedAt !== undefined);
  await page.reload();
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();

  // 3. A failed reason keeps the prompt, blocks its choices, and is not claimed as saved.
  await failWrites(page, true);
  await page.getByRole("radio", { name: "I guessed" }).click();
  await expect(alert(page)).toBeVisible();
  await expect(page.getByText("Thanks for telling us.")).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "It sounded right" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /^Next/ })).toHaveCount(0);
  await failWrites(page, false);
  expect((await records(page)).at(-1).attempt.reason).toBeUndefined();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Thanks for telling us.")).toBeVisible();
  await lastAttempt(page, (a) => a.reason === "guessed");

  // 4. A failed free look blocks Next until it is retried.
  await failWrites(page, true);
  await page.getByRole("button", { name: "Show me, free look" }).click();
  await expect(alert(page)).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Show me" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Next/ })).toBeDisabled();
  await failWrites(page, false);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("dialog", { name: "Show me" })).toBeVisible();
  await page.getByRole("button", { name: "Close Show me" }).click();
  await expect(page.getByRole("button", { name: /^Next/ })).toBeEnabled();
  await lastAttempt(page, (a) => a.freeLook === true);
});
