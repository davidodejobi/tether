import { expect, test } from "@playwright/test";
import { answerRight, current, lastAttempt, next, records } from "./practice-helpers";
import { cycle, finishedRun, seedRecords } from "./results-helpers";
import { activeRun, answer, idb, runs } from "./run-helpers";

// Stages 2 to 5 play like stage 1, with progress kept apart per move.
const MOVES = [
  ["nearest-subject", 2, "Either…or, neither…nor: the nearest subject"],
  ["collective-nouns", 3, "Collective nouns"],
  ["indefinite-pronouns", 4, "Each, everyone, none"],
  ["one-of-the", 5, "One of the … who/that"],
] as const;
const TOPIC = "/course/lexis-and-structure/concord";

/** A seeded practice attempt of a move, finished with a claimed move (a dot) or an honest "sounded right". */
const attempt = (moveId: string, i: number, reason: "move" | "sounded" = "move") => {
  const id = `${moveId}-seed-${i}`;
  const at = (n: number) => ({ at: Date.now() - 1000 + n, seq: i * 10 + n });
  return {
    key: `attempt:${id}`,
    value: {
      attempt: { id, questionId: `${id}-q`, origin: "practice", startedAt: at(1), completedAt: at(2), checks: 1, correctOnCheck: 1, help: [], resets: [], freeLook: false, moveSheetOpened: false, reason, reasonAt: at(3), ...(reason === "move" ? { verifySampled: false } : {}) },
      question: { id: `${id}-q`, moveId, contentVersion: 1, subject: "The teacher", covered: "as well as the pupils", predicate: "the room", number: "sg", pairing: "opposite", options: ["enters", "enter", "entering", "entered"], answer: "enters" },
    },
  };
};
/** A finished-run record or cycle of another move: the helpers write move 1. */
const forMove = <T extends { key: string; value: any }>(rec: T, moveId: string): T => {
  const value = JSON.parse(JSON.stringify(rec.value));
  if (value.questions) value.questions.forEach((q: any) => (q.moveId = moveId));
  if (value.moveId) value.moveId = moveId;
  return { key: rec.key.replace("strip-disguise", moveId), value } as T;
};
const dueCycle = (moveId: string, due: string) => forMove(cycle("held", "g1", "2026-10-01", due), moveId);
const noOverflow = (page: import("@playwright/test").Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

for (const [id, n, title] of MOVES)
  for (const from of ["the Concord page", "the map"] as const)
    test(`Move ${n} opens from ${from} with an intro, then a question of its own move`, async ({ page }) => {
      await seedRecords(page, [], from === "the map" ? "/" : TOPIC);
      if (from === "the map") await page.getByRole("region", { name: "Journey map" }).getByRole("link", { name: new RegExp(`^Stage ${n}, Move ${n}:.*Available`) }).click();
      else await page.getByRole("link", { name: `Practise Move ${n}` }).click();
      await expect(page).toHaveURL(new RegExp(`/practice\\?move=${id}$`));
      // The intro is the move's own example; it records nothing.
      await page.getByRole("button", { name: "Start practising" }).click();
      const q = await current(page);
      expect((await records(page)).length).toBe(1);
      await answerRight(page);
      const saved = await lastAttempt(page, (a) => a.reason === "sounded");
      expect(saved.question.moveId).toBe(id);
      expect(saved.question.answer).toBe(q.answer);
      await next(page);
      // Back on the same move: no intro any more.
      await page.goto(`/practice?move=${id}`);
      await expect(page.getByRole("button", { name: "Start practising" })).toHaveCount(0);
      await expect(page.getByRole("radio").first()).toBeVisible();
      expect(title.length).toBeGreaterThan(0);
    });

test("dots and rounds are per move", async ({ page }) => {
  const m1 = [1, 2, 3].map((i) => attempt("strip-disguise", i));
  await seedRecords(page, [...m1, attempt("nearest-subject", 4)], "/?move=strip-disguise");
  await expect(page.getByRole("img", { name: "Readiness 3 of 3" })).toBeVisible();
  await page.goto("/?move=nearest-subject");
  await expect(page.getByRole("img", { name: "Readiness 1 of 3" })).toBeVisible();
  await expect(page.getByText("JAMB English concord. Move 2:")).toBeVisible();
  // One move-2 question is done, so move 2's round is on question 2 (and skips the intro: it has an attempt); move 1's would be 4.
  await page.goto("/practice?move=nearest-subject");
  await expect(page.getByRole("progressbar", { name: "Question 2 of 5" })).toBeVisible();
  await answerRight(page);
  await next(page);
  await expect(page.getByRole("progressbar", { name: "Question 3 of 5" })).toBeVisible();
  await page.goto("/practice");
  await expect(page.getByRole("progressbar", { name: "Question 4 of 5" })).toBeVisible();
  await page.goto("/?move=strip-disguise");
  await expect(page.getByRole("img", { name: "Readiness 3 of 3" })).toBeVisible();
  await page.goto("/?move=nearest-subject");
  await expect(page.getByRole("img", { name: "Readiness 1 of 3" })).toBeVisible();
});

test("an unfinished question comes back in its own move only", async ({ page }) => {
  const m1 = attempt("strip-disguise", 1);
  await seedRecords(page, [m1], "/practice?move=nearest-subject");
  await page.getByRole("button", { name: "Start practising" }).click();
  await current(page);
  const open = async (moveId: string) => (await records(page)).filter((r) => r.question.moveId === moveId && r.attempt.completedAt === undefined);
  const [first] = await open("nearest-subject");
  expect(first).toBeTruthy();
  // Move 1 gets a move-1 question, not the half-done move-2 one.
  await page.goto("/practice");
  await expect.poll(async () => (await open("strip-disguise")).length).toBe(1);
  expect(await open("nearest-subject")).toHaveLength(1);
  // Move 2 comes back as it was, with no new attempt and no intro.
  await page.goto("/practice?move=nearest-subject");
  await expect(page.getByRole("radio").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Start practising" })).toHaveCount(0);
  expect((await open("nearest-subject")).map((r) => r.attempt.id)).toEqual([first.attempt.id]);
  expect((await records(page)).filter((r) => r.question.moveId === "nearest-subject")).toHaveLength(1);
});

test("a solo check of Move 3 is all Move 3, earns its own proof and leaves Move 1 alone", async ({ page }) => {
  await seedRecords(page, [], "/solo-entry?move=collective-nouns");
  await expect(page.getByRole("heading", { name: "You're not solo-ready yet." })).toBeVisible();
  await page.getByRole("button", { name: "Try anyway" }).click();
  await expect(page).toHaveURL(/\/run\/solo\?move=collective-nouns$/);
  for (let i = 1; i <= 10; i++) await answer(page, true, i);
  await expect(page).toHaveURL(/\/result\//);
  const [done] = await runs(page);
  expect(done.questions).toHaveLength(10);
  expect(done.questions.every((q: any) => q.moveId === "collective-nouns")).toBe(true);
  expect(done.run.result.passed).toBe(true);
  const keys = await idb(page, (rows) => rows.map(([k]) => String(k)).filter((k) => k.startsWith("cycle:")));
  expect(keys).toEqual(["cycle:collective-nouns"]);
  await expect(page.getByText("Move 3: Collective nouns")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Passed. You are Proved." })).toBeVisible();

  await page.getByRole("button", { name: "Share proof" }).click();
  await expect(page.getByRole("img", { name: /Share card:.*Move 3: Collective nouns/ })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue(/Move 3: Collective nouns/);

  // Home follows the latest activity: Move 3 is Proved, Move 1 is untouched.
  await page.goto("/");
  await expect(page.getByText("JAMB English concord. Move 3: Collective nouns.")).toBeVisible();
  const map = page.getByRole("region", { name: "Journey map" });
  await expect(map.getByRole("link", { name: /^Stage 3, Move 3: Collective nouns\. Proved\./ })).toBeVisible();
  await expect(map.getByRole("link", { name: /^Stage 1, Move 1: .*Available\./ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Practise Move 3" })).toHaveAttribute("href", "/practice?move=collective-nouns");
  await page.goto("/?move=strip-disguise");
  await expect(page.getByText("JAMB English concord. Move 1: Strip the Disguise.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Practise Move 1" })).toHaveAttribute("href", "/practice");
  await expect(page.getByRole("img", { name: "Readiness 0 of 3" })).toBeVisible();
  expect(await runs(page)).toHaveLength(1);

  await page.goto(TOPIC);
  await expect(page.getByText("Move 3: Collective nouns. Proved.")).toBeVisible();
  await expect(page.getByText("Move 1: Strip the Disguise. Current.")).toHaveCount(0);
  await expect(page.getByText("Completed", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Concord: 8 planned stages · 5 available · 1 completed")).toBeVisible();
});

test("a recheck due for Move 4 is offered on Home and asks only Move 4 questions", async ({ page }) => {
  const g = forMove(finishedRun("g4", "solo", 9, { n: 1, practice: 9, daysAgo: 5 }), "indefinite-pronouns");
  const p1 = finishedRun("g1", "solo", 9, { n: 2, practice: 9 });
  await seedRecords(page, [g, p1, dueCycle("indefinite-pronouns", "2026-10-04"), cycle("held", "g1", "2026-10-12", "2099-01-01")], "/");
  await expect(page.getByText("JAMB English concord. Move 4: Each, everyone, none.")).toBeVisible();
  await expect(page.getByText("Recheck due today.").or(page.getByText("Your recheck is waiting."))).toBeVisible();
  const link = page.getByRole("link", { name: "Start recheck" });
  await expect(link).toHaveAttribute("href", "/recheck-entry?move=indefinite-pronouns");
  await expect(page.getByRole("region", { name: "Journey map" }).getByRole("link", { name: /^Stage 4, Move 4: .*Held, due\./ })).toBeVisible();
  await link.click();
  await expect(page.getByRole("heading", { name: "Time for your recheck" })).toBeVisible();
  await page.getByRole("link", { name: "Start recheck" }).click();
  await expect(page).toHaveURL(/\/run\/recheck\?move=indefinite-pronouns$/);
  for (let i = 1; i <= 5; i++) await answer(page, true, i, 5);
  await expect(page).toHaveURL(/\/result\//);
  const rechecks = (await runs(page)).filter((r: any) => r.run.kind === "recheck");
  expect(rechecks).toHaveLength(1);
  expect(rechecks[0].questions.every((q: any) => q.moveId === "indefinite-pronouns")).toBe(true);
  expect(rechecks[0].run.result.passed).toBe(true);
  await expect(page.getByText("Move 4: Each, everyone, none")).toBeVisible();
  expect(await activeRun(page)).toBeUndefined();
});

test("course counts treat each move's pass once", async ({ page }) => {
  const a = forMove(finishedRun("a", "solo", 9, { n: 1, practice: 9, daysAgo: 3 }), "nearest-subject");
  const a2 = forMove(finishedRun("a2", "solo", 10, { n: 2, practice: 10, daysAgo: 2 }), "nearest-subject");
  const b = forMove(finishedRun("b", "solo", 8, { n: 3, practice: 9, daysAgo: 1 }), "one-of-the");
  await seedRecords(page, [a, a2, b, dueCycle("nearest-subject", "2099-01-01"), dueCycle("one-of-the", "2099-01-01")], "/course");
  await expect(page.getByText("English · 5 of 50 stages available · 2 completed")).toBeVisible();
  await expect(page.getByText("English · 50 planned stages · 5 available · 2 completed")).toBeVisible();
  await page.goto(TOPIC);
  await expect(page.getByText("Concord: 8 planned stages · 5 available · 2 completed")).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toHaveCount(2);
  await expect(page.getByText(/course (is )?complete/i)).toHaveCount(0);
  await page.goto("/course/lexis-and-structure");
  await expect(page.getByText("Lexis and Structure: 33 planned stages · 5 available · 2 completed")).toBeVisible();
});

test("the map's stages 1 to 5 are links with their own states, 6 to 50 stay Coming soon", async ({ page }) => {
  await seedRecords(page, [attempt("one-of-the", 1), dueCycle("collective-nouns", "2099-01-01")], "/");
  const map = page.getByRole("region", { name: "Journey map" });
  await expect(map.getByRole("link")).toHaveCount(5);
  await expect(map.getByText("Coming soon")).toHaveCount(45);
  await expect(map.getByRole("link", { name: /^Stage 5, Move 5: .*Current\. Open practice\.$/ })).toHaveAttribute("href", "/practice?move=one-of-the");
  await expect(map.getByRole("link", { name: /^Stage 3, Move 3: Collective nouns\. Held\./ })).toHaveAttribute("href", "/practice?move=collective-nouns");
  await expect(map.getByRole("link", { name: /^Stage 2, Move 2: .*Available\./ })).toHaveAttribute("href", "/practice?move=nearest-subject");
  await expect(map.getByRole("link", { name: /^Stage 1, Move 1: .*Available\./ })).toHaveAttribute("href", "/practice");
  await page.getByRole("button", { name: "List view" }).click();
  await expect(page.getByRole("link", { name: /^Stage 2, Move 2: .*Available\.$/ })).toHaveAttribute("href", "/practice?move=nearest-subject");
  await expect(page.getByRole("list").filter({ hasText: "Stage 6: Plural-looking singulars. Coming soon." })).toBeVisible();
  // Tapping a stage on the map goes to that move's practice (its intro, the first time).
  await page.getByRole("button", { name: "Map view" }).click();
  await map.getByRole("link", { name: /^Stage 2, Move 2:/ }).click();
  await expect(page).toHaveURL(/\/practice\?move=nearest-subject$/);
  // The intro plays three beats before its button appears.
  await expect(page.getByRole("button", { name: "Start practising" })).toBeVisible({ timeout: 15_000 });
});

for (const [w, h] of [[360, 800], [768, 1024], [1366, 768]] as const)
  test(`no horizontal overflow on Home and the course with five open stages at ${w}px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await seedRecords(page, [attempt("one-of-the", 1), dueCycle("collective-nouns", "2026-10-04")], "/");
    for (const size of ["16px", "32px"])
      for (const path of ["/", "/course", "/course/lexis-and-structure", TOPIC]) {
        await page.goto(path);
        await page.addStyleTag({ content: `html{font-size:${size} !important}` });
        expect(await noOverflow(page), `${path} ${w}px @${size}`).toBe(true);
      }
  });

