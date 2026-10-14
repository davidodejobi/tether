import { expect, test, type Page } from "@playwright/test";
import { point } from "../src/rules/practice.ts";
import { stripDisguise as pack } from "../src/content/strip-disguise.ts";
import { current, lastAttempt, records, tile } from "./practice-helpers";
import { activeRun, answer, heading, hide, idb, runs } from "./run-helpers";
import { answerTutorials } from "./tutorial";

// Whole-product learner journeys (roadmap step 18, part A). Each starts from a fresh browser and is driven only through the UI.
// Reads of IndexedDB are for evidence (and for the answer key, which the UI never shows before Check); nothing is seeded.
// The one thing that cannot be done by hand is the passing of days, so the recheck journeys use page.clock.

// Math.random is real unless a test sets window.__r, so the one-in-three verification can be forced off (0.9) or on (0.1).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const real = Math.random;
    Math.random = () => (window as any).__r ?? real();
  });
});

const dots = (page: Page, n: number) => expect(page.getByRole("img", { name: `Readiness ${n} of 3` }).first()).toBeVisible();
const home = (page: Page) => expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();

/** Welcome, nickname, lesson, three tutorial questions, first win. Stops on the First win screen. */
async function toFirstWin(page: Page, nickname = "Amaka") {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname").fill(nickname);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Start Move 1" }).click();
  await expect(page.getByRole("heading", { name: /Cover the side phrase/ })).toBeFocused();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /Got it/ }).click();
  await answerTutorials(page);
  await expect(page.getByRole("heading", { name: "First win" })).toBeFocused();
}
/** The fast road to Home for journeys that are about something later: skip the optional setup. */
async function onboard(page: Page) {
  await toFirstWin(page);
  await page.getByRole("button", { name: "Skip for now" }).click();
  await home(page);
}

/** Picks a reason with the verification sample forced off (0.9) or on (0.1). */
async function claim(page: Page, name: string, roll = 0.9) {
  await page.evaluate((r) => ((window as any).__r = r), roll);
  await page.getByRole("radio", { name }).click();
  await page.evaluate(() => delete (window as any).__r);
}
/** Answers the open practice question right, unaided, and gives a reason. */
async function rightWith(page: Page, reason: string) {
  const q = await current(page);
  await tile(page, q.answer).click();
  await page.getByRole("button", { name: "Check" }).click();
  await claim(page, reason);
}
const nextQ = (page: Page) => page.getByRole("button", { name: /^Next/ }).click();
const miss = async (page: Page, n = 0) => {
  const q = await current(page);
  await tile(page, q.options.filter((o) => o !== q.answer)[n]!).click();
  await page.getByRole("button", { name: "Check" }).click();
};
const right = async (page: Page) => {
  const q = await current(page);
  await tile(page, q.answer).click();
  await page.getByRole("button", { name: "Check" }).click();
};

/** From Home: `count` unaided right answers, each claiming the move, in rounds of five. Ends on the last summary. */
async function practise(page: Page, count: number) {
  await page.getByRole("link", { name: "Practise Move 1" }).click();
  for (let i = 1; i <= count; i++) {
    await rightWith(page, "I used the move");
    await nextQ(page);
    if (i === 3) {
      await expect(page.getByRole("heading", { name: "You're solo-ready on Strip the Disguise." })).toBeVisible();
      await page.getByRole("button", { name: "Keep practising" }).click();
    }
    if (i % 5 === 0 && i < count) await page.getByRole("button", { name: "Another 5" }).click();
  }
  await expect(page.getByRole("heading", { name: "Round done" })).toBeVisible();
}

/** From Home: open the solo entry, press the start button it offers (Start when ready, Try anyway when not), answer `rights` of ten. */
async function solo(page: Page, rights: number) {
  await page.getByRole("link", { name: "Solo check" }).click();
  await page.getByRole("button", { name: /^(Start solo checkpoint|Try anyway)$/ }).click();
  for (let n = 1; n <= 10; n++) await answer(page, n <= rights, n);
  await expect(page).toHaveURL(/\/result\/run-/);
}
const toHome = async (page: Page) => {
  await page.getByRole("button", { name: "Back to Home" }).click();
  await expect(page).toHaveURL(/\/$/);
};
const cycle = async (page: Page) => (await idb(page, (rows) => rows.filter(([k]) => String(k).startsWith("cycle:")).map(([, v]) => v)))[0] as any;

