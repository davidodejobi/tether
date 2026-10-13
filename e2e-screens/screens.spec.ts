import { test } from "@playwright/test";
import { SCREENS } from "./screens";

// Each screen in light, dark and reduced motion (light theme). Output: screenshots/<name>-<variant>.png
const VARIANTS = [
  { name: "light", colorScheme: "light", reducedMotion: "no-preference" },
  { name: "dark", colorScheme: "dark", reducedMotion: "no-preference" },
  { name: "reduced", colorScheme: "light", reducedMotion: "reduce" },
] as const;

for (const s of SCREENS) {
  for (const v of VARIANTS) {
    test(`${s.name} ${v.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: s.width ?? 360, height: s.height ?? 800 },
        colorScheme: v.colorScheme,
        reducedMotion: v.reducedMotion,
      });
      const page = await context.newPage();
      await page.goto(s.path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `screenshots/${s.name}-${v.name}.png`, fullPage: true, animations: "disabled" });
      await context.close();
    });
  }
}
