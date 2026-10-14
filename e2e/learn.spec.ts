import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { answerOf, lessons } from "../src/content/learn.ts";
import { advanceTo, finishLesson, kindOf, step, tryFor, whys } from "./learn-helpers";
import { current, read } from "./practice-helpers";
import { seedRecords } from "./results-helpers";

const MOVES = [
  ["nearest-subject", 2],
  ["collective-nouns", 3],
  ["indefinite-pronouns", 4],
  ["one-of-the", 5],
] as const;

/** One saved practice attempt of move 1, so the learner counts as returning. */
const attempt = {
  key: "attempt:seed-1",
  value: {
    attempt: { id: "seed-1", questionId: "seed-1-q", origin: "practice", startedAt: { at: 1, seq: 1 }, completedAt: { at: 2, seq: 2 }, checks: 1, correctOnCheck: 1, help: [], resets: [], freeLook: false, moveSheetOpened: false, reason: "sounded", reasonAt: { at: 3, seq: 3 } },
    question: { id: "seed-1-q", moveId: "strip-disguise", contentVersion: 1, subject: "The teacher", covered: "as well as the pupils", predicate: "the room", number: "sg", pairing: "opposite", options: ["enters", "enter", "entering", "entered"], answer: "enters" },
  },
};

const learningRecords = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const store = open.result.transaction("records").objectStore("records");
          const keys = store.getAllKeys();
          const vals = store.getAll();
          vals.onsuccess = () => {
            const rows = (keys.result as string[]).map((k, i) => [k, vals.result[i]] as const).filter(([k]) => /^(run|cycle|attempt):/.test(String(k)));
            resolve(JSON.stringify(rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])))));
          };
        };
      }),
  );

const scan = async (page: Page) => {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime !== Infinity).map((a) => a.finished.catch(() => {}))));
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
};

const lesson = (id: string) => lessons.find((l) => l.moveId === id)!;

