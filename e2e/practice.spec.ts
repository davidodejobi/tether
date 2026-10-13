import { expect, test, type Page } from "@playwright/test";

const LEARNER = { nickname: "Amaka", lessonDone: true, onboarded: true, coach: "character", lang: "en", readAloud: false, partner: null, schemaVersion: 1 };

// Writes the learner straight into the app's IndexedDB (db "tether", store "records"), then opens practice.
async function seed(page: Page) {
  await page.goto("/");
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
    LEARNER,
  );
  await page.goto("/practice");
}

// The saved, unfinished question: the test reads its answer from storage, as the UI never shows it before Check.
const current = (page: Page) =>
  expect.poll(() => read(page), { message: "saved question" }).not.toBeNull().then(() => read(page) as Promise<{ answer: string; options: string[] }>);

const read = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ answer: string; options: string[] } | null>((resolve, reject) => {
        const open = indexedDB.open("tether");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction("records").objectStore("records").getAll();
          req.onsuccess = () => {
            const open_ = (req.result as any[]).filter((r) => r?.attempt && r.attempt.completedAt === undefined);
            const last = open_.sort((a, b) => b.attempt.startedAt.seq - a.attempt.startedAt.seq)[0];
            resolve(last ? last.question : null);
          };
        };
      }),
  );

const tile = (page: Page, word: string) => page.getByRole("radio", { name: new RegExp(`: ${word}(,|$)`) });

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
      await expect(page.getByText("Not quite. Try again.")).toBeVisible();
      await expect(page.getByRole("radio", { name: /struck out/ })).toHaveCount(1);
      await expect(page.getByRole("button", { name: "Check" })).toBeDisabled();
    }
    await tile(page, q.answer).click();
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: "Next" }).click();
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
  await page.getByRole("link", { name: "Practice" }).click();
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
    await page.getByRole("button", { name: "Next" }).click();
  }
  await page.getByRole("button", { name: "Done for today" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("the move sheet opens without counting as help, and keys select and check", async ({ page }) => {
  await seed(page);
  await page.getByRole("button", { name: /The move: Strip the Disguise/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const q = await current(page);
  await page.keyboard.press(String(q.options.indexOf(q.answer) + 1));
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
});

test("with no learner, practice starts onboarding", async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
});
