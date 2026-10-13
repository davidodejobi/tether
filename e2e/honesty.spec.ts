import { expect, test, type Page } from "@playwright/test";
import { LEARNER, current, lastAttempt, seed, tile } from "./practice-helpers";

// Math.random is real unless a test sets window.__r, so the one-in-three verification can be forced.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const real = Math.random;
    Math.random = () => (window as any).__r ?? real();
  });
});

const NEW_LEARNER = (() => {
  const { honestyIntroSeen: _, ...rest } = LEARNER;
  return rest;
})();

const dots = (page: Page, n: number) => expect(page.getByRole("img", { name: `Readiness ${n} of 3` }).first()).toBeVisible();
const correct = async (page: Page) => {
  const q = await current(page);
  await tile(page, q.answer).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
};
/** Picks a reason with the verification sample forced: 0.1 samples it, 0.9 does not. */
const claim = async (page: Page, name: string, roll: number) => {
  await page.evaluate((r) => ((window as any).__r = r), roll);
  await page.getByRole("radio", { name }).click();
  await page.evaluate(() => delete (window as any).__r);
};
const claimMove = (page: Page, roll = 0.9) => claim(page, "I used the move", roll);
const covered = (page: Page, from: number, tapIndex: number) => page.locator(".hn-words button").nth(from + tapIndex);

test("I used the move, not sampled, adds a dot", async ({ page }) => {
  await seed(page);
  await correct(page);
  await dots(page, 0);
  await claimMove(page);
  await dots(page, 1);
  await expect(page.getByText("1 of 3 dots now.")).toBeVisible();
  const { attempt } = await lastAttempt(page, (a) => a.reason === "move");
  expect(attempt).toMatchObject({ reason: "move", verifySampled: false, freeLook: false, help: [], resets: [] });
  expect(attempt.verifyResult).toBeUndefined();
});

test("a sampled claim fills the dot only after the covered phrase is tapped", async ({ page }) => {
  await seed(page);
  await correct(page);
  await claimMove(page, 0.1);
  await expect(page.getByRole("heading", { name: "Show us. Tap the part you covered." })).toBeFocused();
  await dots(page, 0);

  // A reload while verifying brings the same prompt back; the sample is not rerolled.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Show us. Tap the part you covered." })).toBeVisible();
  const rec = await lastAttempt(page, (a) => a.verifySampled === true);
  expect(rec.attempt.verifyResult).toBeUndefined();

  await covered(page, rec.question.subject.split(" ").length, 1).click();
  await dots(page, 1);
  const done = await lastAttempt(page, (a) => !!a.verifyResult);
  expect(done.attempt).toMatchObject({ verifyResult: "passed", freeLook: false, help: [], resets: [] });
});

test("a wrong tap gives no dot and no penalty, and a free Show me", async ({ page }) => {
  await seed(page);
  await correct(page);
  await claimMove(page); // one dot first, so a penalty would show
  await dots(page, 1);
  await page.getByRole("button", { name: /^Next/ }).click();
  await correct(page);
  await claimMove(page, 0.1);
  await page.locator(".hn-words button").first().click();
  await dots(page, 1);
  await expect(page.getByText(/No dot this time, and nothing is lost/)).toBeVisible();
  const { attempt } = await lastAttempt(page, (a) => !!a.verifyResult);
  expect(attempt).toMatchObject({ verifyResult: "failed", freeLook: false, help: [], resets: [] });

  await page.getByRole("button", { name: /Show me/ }).click();
  await expect(page.getByText("Free look: nothing lost")).toBeVisible();
  await page.getByRole("button", { name: "Close Show me" }).click();
  const look = await lastAttempt(page, (a) => a.freeLook);
  expect(look.attempt).toMatchObject({ freeLook: true, help: [], resets: [], verifyResult: "failed" });
  await dots(page, 1);
});

