import { expect, test } from "@playwright/test";
import { LEARNER, current, lastAttempt, leave, seed, tile } from "./practice-helpers";

test("five questions with a miss, summary, Another 5, reload and Done", async ({ page }) => {
  await seed(page);
  await expect(page.getByText("1 of 5", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check" })).toBeDisabled();

  for (let n = 1; n <= 5; n++) {
    await expect(page.getByRole("button", { name: "Check" })).toBeVisible();
    await expect(page.getByText(`${n} of 5`, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Check" })).toBeDisabled();
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    const q = await current(page);
    if (n === 2) {
      const wrong = q.options.find((o) => o !== q.answer)!;
      await tile(page, wrong).click();
      await page.getByRole("button", { name: "Check" }).click();
      await expect(page.getByText("Cover the side phrase and read it again.")).toBeVisible();
      await expect(page.getByRole("radio", { name: /struck out/ })).toHaveCount(1);
      await expect(page.getByRole("button", { name: "Check" })).toBeDisabled();
    }
    await tile(page, q.answer).click();
    await page.getByRole("button", { name: "Check" }).click();
    await leave(page);
  }

  await expect(page.getByRole("heading", { name: "Round done" })).toBeVisible();
  await expect(page.getByText("4 of 5 right on the first try.")).toBeVisible();

  await page.getByRole("button", { name: "Another 5" }).click();
  await expect(page.getByText("1 of 5", { exact: true })).toBeVisible();

  // Reload mid-question: the same question and options come back, and the struck tile (if any) stays struck.
  const before = await current(page);
  const wrong = before.options.find((o) => o !== before.answer)!;
  await tile(page, wrong).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("radio", { name: /struck out/ })).toHaveCount(1);
  const labels = await page.getByRole("radio").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  await page.reload();
  await expect(page.getByText("1 of 5", { exact: true })).toBeVisible();
  expect(await page.getByRole("radio").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).toEqual(labels);

  await page.getByRole("button", { name: "Close and come back later" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("link", { name: /^Stage 1, Move 1/ }).click();
  await expect(page.getByText("1 of 5", { exact: true })).toBeVisible();
  expect(await page.getByRole("radio").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).toEqual(labels);
});

test("Done for today returns to Home", async ({ page }) => {
  await seed(page);
  for (let n = 1; n <= 5; n++) {
    await expect(page.getByRole("button", { name: "Check" })).toBeVisible();
    const q = await current(page);
    await tile(page, q.answer).click();
    await page.getByRole("button", { name: "Check" }).click();
    await leave(page);
  }
  await page.getByRole("button", { name: "Done for today" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("the move sheet opens without counting as help, and keys select and check", async ({ page }) => {
  await seed(page);
  await page.getByRole("button", { name: /The move: Strip the Disguise/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  // The lesson example is its own sentence, never this question's. Its verb is hidden when this question uses the same verb.
  const q = await current(page);
  const sheet = await page.getByRole("dialog").innerText();
  expect(sheet).toContain("Example: Chidi, as well as his friends,");
  expect(sheet).toContain("in the hall.");
  if (q.options.some((o: string) => o === "is" || o === "are")) expect(sheet).toContain("___");
  else expect(sheet).toContain("is in the hall.");
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const { attempt } = await lastAttempt(page, (a) => a.moveSheetOpened === true);
  expect(attempt).toMatchObject({ help: [], resets: [] });
  await page.keyboard.press(String(q.options.indexOf(q.answer) + 1));
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
});

test("with no learner, practice starts onboarding", async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
});

// A stub speech engine records what is spoken and with which voice.
const stubSpeech = (page: import("@playwright/test").Page, voices: { lang: string }[]) =>
  page.addInitScript((voices) => {
    (window as any).spoken = [];
    (window as any).SpeechSynthesisUtterance = class { text: string; voice: any; lang = ""; constructor(t: string) { this.text = t; } };
    Object.defineProperty(window, "speechSynthesis", {
      value: { getVoices: () => voices, cancel() {}, speak: (u: any) => (window as any).spoken.push({ text: u.text, voice: u.voice?.lang ?? null, lang: u.lang }), addEventListener() {}, removeEventListener() {} },
    });
  }, voices);

test("Pidgin coach text uses a pcm voice, then en-NG, and says so when it falls back to English", async ({ page }) => {
  await stubSpeech(page, [{ lang: "en-US" }, { lang: "pcm" }]);
  await seed(page, { ...LEARNER, lang: "pcm" });
  await page.getByRole("button", { name: /The move: Strip the Disguise/ }).click();
  await expect(page.getByText(/^Read in /)).toHaveCount(0);
  await page.getByRole("button", { name: "Read it to me" }).click();
  expect(await page.evaluate(() => (window as any).spoken.at(-1).voice)).toBe("pcm");
});

test("Pidgin falls back to a labelled English voice when no pcm or en-NG voice exists", async ({ page }) => {
  await stubSpeech(page, [{ lang: "en-US" }]);
  await seed(page, { ...LEARNER, lang: "pcm" });
  await page.getByRole("button", { name: /The move: Strip the Disguise/ }).click();
  await expect(page.getByText("Read in an English voice")).toBeVisible();
  await page.getByRole("button", { name: "Read it to me" }).click();
  expect(await page.evaluate(() => (window as any).spoken.at(-1).voice)).toBe("en-US");
});

test("with no voices loaded, Pidgin asks for Nigerian English, as its label says", async ({ page }) => {
  await stubSpeech(page, []);
  await seed(page, { ...LEARNER, lang: "pcm" });
  await page.getByRole("button", { name: /The move: Strip the Disguise/ }).click();
  await expect(page.getByText("Read in an English voice")).toBeVisible();
  await page.getByRole("button", { name: "Read it to me" }).click();
  expect(await page.evaluate(() => (window as any).spoken.at(-1))).toMatchObject({ voice: null, lang: "en-NG" });
});
