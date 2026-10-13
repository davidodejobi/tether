import type { Page } from "@playwright/test";

// Add every new screen here: { name, path } at 360x800, plus optional wider captures.
// `steps` runs after the page loads and before the capture (seed a learner, click a tile, check).
export type Screen = { name: string; path: string; width?: number; height?: number; steps?: (page: Page) => Promise<void> };

const LEARNER = { nickname: "Amaka", lessonDone: true, onboarded: true, coach: "character", lang: "en", readAloud: false, partner: null, schemaVersion: 1 };

/** Writes a learner into the app's IndexedDB, then opens `path`. */
export async function seedLearner(page: Page, path: string) {
  await page.goto("/");
  await page.evaluate(
    (learner) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const tx = open.result.transaction("records", "readwrite");
          tx.objectStore("records").put(learner, "learner");
          tx.oncomplete = () => resolve();
        };
      }),
    LEARNER,
  );
  await page.goto(path, { waitUntil: "networkidle" });
}

/** The open question, read from saved progress. Poll: it is saved just after the screen shows. */
async function openQuestion(page: Page): Promise<{ answer: string; options: string[] }> {
  for (let i = 0; i < 50; i++) {
    const q = await page.evaluate(
      () =>
        new Promise<{ answer: string; options: string[] } | null>((resolve) => {
          const open = indexedDB.open("tether");
          open.onsuccess = () => {
            const req = open.result.transaction("records").objectStore("records").getAll();
            req.onsuccess = () => {
              const a = (req.result as any[]).filter((r) => r?.attempt && r.attempt.completedAt === undefined);
              a.sort((x, y) => y.attempt.startedAt.seq - x.attempt.startedAt.seq);
              resolve(a[0]?.question ?? null);
            };
          };
        }),
    );
    if (q) return q;
    await page.waitForTimeout(100);
  }
  throw new Error("no open question saved");
}

const tile = (page: Page, word: string) => page.getByRole("radio", { name: new RegExp(`: ${word}(,|$)`) });
const check = (page: Page) => page.getByRole("button", { name: "Check" }).click();

const start = (page: Page) => seedLearner(page, "/practice");
const pickRight = async (page: Page) => tile(page, (await openQuestion(page)).answer).click();
const pickWrong = async (page: Page) => {
  const q = await openQuestion(page);
  await tile(page, q.options.find((o) => o !== q.answer)!).click();
};
const selected = async (page: Page) => (await start(page), await pickRight(page));
const struck = async (page: Page) => (await start(page), await pickWrong(page), await check(page));
const correct = async (page: Page) => (await start(page), await pickRight(page), await check(page));
const summary = async (page: Page) => {
  await start(page);
  for (let n = 0; n < 5; n++) {
    await openQuestion(page);
    if (n === 2) (await pickWrong(page), await check(page));
    await pickRight(page);
    await check(page);
    await page.getByRole("button", { name: "Next" }).click();
  }
};

export const SCREENS: Screen[] = [
  { name: "kit", path: "/kit" },
  { name: "kit-768", path: "/kit", width: 768, height: 1024 },
  { name: "kit-1366", path: "/kit", width: 1366, height: 768 },
  { name: "practice-unselected", path: "/", steps: start },
  { name: "practice-selected", path: "/", steps: selected },
  { name: "practice-wrong", path: "/", steps: struck },
  { name: "practice-correct", path: "/", steps: correct },
  { name: "practice-move-sheet", path: "/", steps: async (p) => (await start(p), await p.getByRole("button", { name: /The move:/ }).click()) },
  { name: "practice-summary", path: "/", steps: summary },
  { name: "practice-selected-768", path: "/", width: 768, height: 1024, steps: selected },
  { name: "practice-selected-1366", path: "/", width: 1366, height: 768, steps: selected },
];
