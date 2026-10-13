import { expect, type Page } from "@playwright/test";

/** Answers the three tutorial questions: Show me first (so tiles stay visible), then tiles in order until right. */
export async function answerTutorials(page: Page) {
  for (let q = 1; q <= 3; q++) {
    await expect(page.getByText(`${q} of 3`)).toBeVisible();
    await page.getByRole("button", { name: "Show me" }).click();
    const dialog = page.getByRole("dialog", { name: "Show me" });
    const step = dialog.getByRole("button", { name: /^(Next|Put it in yourself)$/ });
    // Beats may have auto-advanced; press whichever of Next or Put it in yourself is showing until the dialog closes.
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 4 && (await dialog.isVisible()); i++) await step.click({ timeout: 2000 }).catch(() => {});
    await expect(dialog).toHaveCount(0);
    for (let i = 0; i < 4; i++) {
      const tile = page.getByRole("radio").nth(i);
      if ((await tile.getAttribute("aria-disabled")) === "true") continue;
      await tile.click();
      await page.getByRole("button", { name: "Check" }).click();
      const next = page.getByRole("button", { name: "Next" });
      await expect(next.or(page.getByRole("button", { name: "Try again" }))).toBeVisible();
      if (await next.isVisible()) {
        await next.click();
        break;
      }
      await page.getByRole("button", { name: "Try again" }).click();
    }
  }
}
