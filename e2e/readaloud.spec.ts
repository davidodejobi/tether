import { expect, test, type Page } from "@playwright/test";
import { LEARNER } from "./practice-helpers";
import { seedRecords } from "./results-helpers";

// A recording speechSynthesis with one en-NG voice. __spoken holds each utterance's text and lang; __cancels counts cancel() calls.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__spoken = [];
    w.__cancels = 0;
    const voice = { lang: "en-NG", name: "Test NG", default: true, localService: true, voiceURI: "ng" };
    w.SpeechSynthesisUtterance = class { text: string; lang = ""; voice: unknown = null; constructor(t: string) { this.text = t; } };
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speaking: false, pending: false,
        getVoices: () => [voice],
        speak: (u: { text: string; lang: string }) => w.__spoken.push({ text: u.text, lang: u.lang }),
        cancel: () => { w.__cancels++; },
        addEventListener() {}, removeEventListener() {},
      },
    });
  });
});

const spoken = (page: Page) => page.evaluate(() => (window as any).__spoken as { text: string; lang: string }[]);
const home = (page: Page, learner: object) => seedRecords(page, [], "/").then(() => page.evaluate((l) => new Promise<void>((res) => {
  const open = indexedDB.open("tether");
  open.onsuccess = () => { const tx = open.result.transaction("records", "readwrite"); tx.objectStore("records").put(l, "learner"); tx.oncomplete = () => res(); };
}), learner)).then(() => page.goto("/"));

test("read-aloud on: the Home coach line is spoken once, in English", async ({ page }) => {
  await home(page, { ...LEARNER, readAloud: true });
  await expect(page.getByText("Start with Move 1.")).toBeVisible();
  await expect.poll(() => spoken(page)).toEqual([{ text: "Start with Move 1.", lang: "en-NG" }]);
  await page.waitForTimeout(500);
  expect(await spoken(page)).toHaveLength(1);
});

test("Pidgin with no pcm voice is read in en-NG", async ({ page }) => {
  await home(page, { ...LEARNER, readAloud: true, lang: "pcm" });
  await expect.poll(async () => (await spoken(page)).map((s) => s.lang)).toEqual(["en-NG"]);
});

test("read-aloud off (the default): nothing is spoken", async ({ page }) => {
  await home(page, LEARNER);
  await expect(page.getByText("Start with Move 1.")).toBeVisible();
  await page.waitForTimeout(500);
  expect(await spoken(page)).toEqual([]);
});

test("leaving the screen cancels speech", async ({ page }) => {
  await home(page, { ...LEARNER, readAloud: true });
  await expect.poll(() => spoken(page)).toHaveLength(1);
  const before = await page.evaluate(() => (window as any).__cancels as number);
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__cancels as number)).toBeGreaterThan(before);
});

test("a solo run speaks nothing", async ({ page }) => {
  await home(page, { ...LEARNER, readAloud: true, sounds: true });
  await expect.poll(() => spoken(page)).toHaveLength(1);
  await page.evaluate(() => ((window as any).__spoken.length = 0));
  await page.goto("/run/solo");
  await expect(page.getByRole("radio").first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(await spoken(page)).toEqual([]);
});
