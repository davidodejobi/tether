import { expect, test, type Page } from "@playwright/test";

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
  await page.getByLabel("Nickname").fill(nickname);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /Cover the side phrase/ })).toBeFocused();
}

async function throughLesson(page: Page) {
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: /What's left/ })).toBeFocused();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /Got it/ }).click();
  await expect(page.getByText("Three tutorial questions")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "First win" })).toBeFocused();
}

test("a new learner reaches Home with their choices saved", async ({ page }) => {
  await toLesson(page);
  await throughLesson(page);
  await page.getByRole("button", { name: "Make Tether yours" }).click();
  await page.getByText("Text only").click();
  await page.getByText("Pidgin").click();
  await expect(page.getByText("Unreviewed")).toBeVisible();
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

test("a reload mid-lesson resumes the lesson", async ({ page }) => {
  await toLesson(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Cover the side phrase/ })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /Got it/ }).click();
  await expect(page.getByText("Three tutorial questions")).toBeVisible(); // saved before the step changes
  await page.reload();
  await expect(page.getByText("Three tutorial questions")).toBeVisible();
});

test("an empty or 31-character nickname is refused", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "1 to 30" })).toBeVisible();
  await page.getByLabel("Nickname").fill("a".repeat(31));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "1 to 30" })).toBeVisible();
  expect(await savedLearner(page)).toBeNull();
  await page.getByLabel("Nickname").fill("a".repeat(30));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /Cover the side phrase/ })).toBeVisible();
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
  await expect(page.getByText("No animation")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("button", { name: /Got it/ })).toBeVisible();
});
