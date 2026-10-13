// Rasterises the Tether mark (src/assets/icons/tether.svg) into the app icons in public/.
// Run: node tools/make-icons.ts   (uses Playwright's Chromium; commit the PNGs).
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const BG = "#0B8450"; // --bg-primary
const MARK = "#FFFFFF"; // --text-on-primary
const svg = readFileSync(new URL("../src/assets/icons/tether.svg", import.meta.url), "utf8").replaceAll("currentColor", MARK);

// `scale` is the mark's share of the icon; maskable keeps it inside the 80% safe circle.
const icons = [
  { file: "icon-192.png", size: 192, scale: 0.6 },
  { file: "icon-512.png", size: 512, scale: 0.6 },
  { file: "icon-512-maskable.png", size: 512, scale: 0.5 },
  { file: "apple-touch-icon.png", size: 180, scale: 0.6 },
  { file: "favicon.png", size: 48, scale: 0.7 },
];

const browser = await chromium.launch();
for (const { file, size, scale } of icons) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const mark = Math.round(size * scale);
  await page.setContent(
    `<body style="margin:0;width:${size}px;height:${size}px;background:${BG};display:grid;place-items:center"><div style="width:${mark}px;height:${mark}px">${svg.replace(/width="24" height="24"/, 'width="100%" height="100%"')}</div></body>`,
  );
  await page.screenshot({ path: new URL(`../public/${file}`, import.meta.url).pathname });
  await page.close();
}
await browser.close();
