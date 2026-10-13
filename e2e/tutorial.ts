import { expect, type Page } from "@playwright/test";

/** Answers the three tutorial questions by trying tiles in order until each is right. */
export async function answerTutorials(page: Page) {
  for (let q = 1; q <= 3; q++) {
    await expect(page.getByText(`${q} of 3`)).toBeVisible();
    for (let i = 0; i < 4; i++) {
      const tile = page.getByRole("radio").nth(i);
      if ((await tile.getAttribute("aria-disabled")) === "true") continue;
      await tile.click();
      await page.getByRole("button", { name: "Check" }).click();
      const next = page.getByRole("button", { name: "Next" });
      await expect(next.or(page.getByText("Not quite. Try again."))).toBeVisible();
      if (await next.isVisible()) {
        await next.click();
        break;
      }
    }
  }
}
