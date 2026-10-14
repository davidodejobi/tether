import { expect, type Page } from "@playwright/test";
import { answerOf, BASICS, lessons, type LessonCard } from "../src/content/learn.ts";

const ALL = [...BASICS, ...lessons.flatMap((l) => l.cards)];
export const whys = ALL.filter((c): c is Extract<LessonCard, { kind: "why" }> => c.kind === "why");
export const tries = ALL.filter((c): c is Extract<LessonCard, { kind: "try" }> => c.kind === "try");

/** The subject word chips on a Try card whose sentence is `chips` (the buttons' texts). */
export const tryFor = (chips: string[]) => tries.find((t) => [...t.sentence.parts.flatMap((p) => p.text.split(" ")), ...t.sentence.predicate.split(" ")].join("|") === chips.join("|"))!;

/** Answers the current why card correctly (by its question) and leaves Continue enabled. */
export async function answerWhy(page: Page) {
  const q = (await page.locator(".ln-h").innerText()).trim();
  const card = whys.find((w) => w.question === q)!;
  await page.getByRole("button", { name: card.options.find((o) => o.correct)!.text }).click();
}

/** Taps the subject, then the right verb, on the current try card. */
export async function answerTry(page: Page) {
  const chips = (await page.locator(".ln-chips button").allInnerTexts()).map((t) => t.trim());
  const card = tryFor(chips);
  const subject = card.sentence.parts.find((p) => p.role === "subject")!.text.split(" ")[0]!;
  await page.getByRole("button", { name: subject, exact: true }).first().click();
  await page.getByRole("radio", { name: new RegExp(`: ${answerOf(card.sentence)}$`) }).click();
}

const kindOf = async (page: Page) => ((await page.locator(".ln-card").getAttribute("class")) ?? "").split(" ").at(-1)!.slice(3);

/** Does what the current card asks (why and try answered correctly, beat cards stepped through), then presses Continue. */
export async function step(page: Page) {
  const now = await kindOf(page);
  if (now === "why") await answerWhy(page);
  else if (now === "try") await answerTry(page);
  else {
    const next = page.getByRole("button", { name: "Next step" });
    while (await next.isVisible()) await next.click();
  }
  const go = page.getByRole("button", { name: "Continue" });
  await expect(go).toBeEnabled();
  await go.click();
}

/** Walks the lesson until the card of `kind` (intro, define, agree, pair, worked, why, try, summary) is showing. */
export async function advanceTo(page: Page, kind: string) {
  for (let i = 0; i < 30 && (await kindOf(page)) !== kind; i++) await step(page);
  await expect.poll(() => kindOf(page)).toBe(kind);
}

/** Walks the whole lesson. Stops on the last card, with its button still to press. */
export async function finishLesson(page: Page) {
  await advanceTo(page, "summary");
  await expect(page.getByRole("heading", { name: "The move in one line" })).toBeVisible();
}
export { kindOf };
