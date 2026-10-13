import { expect, test } from "@playwright/test";
import { current, leave, seed, tile } from "./practice-helpers";

test("five questions with a miss, summary, Another 5, reload and Done", async ({ page }) => {
  await seed(page);
  await expect(page.getByText("1 of 5", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check" })).toBeDisabled();

  for (let n = 1; n <= 5; n++) {
    await expect(page.getByRole("button", { name: "Check" })).toBeVisible();
    await expect(page.getByText(`${n} of 5`, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Check" })).toBeDisabled();
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    const q = await current(page);
    if (n === 2) {
      const wrong = q.options.find((o) => o !== q.answer)!;
      await tile(page, wrong).click();
      await page.getByRole("button", { name: "Check" }).click();
      await expect(page.getByText("Not quite. Try again.")).toBeVisible();
      await expect(page.getByRole("radio", { name: /struck out/ })).toHaveCount(1);
      await expect(page.getByRole("button", { name: "Check" })).toBeDisabled();
    }
    await tile(page, q.answer).click();
    await page.getByRole("button", { name: "Check" }).click();
    await leave(page);
  }

  await expect(page.getByRole("heading", { name: "Round done" })).toBeVisible();
  await expect(page.getByText("4 of 5 right on the first try.")).toBeVisible();

  await page.getByRole("button", { name: "Another 5" }).click();
  await expect(page.getByText("1 of 5", { exact: true })).toBeVisible();

  // Reload mid-question: the same question and options come back, and the struck tile (if any) stays struck.
  const before = await current(page);
  const wrong = before.options.find((o) => o !== before.answer)!;
  await tile(page, wrong).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("radio", { name: /struck out/ })).toHaveCount(1);
  const labels = await page.getByRole("radio").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  await page.reload();
  await expect(page.getByText("1 of 5", { exact: true })).toBeVisible();
  expect(await page.getByRole("radio").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).toEqual(labels);

  await page.getByRole("button", { name: "Close and come back later" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("link", { name: "Practice" }).click();
  await expect(page.getByText("1 of 5", { exact: true })).toBeVisible();
  expect(await page.getByRole("radio").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).toEqual(labels);
});

test("Done for today returns to Home", async ({ page }) => {
  await seed(page);
  for (let n = 1; n <= 5; n++) {
    await expect(page.getByRole("button", { name: "Check" })).toBeVisible();
    const q = await current(page);
    await tile(page, q.answer).click();
    await page.getByRole("button", { name: "Check" }).click();
    await leave(page);
  }
  await page.getByRole("button", { name: "Done for today" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("the move sheet opens without counting as help, and keys select and check", async ({ page }) => {
  await seed(page);
  await page.getByRole("button", { name: /The move: Strip the Disguise/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const q = await current(page);
  await page.keyboard.press(String(q.options.indexOf(q.answer) + 1));
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
});

test("with no learner, practice starts onboarding", async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
});