for (const [id, n] of MOVES)
  test(`Move ${n}: the lesson can be completed from its first practice visit`, async ({ page }) => {
    await seedRecords(page, [], `/practice?move=${id}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(page.getByText(lesson(id).intro)).toBeVisible();
    await finishLesson(page);
    await page.getByRole("button", { name: "Start practising" }).click();
    await current(page);
  });

test("Move 1: the lesson can be completed from onboarding", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname").fill("Amaka");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Start Move 1" }).click();
  await expect(page.getByRole("button", { name: "Close the lesson" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "I know the basics" })).toHaveCount(0);
  await finishLesson(page);
  await page.getByRole("button", { name: "Got it — try 3 questions" }).click();
  await expect(page.getByText("1 of 3")).toBeVisible();
});

test("a returning learner can skip the basics", async ({ page }) => {
  await seedRecords(page, [attempt], "/practice?move=nearest-subject");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "The subject" })).toBeFocused();
  await page.getByRole("button", { name: "I know the basics" }).click();
  const first = lesson("nearest-subject").cards[0]!;
  await expect(page.getByRole("heading", { name: "title" in first ? first.title : "" })).toBeFocused();
  await expect(page.getByRole("button", { name: "I know the basics" })).toHaveCount(0);

});

test("a new learner is not offered to skip the basics", async ({ page }) => {
  await seedRecords(page, [], "/practice?move=nearest-subject");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "The subject" })).toBeVisible();
  await expect(page.getByRole("button", { name: "I know the basics" })).toHaveCount(0);
});

test("a wrong reason shows its feedback and keeps Continue disabled; the right one enables it", async ({ page }) => {
  await seedRecords(page, [], "/learn");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "I know the basics" }).click();
  await advanceTo(page, "why");
  const card = whys.find((w) => w.question === "Why is it lives, not live?")!;
  const wrong = card.options.find((o) => !o.correct)!;
  const right = card.options.find((o) => o.correct)!;
  await page.getByRole("button", { name: wrong.text }).click();
  await expect(page.locator(".ln-fb-bad")).toHaveText(wrong.feedback);
  await expect(page.locator(".ln-live")).toHaveAttribute("aria-live", "polite");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await page.getByRole("button", { name: right.text }).click();
  await expect(page.locator(".ln-fb-ok")).toHaveText(right.feedback);
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
});

test("two wrong reasons show the answer and let the learner go on", async ({ page }) => {
  await seedRecords(page, [], "/learn");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "I know the basics" }).click();
  await advanceTo(page, "why");
  const card = whys.find((w) => w.question === "Why is it lives, not live?")!;
  for (const o of card.options.filter((x) => !x.correct)) await page.getByRole("button", { name: o.text }).click();
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  await expect(page.locator(".ln-fb-bad")).toContainText("Here is the reason");
});

/** Move 1's try card: "The boys, as well as their teacher, ___ home together." */
async function toMoveTry(page: Page) {
  await seedRecords(page, [], "/learn");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "I know the basics" }).click();
  await advanceTo(page, "try");
}

test("try: a covered chip gives the hint, the subject moves on, a wrong verb says Not quite, the right verb fills the blank", async ({ page }) => {
  await toMoveTry(page);
  await page.locator(".ln-chips button", { hasText: "teacher," }).click();
  await expect(page.locator(".ln-fb-bad")).toHaveText("That's the part to cover. Look again.");
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.locator(".ln-chips button", { hasText: "boys," }).click();
  await expect(page.getByRole("radio")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await page.getByRole("radio", { name: /: walks$/ }).click();
  await expect(page.locator(".ln-fb-bad")).toContainText("Not quite. The boys: more than one");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await page.getByRole("radio", { name: /: walk$/ }).click();
  await expect(page.locator(".ln-fb-ok")).toContainText("so walk");
  await expect(page.locator(".ls-blank")).toHaveText("walk");
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
});

test("try: another word says to look for who or what the sentence is about", async ({ page }) => {
  await toMoveTry(page);
  await page.getByRole("button", { name: "home", exact: true }).click();
  await expect(page.locator(".ln-fb-bad")).toHaveText("Look for who or what the sentence is about.");
});

test("the lesson writes nothing to the learning records", async ({ page }) => {
  await seedRecords(page, [attempt], "/learn?move=nearest-subject");
  const before = await learningRecords(page);
  expect(before).toContain("attempt:seed-1");
  await finishLesson(page);
  expect(await learningRecords(page)).toBe(before);
  await page.getByRole("button", { name: "Close the lesson" }).click();
  expect(await learningRecords(page)).toBe(before);
});

test("Learn the move again from the move sheet returns to the same unfinished question", async ({ page }) => {
  const seeded = { ...attempt, key: "attempt:c-1", value: { ...attempt.value, question: { ...attempt.value.question, moveId: "collective-nouns" } } };
  await seedRecords(page, [seeded], "/practice?move=collective-nouns");
  const q = await current(page);
  await page.getByRole("button", { name: /^The move:/ }).click();
  await page.getByRole("link", { name: "Learn the move again" }).click();
  await expect(page).toHaveURL(/\/learn\?move=collective-nouns$/);
  await expect(page.getByRole("heading", { name: "The subject" }).or(page.getByRole("heading", { name: "Collective nouns" }))).toBeVisible();
  await page.getByRole("button", { name: "Close the lesson" }).click();
  await expect(page).toHaveURL(/\/practice\?move=collective-nouns$/);
  await expect(page.getByRole("radio").first()).toBeVisible();
  const again = (await read(page)) as { answer: string; options: string[] };
  expect(again.answer).toBe(q.answer);
  expect(again.options).toEqual(q.options);
});

test("the Concord page links each stage to its lesson; Practise this move goes to practice", async ({ page }) => {
  await seedRecords(page, [], "/course/lexis-and-structure/concord");
  await expect(page.getByRole("link", { name: "Learn the move" })).toHaveCount(5);
  await page.getByRole("link", { name: "Learn the move" }).nth(2).click();
  await expect(page).toHaveURL(/\/learn\?move=collective-nouns$/);
  await finishLesson(page);
  await page.getByRole("button", { name: "Practise this move" }).click();
  await expect(page).toHaveURL(/\/practice\?move=collective-nouns$/);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("cards are static and the worked example is stepped with Next", async ({ page }) => {
    await seedRecords(page, [], "/learn");
    const still = () => page.evaluate(() => document.querySelector(".ln")!.getAnimations({ subtree: true }).length);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "The subject" })).toBeVisible();
    expect(await still()).toBe(0);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "One subject, one verb form" })).toBeVisible();
    await expect(page.locator(".ln-sent")).toHaveCount(2); // both forms shown, nothing hops
    expect(await still()).toBe(0);
    await advanceTo(page, "worked");
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await page.getByRole("button", { name: "Next step" }).click();
    await page.getByRole("button", { name: "Next step" }).click();
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(await still()).toBe(0);
  });
});

test("the keyboard alone can finish a lesson; Esc closes", async ({ page }) => {
  await seedRecords(page, [], "/learn?move=nearest-subject");
  for (let i = 0; i < 30 && (await kindOf(page)) !== "summary"; i++) {
    const k = await kindOf(page);
    if (k === "why") {
      const q = (await page.locator(".ln-h").innerText()).trim();
      await page.keyboard.press(String(whys.find((w) => w.question === q)!.options.findIndex((o) => o.correct) + 1));
    } else if (k === "try") {
      const chips = (await page.locator(".ln-chips button").allInnerTexts()).map((t) => t.trim());
      const card = tryFor(chips);
      await page.getByRole("button", { name: card.sentence.parts.find((p) => p.role === "subject")!.text.split(" ")[0]!, exact: true }).first().focus();
      await page.keyboard.press("Enter"); // the subject chip
      await expect(page.getByRole("radio")).toHaveCount(4);
      const labels = await page.getByRole("radio").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")!));
      await page.keyboard.press(String(labels.findIndex((l) => l.endsWith(`: ${answerOf(card.sentence)}`)) + 1));
    }
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("heading", { name: "The move in one line" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/\/learn/);
});

test("axe passes on a define, a why and a try card", async ({ page }) => {
  await seedRecords(page, [], "/learn");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "The subject" })).toBeFocused();
  await scan(page);
  await page.getByRole("button", { name: "I know the basics" }).click();
  await advanceTo(page, "why");
  await scan(page);
  await page.getByRole("button", { name: lesson("strip-disguise").cards.find((c) => c.kind === "why")!.options.find((o) => !o.correct)!.text }).click();
  await scan(page); // the error feedback is on screen
  await advanceTo(page, "try");
  await scan(page);
  await page.locator(".ln-chips button").first().click();
  await scan(page); // the tiles
});

for (const [w, h] of [[360, 800], [768, 1024], [1366, 768]] as const)
  for (const zoom of [1, 2])
    test(`no horizontal overflow at ${w}px, text at ${zoom * 100}%`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await seedRecords(page, [], "/learn");
      if (zoom === 2) await page.addStyleTag({ content: "html { font-size: 200%; }" });
      const over = async () => {
        await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime !== Infinity).map((a) => a.finished.catch(() => {}))));
        return page.evaluate(() => {
          const bad = [...document.querySelectorAll(".ln-card *")].find((e) => e.getBoundingClientRect().right > innerWidth + 1 || e.getBoundingClientRect().left < -1);
          return document.documentElement.scrollWidth > innerWidth ? "page" : bad ? `${bad.tagName}.${bad.className} ${JSON.stringify(bad.getBoundingClientRect())}` : "";
        });
      };
      for (let i = 0; i < 30; i++) {
        await expect.poll(over, { message: `card ${i}` }).toBe("");
        if ((await kindOf(page)) === "summary") break;
        await step(page);
      }
    });
