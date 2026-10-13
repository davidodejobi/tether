import { expect, type Page } from "@playwright/test";

export const LEARNER = { nickname: "Amaka", lessonDone: true, onboarded: true, coach: "character", lang: "en", readAloud: false, partner: null, honestyIntroSeen: true, schemaVersion: 1 };

// Writes the learner straight into the app's IndexedDB (db "tether", store "records"), then opens practice.
export async function seed(page: Page, learner: object = LEARNER) {
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

// The saved, unfinished question: the test reads its answer from storage, as the UI never shows it before Check.
export const current = (page: Page) =>
  expect.poll(() => read(page), { message: "saved question" }).not.toBeNull().then(() => read(page) as Promise<{ answer: string; options: string[] }>);

export const read = (page: Page) =>
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

export const tile = (page: Page, word: string) => page.getByRole("radio", { name: new RegExp(`: ${word}(,|$)`) });


/** Answers the open question correctly, then gives a reason when asked, and leaves at Next. */
export async function answerRight(page: Page, reason: string | null = "It sounded right") {
  const q = await current(page);
  await tile(page, q.answer).click();
  await page.getByRole("button", { name: "Check" }).click();
  if (reason) await page.getByRole("radio", { name: reason }).click();
}
/** After a correct check: give the reason if asked (a helped answer is not asked), then Next. */
export async function leave(page: Page) {
  const reason = page.getByRole("radio", { name: "It sounded right" });
  const nx = page.getByRole("button", { name: /^Next/ });
  await expect(reason.or(nx)).toBeVisible();
  if (await reason.isVisible()) await reason.click();
  await nx.click();
}
export const next = (page: Page) => page.getByRole("button", { name: /^Next/ }).click();

/** Every saved practice record (attempt plus the question shown), oldest first. */
export const records = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<any[]>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const req = open.result.transaction("records").objectStore("records").getAll();
          req.onsuccess = () => resolve((req.result as any[]).filter((r) => r?.attempt).sort((a, b) => a.attempt.startedAt.seq - b.attempt.startedAt.seq));
        };
      }),
  );

/** The newest saved attempt, once `ready` accepts it (saves land just after the screen changes). */
export async function lastAttempt(page: Page, ready: (a: any) => boolean = () => true) {
  await expect.poll(async () => ready((await records(page)).at(-1)?.attempt ?? {}), { message: "attempt saved" }).toBe(true);
  return (await records(page)).at(-1)!;
}