test("1. a new learner: onboarding, lesson, tutorials, first win, settings, Home, first practice question", async ({ page }) => {
  await toFirstWin(page);
  await page.getByRole("button", { name: "Make Tether yours" }).click();
  await page.getByText("Text only").click();
  await page.getByText("Pidgin").click();
  await page.getByRole("button", { name: "Done" }).click();
  await home(page);

  // Tutorials are saved, but as tutorial attempts: they add no practice score, dots or claim measurements.
  expect((await records(page)).filter((r) => r.attempt.origin !== "tutorial")).toHaveLength(0);
  await page.getByRole("button", { name: "More" }).click(); // the placeholder lives in More on phone
  await expect(page.getByText("No gap yet. Take your first solo check.")).toBeVisible();

  await page.getByRole("link", { name: "Practise Move 1" }).click();
  await expect(page.getByText("1 of 5", { exact: true })).toBeVisible();
  await dots(page, 0);
  await expect(page.locator("img.bo")).toHaveCount(0); // Text only was chosen
  await right(page);
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible(); // the honesty prompt follows a clean answer
  await expect(page.getByText("Tell us the truth and nothing is lost.")).toBeVisible(); // shown once, to this new learner
  const { attempt } = await lastAttempt(page, (a) => a.completedAt !== undefined);
  expect(attempt).toMatchObject({ checks: 1, correctOnCheck: 1, help: [] });
});

test("2. helped practice: nudge, Try again, Show me, Put it in yourself, then correct counts as with help", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); // Show me is stepped with Next
  await onboard(page);
  await page.getByRole("link", { name: "Practise Move 1" }).click();

  // Q1 clean: one dot.
  await rightWith(page, "I used the move");
  await dots(page, 1);
  await nextQ(page);

  // Q2: miss, nudge, Try again, miss, Show me, step through, Put it in yourself, right.
  await miss(page, 0);
  await expect(page.getByText(pack.coach.en.nudge)).toBeVisible();
  await dots(page, 0); // the first miss resets the dots
  await page.getByRole("button", { name: "Try again" }).click();
  await miss(page, 1);
  await page.getByRole("button", { name: "Show me" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Show me" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();
  await dialog.getByRole("button", { name: "Next" }).click();
  await dialog.getByRole("button", { name: "Put it in yourself" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(/Help counts as with help/)).toBeVisible();
  await right(page);
  await expect(page.getByRole("radio", { name: "I guessed" })).toHaveCount(0); // a helped answer is not asked how it was known
  await dots(page, 0);
  const helped = await lastAttempt(page, (a) => a.completedAt !== undefined);
  expect(helped.attempt.help).toEqual(["nudge", "showMe"]);
  expect(point(helped.attempt)).toBe(0);
  await nextQ(page);

  // Q3: one miss then right on the second try: one point, still no honesty prompt, dots stay at zero.
  await miss(page);
  await page.getByRole("button", { name: "Try again" }).click();
  await right(page);
  await expect(page.getByRole("radio", { name: "I guessed" })).toHaveCount(0);
  const second = await lastAttempt(page, (a) => a.completedAt !== undefined);
  expect(second.attempt.help).toEqual(["nudge"]);
  expect(point(second.attempt)).toBe(1);
  await dots(page, 0);
  await nextQ(page);

  // Q4 and Q5 clean; the summary counts first tries only.
  for (let i = 0; i < 2; i++) {
    await rightWith(page, "I used the move");
    await nextQ(page);
  }
  await expect(page.getByText("3 of 5 right on the first try.")).toBeVisible();
});

test("3. honest answers: guessed and sounded right never make a clean solo-ready answer", async ({ page }) => {
  await onboard(page);
  await page.getByRole("link", { name: "Practise Move 1" }).click();
  for (const reason of ["I guessed", "It sounded right", "I guessed"]) {
    await rightWith(page, reason);
    await dots(page, 0);
    await expect(page.getByText("Your dots stay as they are.")).toBeVisible();
    const last = await lastAttempt(page, (a) => a.reason !== undefined);
    expect(last.attempt).toMatchObject({ correctOnCheck: 1, help: [], resets: [] }); // honest, and nothing is lost
    expect(last.attempt.reason).not.toBe("move");
    await nextQ(page);
  }
  // Three right answers, but none used the move: not solo-ready, nothing hinted at "ready".
  await expect(page.getByRole("heading", { name: "You're solo-ready on Strip the Disguise." })).toHaveCount(0);
  await page.goto("/solo-entry");
  await expect(page.getByRole("heading", { name: "You're not solo-ready yet." })).toBeVisible();
  await expect(page.getByText("We recommend 3 dots first.")).toBeVisible();
  await page.getByRole("button", { name: "Keep practising" }).click();

  // The same answer with a move claim does earn a dot.
  await rightWith(page, "I used the move");
  await dots(page, 1);
});

test("4. solo pass: build readiness, 8 of 10, Proved on the result, stamp and first recheck on Home", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-14T10:00:00+01:00") });
  await onboard(page);
  await practise(page, 10);
  await dots(page, 3);
  await page.getByRole("link", { name: "Solo check" }).click();
  await expect(page.getByRole("heading", { name: "You're solo-ready on Strip the Disguise." })).toBeVisible();
  await page.getByRole("button", { name: "Start solo checkpoint" }).click();
  for (let n = 1; n <= 10; n++) await answer(page, n <= 8, n);
  await expect(page).toHaveURL(/\/result\/run-/);

  await expect(page.getByRole("heading", { name: "Passed. You are Proved." })).toBeVisible();
  await expect(page.getByRole("img", { name: "Proved" })).toBeVisible();
  await expect(page.getByRole("group", { name: "With help score" })).toContainText("10");
  await expect(page.getByText("Gap 2")).toBeVisible();
  await expect(page.getByText("Your first gap")).toBeVisible();
  await expect(page.getByText("Next check: 17 Oct 2026.")).toBeVisible();
  await toHome(page);

  const proof = page.getByRole("region", { name: "Your proof" });
  await expect(proof.getByRole("img", { name: "Proved" })).toBeVisible();
  await expect(proof.getByText("First recheck: 17 Oct 2026")).toBeVisible();
  await expect(page.getByText("Latest gap: 2")).toBeVisible();
  await dots(page, 0); // dots reset when the genuine run began
});

