import { test } from "@playwright/test";
import { seedRecords } from "../e2e/results-helpers";

// Records the bus driving on Home's map (phone and laptop sizes). Only when MAP_VIDEO_DIR is set:
//   MAP_VIDEO_DIR=/some/dir SCREENS_PORT=4278 npx playwright test -c playwright.screens.config.ts map-video
const DIR = process.env.MAP_VIDEO_DIR;

for (const [name, width, height] of [["phone", 360, 800], ["laptop", 1366, 768]] as const)
  test(`record the bus on the map (${name})`, async ({ browser }) => {
    test.skip(!DIR, "set MAP_VIDEO_DIR to record");
    const context = await browser.newContext({ viewport: { width, height }, recordVideo: { dir: DIR!, size: { width, height } } });
    const page = await context.newPage();
    await seedRecords(page, [], "/");
    // A fresh device: the bus starts at the Start gate, so reloading shows the drive to stage 1.
    await page.evaluate(() => localStorage.removeItem("tether.map.bus"));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(3500);
    const map = page.getByRole("region", { name: "Journey map" });
    // Scroll up the trail like a player, then jump back to the stage.
    for (let i = 0; i < 24; i++) {
      await map.evaluate((el) => el.scrollBy(0, -70));
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Jump to my stage" }).click();
    await page.waitForTimeout(1500);
    const video = page.video()!;
    await context.close();
    await video.saveAs(`${DIR}/map-bus-${name}.webm`);
  });
