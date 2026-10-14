import { expect, test, type Page } from "@playwright/test";
import { before, buildQuestion, partsOf, sentence, type Question } from "../src/content/generate.ts";
import { moves } from "../src/content/moves.ts";
import { startAttempt } from "../src/rules/practice.ts";
import { chips, fill } from "../src/ui/help/steps.ts";
import { LEARNER, lastAttempt, tile } from "./practice-helpers";

// Question-level help for moves 2 to 5. /practice?move=<id> resumes that move's newest unfinished practice attempt,
// so each test saves one built from the move's combo and opens it.
const WHO = "one-of-the.tunde.the-students.from-our-school.who.always-early";
const CASES = [
  { move: moves[1]!, combo: undefined },
  { move: moves[2]!, combo: undefined },
  { move: moves[3]!, combo: undefined },
  { move: moves[4]!, combo: WHO },
].map(({ move, combo }) => ({ move, q: buildQuestion(move, move.combos.find((c) => c.id === combo) ?? move.combos[0]!, () => 0.5) }));

async function seedQuestion(page: Page, q: Question) {
  await page.addInitScript(() => {
    const real = Math.random;
    Math.random = () => (window as any).__r ?? real();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).waitFor();
  const attempt = startAttempt("moves-help-1", q.id, "practice", { at: Date.now(), seq: 1 });
  await page.evaluate(
    ([learner, attempt, question]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("tether");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction("records", "readwrite");
          tx.objectStore("records").put(learner, "learner");
          tx.objectStore("records").put({ attempt, question, struck: [] }, "attempt:moves-help-1");
          tx.oncomplete = () => resolve();
        };
      }),
    [LEARNER, attempt, q] as const,
  );
  await page.goto(`/practice?move=${q.moveId}`);
}
const wrong = (q: Question, n: number) => q.options.filter((o) => o !== q.answer)[n]!;
const miss = async (page: Page, q: Question, n: number) => {
  await tile(page, wrong(q, n)).click();
  await page.getByRole("button", { name: "Check" }).click();
};
const coveredCount = (q: Question) => partsOf(q).filter((p) => p.role === "covered").length;

for (const { move, q } of CASES) {
  test.describe(`${move.title}`, () => {
    test("shows its sentence shape, no review label and no AI help", async ({ page }) => {
      const requests: string[] = [];
      await page.route("**/api/explain", (r) => (requests.push(r.request().url()), r.abort()));
      await seedQuestion(page, q);
      await expect(page.locator(".qv-sentence")).toContainText(before(q));
      await miss(page, q, 0);
      await expect(page.getByText(move.coach.en.nudge)).toBeVisible();
      await expect(page.getByText("Unreviewed")).toHaveCount(0); // owner decision: no review labels
      await page.getByRole("button", { name: "Try again" }).click();
      await miss(page, q, 1);
      await page.getByRole("button", { name: "Try again" }).click();
      await miss(page, q, 2);
      await expect(page.getByRole("heading", { name: move.coach.en.goDeeper.subject })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Still stuck?" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "In plain words" })).toHaveCount(0);
      expect(requests).toEqual([]);
    });

    test("the move sheet shows this move's title, rule and example", async ({ page }) => {
      await seedQuestion(page, q);
      await page.getByRole("button", { name: new RegExp(`The move: ${move.title}`) }).click();
      const sheet = page.getByRole("dialog", { name: new RegExp(move.title) });
      await expect(sheet).toBeVisible();
      await expect(sheet).toContainText(move.coach.en.rule);
      await expect(sheet).toContainText(move.source.line);
      await expect(sheet.locator(".qv-example")).toContainText(before(move.example));
      await expect(sheet.getByText("Unreviewed")).toHaveCount(0);
    });

    test("Show me strikes the covered parts and badges the subject", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await seedQuestion(page, q);
      await miss(page, q, 0);
      await page.getByRole("button", { name: "Try again" }).click();
      await miss(page, q, 1);
      await page.getByRole("button", { name: "Show me" }).first().click();
      const dialog = page.getByRole("dialog", { name: "Show me" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText("Unreviewed")).toHaveCount(0);
      await expect(dialog.getByRole("heading", { level: 3 })).toContainText(fill(move, move.coach.en.showMe[0], q, "en"));
      await expect(dialog.locator(".ls-covered.on")).toHaveCount(coveredCount(q));
      await expect(dialog.locator(".ls-badge")).toHaveCount(0);
      await dialog.getByRole("button", { name: "Next" }).click();
      await expect(dialog.locator(".ls-badge").last()).toHaveText(q.number === "sg" ? "1" : "2+");
      await dialog.getByRole("button", { name: "Next" }).click();
      await expect(dialog.locator(".ls-blank.on").last()).toHaveText(q.answer);
      await expect(dialog.getByText(move.title)).toBeVisible();
      await dialog.getByRole("button", { name: "Put it in yourself" }).click();
      await expect(dialog).toBeHidden();
    });

    test("Go deeper: a covered chip gets the subject hint, a subject chip moves on", async ({ page }) => {
      await seedQuestion(page, q);
      for (let n = 0; n < 3; n++) {
        await miss(page, q, n);
        if (n < 2) await page.getByRole("button", { name: "Try again" }).click();
      }
      const all = chips(q).before;
      const words = page.locator(".hp-chips .hp-chip");
      await words.nth(all.findIndex((c) => c.kind === "side")).click();
      await expect(page.getByText(move.coach.en.goDeeper.subjectHint)).toBeVisible();
      await words.nth(all.findIndex((c) => c.kind === "subject")).click();
      await expect(page.getByRole("heading", { name: move.coach.en.goDeeper.count })).toBeVisible();
      await page.getByRole("button", { name: q.number === "sg" ? "One" : "Many", exact: true }).click();
      await page.getByRole("button", { name: q.answer, exact: true }).click();
      await expect(page.getByRole("heading", { name: sentence(q, q.answer) })).toBeVisible();
    });

    test("a correct first try with the move claimed is verified by tapping a covered word", async ({ page }) => {
      await seedQuestion(page, q);
      await tile(page, q.answer).click();
      await page.getByRole("button", { name: "Check" }).click();
      await page.evaluate(() => ((window as any).__r = 0.1));
      await page.getByRole("radio", { name: "I used the move" }).click();
      await page.evaluate(() => delete (window as any).__r);
      await expect(page.getByRole("heading", { name: /Tap the part you covered/ })).toBeVisible();
      const words = page.locator(".hn-words button");
      const parts = partsOf(q);
      const skip = parts.slice(0, parts.findIndex((p) => p.role === "covered")).reduce((n, p) => n + p.text.split(" ").length, 0);
      // A plain or subject word fails; the first covered word passes.
      await words.nth(skip).click();
      await lastAttempt(page, (a) => a.verifyResult === "passed");
      await expect(page.getByText(/You showed it/)).toBeVisible();
    });
  });
}

test("a who sentence shows both covered parts struck while the subject stays unstruck", async ({ page }) => {
  const { move, q } = CASES[3]!;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedQuestion(page, q);
  await expect(page.locator(".qv-sentence")).toContainText(`${before(q)}`);
  expect(coveredCount(q)).toBe(2);
  await miss(page, q, 0);
  await page.getByRole("button", { name: "Try again" }).click();
  await miss(page, q, 1);
  await page.getByRole("button", { name: "Show me" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Show me" });
  await expect(dialog.locator(".ls-covered.on")).toHaveCount(2);
  await expect(dialog.locator(".ls-subject.on")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.locator(".ls-subject.on").last()).toContainText("the students");
  await expect(dialog.getByText(move.coach.en.rule)).toBeVisible();
});