test("5. solo fail: 7 of 10 says one more would pass and gives no proof", async ({ page }) => {
  await onboard(page);
  await solo(page, 7); // Try anyway: solo is open at any readiness
  await expect(page.getByRole("heading", { name: "Not yet" })).toBeVisible();
  await expect(page.getByText("One more correct answer would pass")).toBeVisible();
  await expect(page.getByRole("img", { name: /Proved|Held|Fading/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Share proof/ })).toHaveCount(0);
  expect((await runs(page))[0].run.result).toMatchObject({ score: 7, passed: false });
  expect(await cycle(page)).toBeUndefined();
  await page.getByRole("button", { name: "Back to Home" }).click();
  await expect(page.getByText("Alone: 7 of 10")).toBeVisible();
  await expect(page.getByRole("region", { name: "Your proof" }).getByRole("img")).toHaveCount(0);
});

test("6. interruptions: a short absence welcomes back, a long one converts, Leave returns Home", async ({ page }) => {
  await page.clock.install();
  await onboard(page);
  await page.getByRole("link", { name: "Solo check" }).click();
  await page.getByRole("button", { name: "Try anyway" }).click();
  await answer(page, true, 1);
  await answer(page, false, 2);
  await expect(heading(page, 3)).toBeVisible();

  await hide(page, true);
  await page.clock.fastForward(5000);
  await hide(page, false);
  await expect(page.getByText("Welcome back. Your solo run is still on.")).toBeVisible();
  await expect(heading(page, 3)).toBeVisible();

  await hide(page, true);
  await page.clock.fastForward(12_000);
  await hide(page, false);
  await expect(page.getByRole("heading", { name: "You were away too long" })).toBeVisible();
  expect((await runs(page))[0].run).toMatchObject({ status: "converted" });
  expect((await runs(page))[0].run.result).toBeUndefined();
  expect(await cycle(page)).toBeUndefined();

  // A fresh run, then Leave: Keep going stays, Leave converts what was answered and goes Home.
  await page.getByRole("button", { name: "Start a fresh solo run" }).click();
  await answer(page, true, 1);
  await expect(heading(page, 2)).toBeVisible();
  await page.getByRole("button", { name: "Leave this run" }).click();
  await expect(page.getByRole("dialog", { name: "Leave this run?" })).toBeVisible();
  await page.getByRole("button", { name: "Keep going" }).click();
  await expect(heading(page, 2)).toBeVisible();
  await page.getByRole("button", { name: "Leave this run" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await home(page);
  expect(await activeRun(page)).toBeUndefined();
  expect((await runs(page)).map((r: any) => r.run.status).sort()).toEqual(["converted", "exited"]);
  await expect(page.getByRole("region", { name: "Your proof" }).getByRole("img")).toHaveCount(0);
});

// Recheck journeys. Real elapsed days are the one thing a learner cannot be driven through, so the clock jumps whole days.
// Africa/Lagos has no daylight saving, so +3 x 24 h is exactly three calendar dates.
test.describe("rechecks", () => {
  test.use({ timezoneId: "Africa/Lagos" });
  const DAY = 86_400_000;
  const T0 = new Date("2026-10-14T10:00:00+01:00").getTime();

  /** Onboards and passes a solo at T0 by hand. */
  async function proved(page: Page) {
    await page.clock.install({ time: T0 });
    await onboard(page);
    await solo(page, 9);
    await expect(page.getByRole("heading", { name: "Passed. You are Proved." })).toBeVisible();
    await toHome(page);
  }
  const jumpTo = async (page: Page, ms: number) => {
    await page.clock.setSystemTime(ms);
    await page.goto("/");
    await home(page);
  };
  async function recheck(page: Page, rights: number) {
    await page.getByRole("link", { name: /^(Start recheck|Try anyway)$/ }).click();
    await page.getByRole("link", { name: "Start recheck" }).click();
    for (let n = 1; n <= 5; n++) await answer(page, n <= rights, n, 5);
    await expect(page).toHaveURL(/\/result\/run-/);
  }
  const proof = (page: Page) => page.getByRole("region", { name: "Your proof" });

  test("7a. recheck pass on the due day: not before, then Held with the next date", async ({ page }) => {
    await proved(page);
    await expect(proof(page).getByText("First recheck: 17 Oct 2026")).toBeVisible();
    await jumpTo(page, T0 + 2 * DAY);
    await expect(page.getByRole("link", { name: "Start recheck" })).toHaveCount(0);

    await jumpTo(page, T0 + 3 * DAY);
    await expect(proof(page).getByText("Recheck due today.")).toBeVisible();
    await expect(proof(page).getByRole("img", { name: "Proved, due" })).toBeVisible();
    await recheck(page, 4);
    await expect(page.getByRole("heading", { name: "Held" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Recheck score" })).toContainText("Recheck. No help.");
    await toHome(page);
    await expect(proof(page).getByRole("img", { name: "Held" })).toBeVisible();
    await expect(proof(page).getByText("Next recheck: 21 Oct 2026")).toBeVisible();
    expect(await page.getByRole("link", { name: "Start recheck" }).count()).toBe(0);
    expect((await cycle(page)).state).toBe("held");
  });

  test("7b. recheck fail goes Fading with the recovery copy; recovery pass is Held with a new schedule from that day", async ({ page }) => {
    await proved(page);
    await jumpTo(page, T0 + 3 * DAY);
    await recheck(page, 2);
    await expect(page.getByRole("heading", { name: "Not yet" })).toBeVisible();
    await expect(page.getByText("It slipped a bit. Practise the move, then pass 4 of 5 to restore it.")).toBeVisible();
    await expect(page.getByRole("img", { name: /Fading/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Share proof|Share progress/ })).toHaveCount(0);
    await toHome(page);
    await expect(proof(page).getByRole("img", { name: "Fading" })).toBeVisible();
    await expect(proof(page).getByText("It slipped a bit. Practise the move, then pass 4 of 5 to restore it.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Practise to recover" })).toBeVisible();
    expect((await cycle(page)).state).toBe("fading");

    // Two days later (17 Oct to 19 Oct is not a multiple of the old schedule): recover with Try anyway.
    await jumpTo(page, T0 + 5 * DAY);
    await page.getByRole("link", { name: "Try anyway" }).click();
    await expect(page.getByRole("heading", { name: "Restore your proof" })).toBeVisible();
    await page.getByRole("link", { name: "Start recheck" }).click();
    for (let n = 1; n <= 5; n++) await answer(page, n <= 4, n, 5);
    await expect(page).toHaveURL(/\/result\/run-/);
    await expect(page.getByRole("heading", { name: "Held" })).toBeVisible();
    await toHome(page);
    await expect(proof(page).getByRole("img", { name: "Held" })).toBeVisible();
    await expect(proof(page).getByText("Next recheck: 22 Oct 2026")).toBeVisible(); // day 3 from 19 Oct, not the old 21 Oct
    const c = await cycle(page);
    expect(c).toMatchObject({ state: "held", anchor: "2026-10-19", timeZone: "Africa/Lagos" });
    expect(c.history.length).toBeGreaterThanOrEqual(3); // first solo, failed recheck, recovery are all kept
  });
});
