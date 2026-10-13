import { expect, test } from "@playwright/test";
import { seedLearner } from "../e2e-screens/screens";

// No horizontal scroll at the phone, tablet and laptop widths (docs/spec.md section 14).
for (const width of [360, 768, 1280, 1366]) {
  test(`no horizontal scroll at ${width}px on Welcome and Home`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    await page.goto("/");
    await page.getByRole("button", { name: "Start" }).waitFor();
    expect(await fits()).toBe(true);
    await seedLearner(page, "/");
    await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();
    expect(await fits()).toBe(true);
    // The rail shows only from 1280 px.
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible({ visible: width >= 1280 });
  });
}
