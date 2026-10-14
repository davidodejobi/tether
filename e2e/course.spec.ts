import { expect, test, type Page } from "@playwright/test";
import { cycle, finishedRun, seedRecords } from "./results-helpers";

// Step 17a: the English destination preview.
const SECTION = "/course/lexis-and-structure";
const TOPIC = `${SECTION}/concord`;
const held = cycle("held", "g1", "2026-10-01", "2026-10-04");
const due = { ...held, key: "cycle:strip-disguise" };
const gap = finishedRun("g1", "solo", 8, { n: 1, practice: 10 });

/** Saved runs and proof cycles, as stored. Compared before and after browsing so the preview is shown to write nothing. */
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

test("a new learner sees the English destination and reaches Move 1 from the topic", async ({ page }) => {
  await seedRecords(page, [], "/");
  // On a phone the course link sits under More in the action sheet.
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("link", { name: "English course: Lexis and Structure → Concord" }).click();
  await expect(page).toHaveURL(/\/course$/);
  await expect(page.getByRole("heading", { name: "English course" })).toBeVisible();
  await expect(page.getByText("Lexis and Structure, Concord, Strip the Disguise")).toBeVisible();
  await expect(page.getByText("Move 1: Strip the Disguise. Current.")).toBeVisible();
  await expect(page.getByText("Exam day (Coming soon)")).toBeVisible();
  // Official counts on the sections; only Lexis and Structure has anything available.
  await expect(page.getByText("25 questions in the exam")).toHaveCount(2);
  await expect(page.getByText("10 questions in the exam")).toHaveCount(1);
  await expect(page.getByText("English · 50 planned stages · 1 available · 0 completed")).toBeVisible();
  await expect(page.getByText("English · 1 of 50 stages available · 0 completed")).toBeVisible();
  await expect(page.getByText("33 planned stages · 1 available")).toBeVisible();

  await page.getByRole("link", { name: "B. Lexis and Structure" }).click();
  await expect(page.getByRole("heading", { name: "Lexis and Structure" })).toBeVisible();
  await expect(page.getByText("Lexis and Structure: 33 planned stages · 1 available · 0 completed")).toBeVisible();
  // Concord inherits no question count, even though Basic grammar has 10.
  const concord = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Concord" }) });
  await expect(concord).not.toContainText("questions");
  await expect(page.getByText("5 exam questions in this category")).toHaveCount(3);
  await page.getByRole("link", { name: "Concord" }).click();

  await expect(page.getByText("Stage 1 of 33")).toBeVisible();
  await expect(page.getByRole("link", { name: "English course" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lexis and Structure" })).toBeVisible();
  await page.getByRole("link", { name: "Practise Move 1" }).click();
  await expect(page).toHaveURL(/\/practice$/);
});

test("an existing learner resumes practice and takes an early solo check from the topic", async ({ page }) => {
  await seedRecords(page, [gap], TOPIC);
  await page.getByRole("link", { name: "Solo check" }).click();
  await expect(page).toHaveURL(/\/solo-entry$/);
  await page.getByRole("button", { name: "Try anyway" }).click();
  await expect(page.getByRole("heading", { name: /^Question 1 of 10/ })).toBeVisible();
});

test("a due recheck is offered on the topic, and browsing changes no score or schedule", async ({ page }) => {
  await seedRecords(page, [gap, due], "/");
  const before = await learningRecords(page);
  expect(before).toContain("cycle:strip-disguise");
  for (const path of ["/course", SECTION, TOPIC]) await page.goto(path);
  await expect(page.getByRole("link", { name: "Start recheck" })).toHaveAttribute("href", "/recheck-entry");
  await expect(page.getByText("Move 1: Strip the Disguise. Held, due.").first()).toBeVisible();
  await page.getByRole("link", { name: "Start recheck" }).click();
  await expect(page).toHaveURL(/\/recheck-entry/);
  await page.goto(TOPIC);
  await expect(page.getByRole("link", { name: "Start recheck" })).toBeVisible();
  expect(await learningRecords(page)).toBe(before);
});

test("every planned topic is reachable, and planned stages are plain text with no controls", async ({ page }) => {
  await seedRecords(page, [], "/course");
  await expect(page.getByRole("list", { name: "Sections" }).getByRole("link")).toHaveCount(3);
  await page.goto(SECTION);
  const topics = page.getByRole("list", { name: "Topics" });
  await expect(topics.getByRole("link")).toHaveCount(11);
  await expect(topics.getByRole("button")).toHaveCount(0);
  await page.getByRole("link", { name: "Antonyms" }).click();
  const stages = page.getByRole("list", { name: "Stages" });
  await expect(stages.getByRole("listitem")).toHaveCount(2);
  await expect(stages.getByText("Coming soon", { exact: true })).toHaveCount(2);
  await expect(stages.getByRole("link")).toHaveCount(0);
  await expect(stages.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Practise Move 1" })).toHaveCount(0);
  await expect(stages.getByText("Stage 28 of 33 planned")).toBeVisible();
  await page.goto("/course/oral-forms/emphatic-stress");
  await expect(page.getByText("Stage 8 of 8 planned")).toBeVisible();
  await page.goto("/course/oral-forms");
  await expect(page.getByText("Oral Forms: 8 planned stages · 0 available · 0 completed")).toBeVisible();
  await page.goto("/course/oral-forms/nope");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.goto("/course/nope");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("completed counts once per move after repeat solo passes, and never claims the course is done", async ({ page }) => {
  const p1 = finishedRun("p1", "solo", 9, { n: 1, practice: 9, daysAgo: 2 });
  const p2 = finishedRun("p2", "solo", 10, { n: 2, practice: 10 });
  await seedRecords(page, [p1, p2, cycle("proved", "p1", "2026-10-12", "2026-10-15")], "/course");
  await expect(page.getByText("English · 1 of 50 stages available · 1 completed")).toBeVisible();
  await expect(page.getByText("English · 50 planned stages · 1 available · 1 completed")).toBeVisible();
  await page.goto(TOPIC);
  await expect(page.getByText("Concord: 8 planned stages · 1 available · 1 completed")).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toHaveCount(1);
  await expect(page.getByText(/course (is )?complete/i)).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByText("English · 1 of 50 stages available · 1 completed")).toBeVisible();
});

test("a Fading move stays completed and needs review", async ({ page }) => {
  const g = finishedRun("p1", "solo", 9, { n: 1, practice: 9, daysAgo: 20 });
  await seedRecords(page, [g, cycle("fading", "p1", "2026-09-20", "2026-09-23")], "/course");
  await expect(page.getByText("English · 1 of 50 stages available · 1 completed · 1 needs review")).toBeVisible();
});

test("a failed solo leaves completed at 0", async ({ page }) => {
  await seedRecords(page, [finishedRun("f1", "solo", 4, { n: 1, practice: 9 })], "/course");
  await expect(page.getByText("English · 1 of 50 stages available · 0 completed")).toBeVisible();
});

test("the whole path works from the keyboard", async ({ page }) => {
  await seedRecords(page, [], "/course");
  const tabTo = async (name: string) => {
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      if (await page.getByRole("link", { name, exact: true }).evaluate((el) => el === document.activeElement)) return;
    }
    throw new Error(`could not Tab to ${name}`);
  };
  await tabTo("B. Lexis and Structure");
  await expect(page.getByRole("link", { name: "B. Lexis and Structure" })).toBeFocused();
  await page.keyboard.press("Enter");
  await tabTo("Concord");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Stage 1 of 33")).toBeVisible();
  await tabTo("Practise Move 1");
});

for (const [w, h] of [[360, 800], [768, 1024], [1366, 768]] as const)
  test(`no horizontal overflow at ${w}px, at normal and 200% text`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await seedRecords(page, [gap, due], "/");
    for (const size of ["16px", "32px"]) {
      for (const path of ["/", "/course", SECTION, TOPIC, "/course/lexis-and-structure/tense-and-mood"]) {
        await page.goto(path);
        await page.addStyleTag({ content: `html{font-size:${size} !important}` });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${path} ${w}px @${size}`).toBe(true);
      }
    }
  });

for (const [w, h] of [[360, 800], [768, 1024], [1366, 768]] as const)
  test(`Home's long map fills its space at ${w}px and stage 1 is in view`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await seedRecords(page, [], "/");
    const map = page.getByRole("region", { name: "Journey map" });
    const node = map.getByRole("link", { name: /Move 1/ });
    await expect(node).toBeInViewport();
    const [m, n] = await Promise.all([map.boundingBox(), node.boundingBox()]);
    expect(n!.y).toBeGreaterThanOrEqual(m!.y);
    expect(n!.y + n!.height).toBeLessThanOrEqual(m!.y + m!.height);
    // From 768 px the map takes the full height and most of the width; on a phone it is the tallest block on the screen.
    if (w >= 768) expect(m!.height).toBeGreaterThanOrEqual(h - 1);
    if (w >= 768) expect(m!.width).toBeGreaterThan(w * 0.45);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("list").filter({ hasText: "Stage 50: Emphatic stress. Coming soon." })).toBeVisible();
  });

test("the course page reloads offline once Ready offline shows", async ({ page, context }) => {
  await seedRecords(page, [], "/");
  await expect(page.getByText("Ready offline")).toBeVisible();
  await page.goto("/course");
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "English course" })).toBeVisible();
  await page.goto(TOPIC);
  await expect(page.getByText("Stage 1 of 33")).toBeVisible();
});
