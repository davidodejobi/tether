import { expect, test } from "@playwright/test";
import { current, seed, tile } from "./practice-helpers";

// Spec section 14: no horizontal scrolling at the target widths, on the question and on the correct moment.
const noScroll = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const [width, height] of [[360, 800], [768, 1024], [1280, 720], [1366, 768]] as const)
  test(`no horizontal scroll at ${width}: practice and the correct moment`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await seed(page);
    await expect(page.getByRole("button", { name: "Check" })).toBeVisible();
    expect(await noScroll(page)).toBe(true);
    await tile(page, (await current(page)).answer).click();
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
    expect(await noScroll(page)).toBe(true);
  });

test("laptop: Show me plays inline, Enter goes on, and keys 1-3 pick a reason", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await seed(page);
  await current(page);
  await page.getByRole("button", { name: "Show me" }).first().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".sm-inline")).toBeVisible();
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Step 2 of 3")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sm-inline")).toHaveCount(0);
});

test("laptop: key 2 picks It sounded right", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await seed(page);
  await tile(page, (await current(page)).answer).click();
  await page.getByRole("button", { name: "Check" }).click();
  // The reasons stay locked until the checked answer has saved; a key press before that is rightly ignored.
  await expect(page.getByRole("radio", { name: "It sounded right" })).toBeEnabled();
  await page.keyboard.press("2");
  await expect(page.getByText("Thanks for telling us.")).toBeVisible();
});
