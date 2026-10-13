import { expect, test } from "@playwright/test";

test("home, settings and unknown routes render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  await page.goto("/nope");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
