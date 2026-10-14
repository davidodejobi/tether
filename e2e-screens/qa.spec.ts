import { test, type Page } from "@playwright/test";
import { SCREENS, seedLearner } from "./screens";

// Release QA: the main screens at phone, tablet and laptop widths in light and dark, against the production preview.
// Output: $QA_OUT/<width>/<light|dark>/<nn>-<name>.png (default /tmp/tether-qa). Run through tools/qa-capture.sh.
const OUT = process.env.QA_OUT ?? "/tmp/tether-qa";
const WIDTHS = [{ w: 360, h: 800 }, { w: 768, h: 1024 }, { w: 1366, h: 768 }];
const SCHEMES = ["light", "dark"] as const;

const named = (name: string) => {
  const s = SCREENS.find((x) => x.name === name);
  if (!s) throw new Error(`no screen "${name}"`);
  // Like screens.spec.ts: open the path first, then run the steps (seeded screens navigate again themselves).
  return async (page: Page) => {
    await page.goto(s.path, { waitUntil: "networkidle" });
    await s.actions?.(page);
  };
};
const tile = (page: Page, word: string) => page.getByRole("radio", { name: new RegExp(`: ${word}(,|$)`) });
const savedQuestion = (page: Page) =>
  page.evaluate(() => new Promise<{ answer: string; options: string[] }>((resolve) => {
    const open = indexedDB.open("tether");
    open.onsuccess = () => {
      const req = open.result.transaction("records").objectStore("records").getAll();
      req.onsuccess = () => resolve((req.result as any[]).filter((r) => r?.attempt && r.attempt.completedAt === undefined).sort((a, b) => b.attempt.startedAt.seq - a.attempt.startedAt.seq)[0].question);
    };
  }));

// Three misses open Go deeper; Still stuck? is asked with /api/explain mocked.
async function stillStuck(page: Page) {
  await page.route("**/api/explain", (r) => r.fulfill({ status: 200, json: { ok: true, text: "Words like along with only add extra people. Cover them and read what is left." } }));
  await seedLearner(page, "/practice");
  for (let n = 0; n < 3; n++) {
    await page.locator(".qv, main").first().waitFor();
    for (let i = 0; i < 50; i++) { try { await savedQuestion(page); break; } catch { await page.waitForTimeout(100); } }
    const q = await savedQuestion(page);
    await tile(page, q.options.filter((o) => o !== q.answer)[n]!).click();
    await page.getByRole("button", { name: "Check" }).click();
    if (n < 2) await page.getByRole("button", { name: "Try again" }).click();
  }
  await page.getByRole("button", { name: "With an example" }).click();
  await page.getByText("AI help ·").waitFor();
}
async function soloRun(page: Page) {
  await seedLearner(page, "/run/solo");
  await page.getByRole("heading", { name: /^Question 1 of 10/ }).waitFor();
  await page.getByRole("radio").first().click();
}

const SHOTS: [string, (page: Page) => Promise<void>][] = [
  ["onboarding-start", named("onboarding-welcome")],
  ["lesson", named("onboarding-lesson-1")],
  ["practice-question", named("practice-selected")],
  ["show-me", named("help-showme-2")],
  ["go-deeper", named("help-deeper-3")],
  ["still-stuck-ai", stillStuck],
  ["honesty-reasons", named("honesty-reasons")],
  ["solo-run", soloRun],
  ["result", named("result-passed")],
  ["share-preview", named("share-proof")],
  ["home-new", named("step14-home-new-360")],
  ["home-due", named("step14-home-due-360")],
  ["home-fading", named("step14-home-fading-360")],
  ["settings", named("step14-settings-360")],
];

for (const { w, h } of WIDTHS)
  for (const scheme of SCHEMES)
    SHOTS.forEach(([name, actions], i) =>
      test(`${w} ${scheme} ${name}`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, baseURL: test.info().project.use.baseURL });
        const page = await context.newPage();
        await actions(page);
        await page.waitForTimeout(700);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${OUT}/${w}/${scheme}/${String(i + 1).padStart(2, "0")}-${name}.png`, fullPage: true, animations: "disabled" });
        await context.close();
      }),
    );
