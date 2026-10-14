import { expect, test, type Page } from "@playwright/test";
import { seedRecords } from "./results-helpers";

const sep = (page: Page) => page.getByRole("separator", { name: "Resize panel" });
const panelW = async (page: Page) => (await page.locator(".hm-main").boundingBox())!.width;
const num = async (page: Page, a: string) => Number(await sep(page).getAttribute(a));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function drag(page: Page, dx: number) {
  const b = (await sep(page).boundingBox())!;
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 8 });
  await page.mouse.up();
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test("dragging resizes the panel, clamps, persists, keeps the map in view", async ({ page }) => {
    await seedRecords(page, [], "/");
    await expect(sep(page)).toBeVisible();
    await expect(sep(page)).toHaveAttribute("aria-orientation", "vertical");
    const before = await panelW(page);
    await drag(page, 120);
    const wider = await panelW(page);
    expect(wider).toBeGreaterThan(before + 100);
    expect(await num(page, "aria-valuenow")).toBe(Math.round(wider));
    await drag(page, 2000);
    expect(await panelW(page)).toBe(await num(page, "aria-valuemax"));
    await drag(page, -3000);
    expect(await panelW(page)).toBe(280);
    await drag(page, 200);
    const kept = await panelW(page);
    await page.reload();
    await expect(sep(page)).toBeVisible();
    expect(Math.abs((await panelW(page)) - kept)).toBeLessThan(1);
    await expect(page.locator("a.hm-node").first()).toBeInViewport();
    expect(await noOverflow(page)).toBe(true);
    await sep(page).dblclick();
    expect(await panelW(page)).toBe(368);
  });

  test("keyboard: arrows step 16, Home/End hit the limits, Enter resets", async ({ page }) => {
    await seedRecords(page, [], "/");
    await sep(page).focus();
    const start = await num(page, "aria-valuenow");
    await page.keyboard.press("ArrowRight");
    expect(await num(page, "aria-valuenow")).toBe(start + 16);
    await page.keyboard.press("ArrowLeft");
    expect(await num(page, "aria-valuenow")).toBe(start);
    await page.keyboard.press("End");
    expect(await num(page, "aria-valuenow")).toBe(await num(page, "aria-valuemax"));
    await page.keyboard.press("Home");
    expect(await num(page, "aria-valuenow")).toBe(await num(page, "aria-valuemin"));
    await page.keyboard.press("Enter");
    expect(await num(page, "aria-valuenow")).toBe(368);
    expect(await panelW(page)).toBe(368);
  });
});

test("no separator on a phone", async ({ page }) => {
  await seedRecords(page, [], "/");
  await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();
  await expect(sep(page)).toHaveCount(0);
});

test("tablet: splitter works where panel and map sit side by side", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await seedRecords(page, [], "/");
  await expect(sep(page)).toBeVisible();
  await sep(page).focus();
  await page.keyboard.press("Home");
  expect(await panelW(page)).toBe(280);
  expect(await noOverflow(page)).toBe(true);
  await expect(page.locator("a.hm-node").first()).toBeInViewport();
});