test("It sounded right and I guessed keep the dots; Show me is a free look", async ({ page }) => {
  await seed(page);
  await correct(page);
  await claimMove(page);
  await page.getByRole("button", { name: /^Next/ }).click();

  await correct(page);
  await claim(page, "It sounded right", 0.5);
  await dots(page, 1);
  await expect(page.getByText("Your dots stay as they are.")).toBeVisible();
  await page.getByRole("button", { name: /Show me/ }).click();
  await expect(page.getByText("Free look: nothing lost")).toBeVisible();
  await page.getByRole("button", { name: "Close Show me" }).click();
  const first = await lastAttempt(page, (a) => a.reason === "sounded");
  expect(first.attempt).toMatchObject({ reason: "sounded", freeLook: true, help: [], resets: [] });
  await page.getByRole("button", { name: "Next question" }).click();

  await correct(page);
  await claim(page, "I guessed", 0.5);
  await dots(page, 1);
  const second = await lastAttempt(page, (a) => a.reason === "guessed");
  expect(second.attempt).toMatchObject({ reason: "guessed", freeLook: false, help: [], resets: [] });
});

test("three honest non-move answers offer the move once", async ({ page }) => {
  await seed(page);
  for (const reason of ["It sounded right", "I guessed"]) {
    await correct(page);
    await claim(page, reason, 0.5);
    await expect(page.getByText("Try the move next time")).toHaveCount(0);
    await page.getByRole("button", { name: /^Next/ }).click();
  }
  await correct(page);
  await claim(page, "It sounded right", 0.5);
  await expect(page.getByText("Try the move next time")).toBeVisible();
  await page.getByRole("button", { name: "Open The move" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await page.getByRole("button", { name: /^Next/ }).click();

  await correct(page);
  await claim(page, "I guessed", 0.5);
  await expect(page.getByText("Your dots stay as they are.")).toBeVisible();
  await expect(page.getByText("Try the move next time")).toHaveCount(0);
});

test("the honesty rule shows once, never again after a reload", async ({ page }) => {
  await seed(page, NEW_LEARNER);
  await correct(page);
  await expect(page.getByText("Tell us the truth and nothing is lost. Dots only come from using the move. The solo check is what proves it. Sometimes we’ll ask you to show it.")).toBeVisible();
  await expect.poll(async () => (await page.evaluate(() => new Promise((r) => { const o = indexedDB.open("tether"); o.onsuccess = () => { const g = o.result.transaction("records").objectStore("records").get("learner"); g.onsuccess = () => r(g.result.honestyIntroSeen); }; })))).toBe(true);
  await page.reload();
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
  await expect(page.getByText("Tell us the truth")).toHaveCount(0);
  await claim(page, "I guessed", 0.5);
  await page.getByRole("button", { name: /^Next/ }).click();
  await correct(page);
  await expect(page.getByText("Tell us the truth")).toHaveCount(0);
});

test("a reload on a pending reason resumes it, with no dot and the answer scored", async ({ page }) => {
  await seed(page);
  await correct(page);
  await lastAttempt(page, (a) => a.completedAt !== undefined); // saved before the reload
  await page.reload();
  await expect(page.getByRole("heading", { name: "How did you know?" })).toBeVisible();
  await dots(page, 0);
  const { attempt } = await lastAttempt(page);
  expect(attempt.reason).toBeUndefined();
  expect(attempt.correctOnCheck).toBe(1);
  await claim(page, "I guessed", 0.5);
  await page.getByRole("button", { name: /^Next/ }).click();
  await expect(page.getByText("2 of 5", { exact: true })).toBeVisible();
});

test("solo entry works not ready (Try anyway) and ready (three dots)", async ({ page }) => {
  await seed(page);
  await page.goto("/solo-entry");
  await expect(page.getByRole("heading", { name: "You're not solo-ready yet." })).toBeVisible();
  await expect(page.getByText("We recommend 3 dots first.")).toBeVisible();
  await page.getByRole("button", { name: "Try anyway" }).click();
  await expect(page).toHaveURL(/\/solo$/);
  await expect(page.getByRole("heading", { name: "Solo check is coming" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Solo check" }).click();
  await expect(page.getByRole("heading", { name: "You're not solo-ready yet." })).toBeVisible();

  await page.getByRole("button", { name: "Keep practising" }).click();
  for (let n = 1; n <= 3; n++) {
    await correct(page);
    await claimMove(page);
    await page.getByRole("button", { name: /^Next/ }).click();
  }
  await expect(page.getByRole("heading", { name: "You're solo-ready on Strip the Disguise." })).toBeVisible();
  await dots(page, 3);
  await page.getByRole("button", { name: "Keep practising" }).click();
  await expect(page.getByText("4 of 5", { exact: true })).toBeVisible();
  await page.goto("/solo-entry");
  await page.getByRole("button", { name: "Start solo checkpoint" }).click();
  await expect(page.getByRole("heading", { name: "Solo check is coming" })).toBeVisible();
});

test("the round summary offers the solo check", async ({ page }) => {
  await seed(page);
  for (let n = 1; n <= 5; n++) {
    await correct(page);
    await claim(page, "I guessed", 0.5);
    await page.getByRole("button", { name: /^Next/ }).click();
  }
  await page.getByRole("link", { name: "Solo check" }).click();
  await expect(page.getByRole("heading", { name: "You're not solo-ready yet." })).toBeVisible();
});

test("Text only shows no Bo on the nudge, correct moment, verify and summary", async ({ page }) => {
  await seed(page, { ...LEARNER, coach: "text" });
  const noBo = () => expect(page.locator("img.bo")).toHaveCount(0);
  // Question 1: a miss shows the nudge, then the helped correct moment.
  const q = await current(page);
  await tile(page, q.options.find((o: string) => o !== q.answer)!).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await noBo();
  await page.getByRole("button", { name: "Try again" }).click();
  await tile(page, q.answer).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("heading", { name: "Correct" })).toBeVisible();
  await noBo();
  await page.getByRole("button", { name: /^Next/ }).click();
  // Question 2: a sampled move claim shows the verify prompt.
  await correct(page);
  await noBo();
  await claimMove(page, 0.1);
  await expect(page.getByRole("heading", { name: "Show us. Tap the part you covered." })).toBeVisible();
  await noBo();
  await page.locator(".hn-words button").first().click();
  await page.getByRole("button", { name: /^Next/ }).click();
  // Questions 3 to 5, then the summary.
  for (let i = 0; i < 3; i++) {
    await correct(page);
    await noBo();
    await page.getByRole("radio", { name: "I guessed" }).click();
    await page.getByRole("button", { name: /^Next/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Round done" })).toBeVisible();
  await noBo();
});

test("closing while a claim is still saving never lets it be answered again on return", async ({ page }) => {
  // Saves still commit at once, but the app hears about it 1.5 s later: a slow but successful write.
  await page.addInitScript(() => {
    const d = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, "oncomplete")!;
    Object.defineProperty(IDBTransaction.prototype, "oncomplete", {
      configurable: true,
      get() {
        return d.get!.call(this);
      },
      set(fn) {
        const delay = (window as any).__slowSave;
        d.set!.call(this, fn && delay ? (e: Event) => setTimeout(() => fn.call(this, e), delay) : fn);
      },
    });
  });
  await seed(page);
  await correct(page);
  await page.evaluate(() => ((window as any).__slowSave = 1500));
  await claim(page, "I used the move", 0.1); // sampled: a verification must follow
  await page.getByRole("button", { name: "Close and come back later" }).click();
  await page.getByRole("link", { name: "Practice" }).click(); // back in, same page, while the save is landing
  await expect(page.getByText("Show us. Tap the part you covered.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "I used the move" })).toHaveCount(0);
  const { attempt } = await lastAttempt(page, (a) => a.reason === "move");
  expect(attempt).toMatchObject({ reason: "move", verifySampled: true });
  await dots(page, 0);
});
