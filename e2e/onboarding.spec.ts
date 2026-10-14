import { expect, test, type Page } from "@playwright/test";
import { seedRecords } from "./results-helpers";
import { finishLesson } from "./learn-helpers";
import { answerTutorials } from "./tutorial";

const savedLearner = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<Record<string, unknown> | null>((resolve, reject) => {
        const open = indexedDB.open("tether");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const get = open.result.transaction("records").objectStore("records").get("learner");
          get.onsuccess = () => resolve((get.result as Record<string, unknown>) ?? null);
        };
      }),
  );

async function toLesson(page: Page, nickname = "Amaka") {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname").fill(nickname);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Start Move 1" }).click();
  await expect(page.getByRole("heading", { name: "Strip the Disguise" })).toBeFocused();
}

async function throughLesson(page: Page) {
  await finishLesson(page);
  await page.getByRole("button", { name: /Got it/ }).click();
  await answerTutorials(page);
  await expect(page.getByRole("heading", { name: "First win" })).toBeFocused();
}

test("a new learner reaches Home with their choices saved", async ({ page }) => {
  await toLesson(page);
  await throughLesson(page);
  await page.getByRole("button", { name: "Make Tether yours" }).click();
  await page.getByText("Text only").click();
  await page.getByText("Pidgin").click();
  await expect(page.getByText("Unreviewed")).toHaveCount(0); // owner decision: no review labels
  await page.getByRole("button", { name: /Someone to see your wins/ }).click();
  await page.getByLabel(/Their name/).fill("Mrs Okafor");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();
  expect(await savedLearner(page)).toMatchObject({
    nickname: "Amaka",
    lessonDone: true,
    onboarded: true,
    coach: "text",
    lang: "pcm",
    readAloud: false,
    partner: { name: "Mrs Okafor" },
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();
});

test("skipping preferences keeps the defaults", async ({ page }) => {
  await toLesson(page);
  await throughLesson(page);
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();
  expect(await savedLearner(page)).toMatchObject({ onboarded: true, coach: "character", lang: "en", readAloud: false, partner: null });
});

test("a reload before the lesson resumes at the course map; an old learner without subjects resumes the lesson", async ({ page }) => {
  await toLesson(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your English course" })).toBeVisible();
  await page.getByRole("button", { name: "Start Move 1" }).click();
  await finishLesson(page);
  await page.getByRole("button", { name: /Got it/ }).click();
  await expect(page.getByText("1 of 3")).toBeVisible(); // saved before the step changes
  await page.reload();
  await expect(page.getByText("1 of 3")).toBeVisible();
});

test("an empty or 31-character nickname is refused", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "1 to 30" })).toBeVisible();
  await page.getByLabel("Nickname").fill("a".repeat(31));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "1 to 30" })).toBeVisible();
  expect(await savedLearner(page)).toBeNull();
  await page.getByLabel("Nickname").fill("a".repeat(30));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Your English course" })).toBeVisible();
});

test("a second tab is read-only", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByRole("heading", { name: "Tether is open in another tab" })).toBeVisible();
  await expect(other.getByRole("button", { name: "Start" })).toHaveCount(0);
});

test("reduced motion shows the static lesson", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await toLesson(page);
  await finishLesson(page);
  await expect(page.getByRole("button", { name: /Got it/ })).toBeVisible();
  expect(await page.evaluate(() => document.querySelector(".ln")!.getAnimations({ subtree: true }).length)).toBe(0);
});

const toSubjects = async (page: Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByRole("heading", { name: "Pick your subjects" })).toBeFocused();
};

test("English is fixed; the other subjects are Coming soon and optional", async ({ page }) => {
  await toSubjects(page);
  const english = page.getByRole("checkbox", { name: /Use of English/ });
  await expect(english).toBeChecked();
  await expect(english).toBeDisabled();
  await expect(page.getByText("Everyone takes Use of English")).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(25); // English + the 24 listed subjects
  await expect(page.getByText("Coming soon")).toHaveCount(24);
  await expect(page.getByText("Subjects from JAMB's IBASS e-syllabus")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click(); // none picked is fine
  await expect(page.getByRole("heading", { name: "What should we call you?" })).toBeFocused();
});

test("no more than 3 other subjects; choices and the course map persist across reload", async ({ page }) => {
  await toSubjects(page);
  for (const n of ["Biology", "Chemistry", "Physics"]) await page.getByRole("checkbox", { name: new RegExp(n) }).check();
  await expect(page.getByText(/You picked 3 of 3/)).toBeVisible();
  const fourth = page.getByRole("checkbox", { name: /Mathematics/ });
  await expect(fourth).toBeDisabled();
  await page.getByRole("checkbox", { name: /Physics/ }).uncheck();
  await expect(fourth).toBeEnabled();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname").fill("Amaka");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Your English course" })).toBeFocused();
  for (const name of ["Comprehension and Summary", "Lexis and Structure", "Oral Forms"]) await expect(page.getByText(new RegExp(name)).first()).toBeVisible();
  await expect(page.getByText("Lexis and Structure → Concord → Move 1: Strip the Disguise")).toBeVisible();
  expect(await savedLearner(page)).toMatchObject({ subjects: ["english", "biology", "chemistry"] });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your English course" })).toBeVisible(); // resumes at the course map
  await page.getByRole("button", { name: "Start Move 1" }).click();
  await expect(page.getByRole("heading", { name: "Strip the Disguise" })).toBeVisible();
});

test("a reload at the subjects step starts over, because nothing is saved before the nickname", async ({ page }) => {
  await toSubjects(page);
  await page.getByRole("checkbox", { name: /Biology/ }).check();
  await page.reload();
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  expect(await savedLearner(page)).toBeNull();
});

test("an existing learner without subjects goes straight to Home and is left unchanged", async ({ page }) => {
  await seedRecords(page, [], "/");
  await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();
  expect((await savedLearner(page))?.subjects).toBeUndefined();
});
