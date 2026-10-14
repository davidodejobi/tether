import { expect, type Page } from "@playwright/test";
import { answerOf, BASICS, lessons, type LessonCard } from "../src/content/learn.ts";

const ALL = [...BASICS, ...lessons.flatMap((l) => l.cards)];
export const whys = ALL.filter((c): c is Extract<LessonCard, { kind: "why" }> => c.kind === "why");
export const tries = ALL.filter((c): c is Extract<LessonCard, { kind: "try" }> => c.kind === "try");

/** The subject word chips on a Try card whose sentence is `chips` (the buttons' texts). */
const trySubject = (chips: string[]) => tries.find((t) => t.sentence.parts.flatMap((p) => p.text.split(" ")).join("|") === chips.join("|"))!;

/** Answers the current why card correctly (by its question) and leaves Continue enabled. */
export async function answerWhy(page: Page) {
  const q = (await page.locator(".ln-h").innerText()).trim();
  const card = whys.find((w) => w.question === q)!;
  await page.getByRole("button", { name: card.options.find((o) => o.correct)!.text }).click();
}

/** Taps the subject, then the right verb, on the current try card. */
export async function answerTry(page: Page) {
  const chips = (await page.locator(".ln-chips button").allInnerTexts()).map((t) => t.trim());
  const card = trySubject(chips);
  const subject = card.sentence.parts.find((p) => p.role === "subject")!.text.split(" ")[0]!;
  await page.locator(".ln-chips button", { hasText: subject }).first().click();
  await page.getByRole("radio", { name: new RegExp(`: ${answerOf(card.sentence)}$`) }).click();
}

/**
 * Walks the whole Learn the move lesson: Continue on every card, the why and try cards answered correctly,
 * beat cards stepped through with reduced motion. Stops on the last card, with its button still to press.
 */
export async function finishLesson(page: Page) {
  const last = page.getByRole("heading", { name: "The move in one line" });
  for (let i = 0; i < 30 && !(await last.isVisible()); i++) {
    const kind = ((await page.locator(".ln-card").getAttribute("class")) ?? "").split(" ").at(-1);
    if (kind === "ln-why") await answerWhy(page);
    else if (kind === "ln-try") await answerTry(page);
    else {
      const step = page.getByRole("button", { name: "Next step" });
      while (await step.isVisible()) await step.click();
    }
    const go = page.getByRole("button", { name: "Continue" });
    await expect(go).toBeEnabled();
    await go.click();
  }
  await expect(last).toBeVisible();
}
