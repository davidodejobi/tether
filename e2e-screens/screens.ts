import type { Page } from "@playwright/test";

// Add every new screen here: { name, path } at 360x800, plus optional wider captures.
export type Screen = { name: string; path: string; width?: number; height?: number; /** Runs after load and before the capture, e.g. to reach a later step. */ actions?: (page: Page) => Promise<void> };

export const SCREENS: Screen[] = [
  { name: "kit", path: "/kit" },
  { name: "kit-768", path: "/kit", width: 768, height: 1024 },
  { name: "kit-1366", path: "/kit", width: 1366, height: 768 },
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
const win = [...lesson, click("Next"), click("Next"), click(/Got it/), click("Continue")];
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
