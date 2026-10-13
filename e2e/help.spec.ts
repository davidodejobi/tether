import { expect, test, type Page } from "@playwright/test";
import { point, type PracticeAttempt } from "../src/rules/practice.ts";
import { stripDisguise as pack } from "../src/content/strip-disguise.ts";

const LEARNER = { nickname: "Amaka", lessonDone: true, onboarded: true, coach: "character", lang: "en", readAloud: false, partner: null, schemaVersion: 1 };
type Saved = { attempt: PracticeAttempt; question: { answer: string; options: string[]; covered: string; number: "sg" | "pl" }; struck?: string[] };

async function seed(page: Page, learner: object = LEARNER) {
  await page.goto("/");
  // The app creates the database on startup; seeding before that would race it (a bare open() makes an empty one).
  await page.getByRole("button", { name: "Start" }).waitFor();
  await page.evaluate(
    (learner) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("tether");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction("records", "readwrite");
          tx.objectStore("records").put(learner, "learner");
          tx.oncomplete = () => resolve();
        };
      }),
    learner,
  );
  await page.goto("/practice");
}

/** The newest saved attempt, read from IndexedDB (the UI never shows the answer before Check). */
const latest = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open("tether");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction("records").objectStore("records").getAll();
          req.onsuccess = () => {
            const all = (req.result as any[]).filter((r) => r?.attempt).sort((a, b) => b.attempt.startedAt.seq - a.attempt.startedAt.seq);
            resolve(all[0] ?? null);
          };
        };
      }),
  ) as Promise<Saved | null>;
const saved = async (page: Page, ready: (s: Saved) => boolean) => {
  await expect.poll(async () => { const s = await latest(page); return !!s && ready(s); }).toBe(true);
  return (await latest(page))!;
};

const tile = (page: Page, word: string) => page.getByRole("radio", { name: new RegExp(`: ${word}(,|$)`) });
const miss = async (page: Page, n: number) => {
  const q = (await saved(page, () => true)).question;
  await tile(page, q.options.filter((o) => o !== q.answer)[n]!).click();
  await page.getByRole("button", { name: "Check" }).click();
};
const finishRight = async (page: Page) => {
  const q = (await saved(page, () => true)).question;
  await tile(page, q.answer).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
};
const noCorrectMark = (page: Page) => expect(page.getByRole("radio", { name: /, correct/ })).toHaveCount(0);

test("first miss: nudge, then retry and answer right", async ({ page }) => {
  await seed(page);
  await miss(page, 0);
  await expect(page.getByText(pack.coach.en.nudge)).toBeVisible();
  await noCorrectMark(page);
  await page.getByRole("button", { name: "Try again" }).click();
  await finishRight(page);
  const s = await saved(page, (x) => x.attempt.completedAt !== undefined);
  expect(s.attempt.help).toEqual(["nudge"]);
  expect(s.attempt.checks).toBe(2);
  expect(s.attempt.resets).toHaveLength(1);
  expect(point(s.attempt)).toBe(1);
});

test("second miss: Show me, Put it in yourself, then right earns no point", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(page);
  await miss(page, 0);
  await page.getByRole("button", { name: "Try again" }).click();
  await miss(page, 1);
  await noCorrectMark(page);
  await page.getByRole("button", { name: "Show me" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Show me" });
  await expect(dialog).toBeVisible();
  const q = (await saved(page, (x) => x.attempt.help.includes("showMe"))).question;
  const word = new RegExp(`\\b${q.answer}\\b`);
  // Beats 1 and 2 never show the verb; only beat 3 does.
  await expect(dialog.getByRole("heading", { level: 3 })).toContainText("Cover the side phrase");
  expect(await dialog.innerText()).not.toMatch(word);
  await dialog.getByRole("button", { name: "Next" }).click();
  expect(await dialog.innerText()).not.toMatch(word);
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByRole("heading", { level: 3 })).toContainText(q.answer);
  await dialog.getByRole("button", { name: "Put it in yourself" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(/Help counts as with help/)).toBeVisible();
  await finishRight(page);
  const s = await saved(page, (x) => x.attempt.completedAt !== undefined);
  expect(s.attempt.help).toEqual(["nudge", "showMe"]);
  expect(s.attempt.checks).toBe(3);
  expect(s.attempt.resets).toHaveLength(3);
  expect(point(s.attempt)).toBe(0);
});

test("third miss: tiles hidden, Go deeper with hints, then recover", async ({ page }) => {
  await seed(page);
  for (let n = 0; n < 3; n++) {
    await miss(page, n);
    if (n < 2) await page.getByRole("button", { name: "Try again" }).click();
  }
  const q = (await saved(page, (x) => x.attempt.checks === 3)).question;
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: pack.coach.en.goDeeper.subject })).toBeFocused();
  // Step 1: a side-phrase word and a word after the blank are wrong; the subject is right.
  const chips = page.locator(".hp-chip");
  await chips.filter({ hasText: new RegExp(`^${q.covered.split(" ")[0]}$`) }).first().click();
  await expect(page.getByText(pack.coach.en.goDeeper.subjectHint)).toBeVisible();
  await chips.last().click();
  await expect(page.getByText("That's not the subject.")).toBeVisible();
  await chips.first().click();
  // Step 2.
  await expect(page.getByRole("heading", { name: pack.coach.en.goDeeper.count })).toBeFocused();
  await page.getByRole("button", { name: q.number === "sg" ? "Many" : "One" }).click();
  await expect(page.getByText(pack.coach.en.goDeeper.countHint)).toBeVisible();
  await page.getByRole("button", { name: q.number === "sg" ? "One" : "Many" }).click();
  // Step 3: the hint never names the verb.
  await page.getByRole("button", { name: q.options.find((o) => o !== q.answer)!, exact: true }).click();
  await expect(page.getByText(/Try again\.$/).last()).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.getByRole("button", { name: q.answer, exact: true }).click();
  await expect(page.getByText(/You rebuilt it yourself/)).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0); // still hidden until Back to the question
  await page.getByRole("button", { name: "Back to the question" }).click();
  await expect(page.getByRole("radio")).toHaveCount(4);
  await finishRight(page);
  const s = await saved(page, (x) => x.attempt.completedAt !== undefined);
  expect(s.attempt.help).toEqual(["nudge", "goDeeper"]);
  expect(s.attempt.checks).toBe(4);
  expect(s.attempt.resets).toHaveLength(4);
  expect(point(s.attempt)).toBe(0);
});

test("S opens Show me before any miss; pause and replay work by keyboard; the move sheet is not help", async ({ page }) => {
  await seed(page);
  await saved(page, () => true);
  await page.getByRole("button", { name: /The move: Strip the Disguise/ }).click();
  await page.getByRole("button", { name: "Got it" }).click();
  expect((await saved(page, () => true)).attempt.help).toEqual([]);
  await page.keyboard.press("s");
  const dialog = page.getByRole("dialog", { name: "Show me" });
  await expect(dialog).toBeVisible();
  const pause = dialog.getByRole("button", { name: "Pause" });
  await pause.focus();
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByText("Step 2 of 3")).toBeVisible();
  await dialog.getByRole("button", { name: "Replay" }).focus();
  await page.keyboard.press("Enter");
  await expect(dialog.getByText("Step 1 of 3")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  const s = await saved(page, (x) => x.attempt.help.includes("showMe"));
  expect(s.attempt.help).toEqual(["showMe"]);
  expect(s.attempt.resets).toHaveLength(1);
});
