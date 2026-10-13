import type { Page } from "@playwright/test";
import { answerTutorials } from "../e2e/tutorial";

// Add every new screen here: { name, path } at 360x800, plus optional wider captures.
export type Screen = { name: string; path: string; width?: number; height?: number; /** Runs after load and before the capture, e.g. to reach a later step. */ actions?: (page: Page) => Promise<void> };

// The honesty rule is shown once; most screens start after it, so it is marked seen here.
const LEARNER = { nickname: "Amaka", lessonDone: true, onboarded: true, coach: "character", lang: "en", readAloud: false, partner: null, honestyIntroSeen: true, schemaVersion: 1 };

/** Writes a learner into the app's IndexedDB, then opens `path`. */
export async function seedLearner(page: Page, path: string, patch: Record<string, unknown> = {}) {
  await page.goto("/");
  // The app creates the database on startup; seeding before that would race it (a bare open() makes an empty one).
  await page.getByRole("button", { name: "Start" }).waitFor();
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
    { ...LEARNER, ...patch },
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
    const reason = page.getByRole("radio", { name: "It sounded right" });
    const nx = page.getByRole("button", { name: /^Next/ });
    await reason.or(nx).waitFor();
    if (await reason.isVisible()) await reason.click();
    await nx.click();
  }
};

// Honesty screens. Math.random is replaced so the one-in-three verification is forced: 0.1 samples it, 0.9 does not.
const roll = (page: Page, r: number | null) => page.evaluate((v) => ((window as any).__r = v ?? undefined), r);
const forceable = (page: Page) =>
  page.evaluate(() => {
    const real = Math.random;
    Math.random = () => (window as any).__r ?? real();
  });
const reasons = async (page: Page, learner: Record<string, unknown> = LEARNER) => {
  await seedLearner(page, "/practice", learner);
  await forceable(page);
  await pickRight(page);
  await check(page);
  await page.getByRole("radio", { name: "I guessed" }).waitFor();
};
const claim = async (page: Page, name: string, r: number) => {
  await roll(page, r);
  await page.getByRole("radio", { name }).click();
  await roll(page, null);
};
const next = (page: Page) => page.getByRole("button", { name: /^Next/ }).click();
const oneDot = async (page: Page) => (await reasons(page), await claim(page, "I used the move", 0.9), await next(page));
const asking = async (page: Page) => {
  await reasons(page);
  await claim(page, "I used the move", 0.1);
  await page.locator(".hn-words").waitFor();
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
};
const wordIndex = async (page: Page, covered: boolean) => {
  const q = await page.evaluate(
    () => new Promise<{ subject: string }>((resolve) => {
      const open = indexedDB.open("tether");
      open.onsuccess = () => {
        const req = open.result.transaction("records").objectStore("records").getAll();
        req.onsuccess = () => resolve((req.result as any[]).filter((r) => r?.attempt).sort((a, b) => b.attempt.startedAt.seq - a.attempt.startedAt.seq)[0].question);
      };
    }),
  );
  return covered ? q.subject.split(" ").length : 0;
};
const tapCovered = async (page: Page, covered: boolean) => (await asking(page), await page.locator(".hn-words button").nth(await wordIndex(page, covered)).click());
const sounded = async (page: Page) => {
  await oneDot(page);
  await pickRight(page);
  await check(page);
  await claim(page, "It sounded right", 0.5);
};
const thirdDot = async (page: Page) => {
  await oneDot(page);
  for (let i = 0; i < 2; i++) {
    await pickRight(page);
    await check(page);
    await claim(page, "I used the move", 0.9);
    if (i === 0) await next(page);
  }
  await page.getByText("3 of 3 dots now.").waitFor(); // capture after the save, not mid-update
};

// Help ladder (step 9). `missN` makes the nth wrong pick (0-based) and checks; the others open each help view.
const startAs = (patch: Record<string, unknown>) => (page: Page) => seedLearner(page, "/practice", patch);
const missN = async (page: Page, n: number) => {
  const q = await openQuestion(page);
  await tile(page, q.options.filter((o) => o !== q.answer)[n]!).click();
  await check(page);
};
const tryAgain = (page: Page) => page.getByRole("button", { name: "Try again" }).click();
const nudge = (patch: Record<string, unknown> = {}) => async (page: Page) => (await startAs(patch)(page), await missN(page, 0));
const miss2 = async (page: Page) => (await nudge()(page), await tryAgain(page), await missN(page, 1));
const miss3 = async (page: Page) => (await miss2(page), await tryAgain(page), await missN(page, 2));
// Opens Show me and stops on beat 1-3 (pausing the timer so the capture is stable).
const showMe = (beat: 1 | 2 | 3, reduced = false) => async (page: Page) => {
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await openQuestion(page);
  await page.getByRole("button", { name: "Show me" }).click();
  const dialog = page.getByRole("dialog", { name: "Show me" });
  await dialog.waitFor();
  const pause = dialog.getByRole("button", { name: "Pause" });
  if (await pause.count()) await pause.click();
  for (let b = 1; b < beat; b++) await dialog.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(500);
};
const putItInYourself = async (page: Page) => (await showMe(3)(page), await page.getByRole("button", { name: "Put it in yourself" }).click());
const subjectChip = (page: Page) => page.locator(".hp-chip").first();
const deeper = (step: 1 | 2 | 3, wrong = false) => async (page: Page) => {
  await miss3(page);
  if (step === 1 && wrong) await page.locator(".hp-chip").last().click();
  if (step >= 2) await subjectChip(page).click();
  if (step >= 3) await page.getByRole("button", { name: /^(One|Many)$/ }).first().click();
};

