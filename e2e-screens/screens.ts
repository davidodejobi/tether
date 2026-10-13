import type { Page } from "@playwright/test";
import { answerTutorials } from "../e2e/tutorial";

// Add every new screen here: { name, path } at 360x800, plus optional wider captures.
export type Screen = { name: string; path: string; width?: number; height?: number; /** Runs after load and before the capture, e.g. to reach a later step. */ actions?: (page: Page) => Promise<void> };

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
  { name: "practice-unselected", path: "/", actions: start },
  { name: "practice-selected", path: "/", actions: selected },
  { name: "practice-wrong", path: "/", actions: struck },
  { name: "practice-correct", path: "/", actions: correct },
  { name: "practice-move-sheet", path: "/", actions: async (p) => (await start(p), await p.getByRole("button", { name: /The move:/ }).click()) },
  { name: "practice-summary", path: "/", actions: summary },
  { name: "practice-selected-768", path: "/", width: 768, height: 1024, actions: selected },
  { name: "practice-selected-1366", path: "/", width: 1366, height: 768, actions: selected },
];

// Onboarding steps, each reached from a fresh browser by pressing through the earlier ones.
const click = (name: string | RegExp) => (page: Page) => page.getByRole("button", { name }).click();
const to = (...steps: ((page: Page) => Promise<void>)[]) => async (page: Page) => {
  for (const step of steps) await step(page);
  await page.waitForTimeout(700); // let entry animations finish
};
const nickname = async (page: Page) => {
  await click("Start")(page);
  await page.getByLabel("Nickname").fill("Amaka");
};
const lesson = [nickname, click("Continue")];
const win = [...lesson, click("Next"), click("Next"), click(/Got it/), answerTutorials];
const choices = [...win, click("Make Tether yours")];

SCREENS.push(
  { name: "onboarding-welcome", path: "/" },
  { name: "onboarding-welcome-768", path: "/", width: 768, height: 1024 },
  { name: "onboarding-welcome-1366", path: "/", width: 1366, height: 768 },
  { name: "onboarding-nickname", path: "/", actions: to(nickname) },
  { name: "onboarding-lesson-1", path: "/", actions: to(...lesson) },
  { name: "onboarding-lesson-1-768", path: "/", width: 768, height: 1024, actions: to(...lesson) },
  { name: "onboarding-lesson-1-1366", path: "/", width: 1366, height: 768, actions: to(...lesson) },
  { name: "onboarding-lesson-2", path: "/", actions: to(...lesson, click("Next")) },
  { name: "onboarding-lesson-3", path: "/", actions: to(...lesson, click("Next"), click("Next")) },
  { name: "onboarding-questions", path: "/", actions: to(...lesson, click("Next"), click("Next"), click(/Got it/)) },
  { name: "onboarding-win", path: "/", actions: to(...win) },
  { name: "onboarding-choices", path: "/", actions: to(...choices) },
  { name: "onboarding-partner", path: "/", actions: to(...choices, click(/Someone to see your wins/)) },
);