export const SCREENS: Screen[] = [
  { name: "kit", path: "/kit" },
  { name: "kit-768", path: "/kit", width: 768, height: 1024 },
  { name: "kit-1366", path: "/kit", width: 1366, height: 768 },
  { name: "practice-unselected", path: "/", actions: start },
  { name: "practice-selected", path: "/", actions: selected },
  { name: "practice-wrong", path: "/", actions: struck },
  { name: "practice-correct", path: "/", actions: correct },
  { name: "practice-move-sheet", path: "/", actions: async (p) => (await start(p), await p.getByRole("button", { name: /The move:/ }).click(), await p.getByRole("dialog").waitFor()) },
  { name: "practice-summary", path: "/", actions: summary },
  { name: "practice-selected-768", path: "/", width: 768, height: 1024, actions: selected },
  { name: "practice-selected-1366", path: "/", width: 1366, height: 768, actions: selected },
];

SCREENS.push(
  { name: "help-nudge", path: "/", actions: nudge() },
  { name: "help-nudge-text", path: "/", actions: nudge({ coach: "text" }) },
  { name: "help-nudge-pidgin", path: "/", actions: nudge({ lang: "pcm" }) },
  { name: "help-miss2", path: "/", actions: miss2 },
  { name: "help-showme-1", path: "/", actions: showMe(1) },
  { name: "help-showme-2", path: "/", actions: showMe(2) },
  { name: "help-showme-3", path: "/", actions: showMe(3) },
  { name: "help-showme-reduced", path: "/", actions: showMe(3, true) },
  { name: "help-put-it-in-yourself", path: "/", actions: putItInYourself },
  { name: "help-deeper-1", path: "/", actions: deeper(1) },
  { name: "help-deeper-1-wrong", path: "/", actions: deeper(1, true) },
  { name: "help-deeper-2", path: "/", actions: deeper(2) },
  { name: "help-deeper-3", path: "/", actions: deeper(3) },
  { name: "help-showme-2-768", path: "/", width: 768, height: 1024, actions: showMe(2) },
  { name: "help-showme-2-1366", path: "/", width: 1366, height: 768, actions: showMe(2) },
  { name: "honesty-reasons", path: "/", actions: (p) => reasons(p) },
  { name: "honesty-reasons-768", path: "/", width: 768, height: 1024, actions: (p) => reasons(p) },
  { name: "honesty-reasons-1366", path: "/", width: 1366, height: 768, actions: (p) => reasons(p) },
  { name: "honesty-intro", path: "/", actions: (p) => reasons(p, { ...LEARNER, honestyIntroSeen: undefined }) },
  { name: "honesty-dot-fills", path: "/", actions: async (p) => (await reasons(p), await claim(p, "I used the move", 0.9)) },
  { name: "honesty-verify-asking", path: "/", actions: asking },
  { name: "honesty-verify-correct", path: "/", actions: (p) => tapCovered(p, true) },
  { name: "honesty-verify-wrong", path: "/", actions: (p) => tapCovered(p, false) },
  { name: "honesty-streak-unchanged", path: "/", actions: sounded },
  { name: "honesty-third-dot", path: "/", actions: thirdDot },
  { name: "solo-ready", path: "/", actions: async (p) => (await thirdDot(p), await next(p)) },
  { name: "solo-not-ready", path: "/", actions: async (p) => { await oneDot(p); await p.goto("/solo-entry", { waitUntil: "networkidle" }); } },
  { name: "solo-placeholder", path: "/", actions: async (p) => (await seedLearner(p, "/solo")) },
);

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

// Step 10a: the learner avatar beside the nickname on Home and Settings (fixed seed so captures are comparable).
const identity = (path: string, patch: Record<string, unknown> = {}) => (page: Page) => seedLearner(page, path, { avatarSeed: "a1b2c3d4e5f6a1b2c3d4e5f6", avatarGen: 2, ...patch });
for (const [suffix, width, height] of [["", 360, 800], ["-768", 768, 1024], ["-1366", 1366, 768]] as const) {
  SCREENS.push(
    { name: `home-avatar${suffix}`, path: "/", width, height, actions: identity("/") },
    { name: `settings-avatar${suffix}`, path: "/", width, height, actions: identity("/settings", { sounds: true }) },
  );
}
SCREENS.push({ name: "home-avatar-text-only", path: "/", actions: identity("/", { coach: "text" }) });
