import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { current, LEARNER, seed, tile } from "./practice-helpers";
import { cycle, finishedRun, seedRecords } from "./results-helpers";

// Step 18 part B, against the production preview: sharing, cold offline reopening and the pilot measures (spec 11, 13, 15).

const iso = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

const rows = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<[string, any][]>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const store = open.result.transaction("records").objectStore("records");
          const keys = store.getAllKeys();
          keys.onsuccess = () => {
            const vals = store.getAll();
            vals.onsuccess = () => resolve(keys.result.map((k, i) => [String(k), vals.result[i]]));
          };
        };
      }),
  );
const withPrefix = async (page: Page, prefix: string) => (await rows(page)).filter(([k]) => k.startsWith(prefix)).map(([, v]) => v);
const put = (page: Page, key: string, value: unknown) =>
  page.evaluate(
    ([k, v]) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const tx = open.result.transaction("records", "readwrite");
          tx.objectStore("records").put(v, k as string);
          tx.oncomplete = () => resolve();
        };
      }),
    [key, value] as const,
  );
const cacheComplete = (page: Page) =>
  page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return new Promise<boolean>((resolve) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = (e) => resolve(e.data.missing === 0);
      reg.active!.postMessage({ type: "status" }, [ch.port2]);
    });
  });

/** Answers question n of a run; the saved active run holds the answer, as the UI never shows it. */
async function answerRun(page: Page, n: number, of: number, right: boolean) {
  await expect(page.getByRole("heading", { name: new RegExp(`^Question ${n} of ${of}`) })).toBeVisible();
  const active = async () => (await withPrefix(page, "run:")).find((r) => r.run.status === "active");
  await expect.poll(async () => (await active())?.run.submissions.length).toBe(n - 1);
  const q = (await active()).questions[n - 1];
  const word = right ? q.answer : q.options.find((o: string) => o !== q.answer);
  await page.getByRole("radio", { name: new RegExp(`: ${word}$`) }).click();
  await page.getByRole("button", { name: n === of ? "Finish" : "Next" }).click();
}
const runTo = async (page: Page, path: string, of: number, right: number) => {
  await page.goto(path);
  for (let n = 1; n <= of; n++) await answerRun(page, n, of, n <= right);
};

test.describe("sharing", () => {
  test("a solo pass leads to Share proof, the preview, a PNG download and copied text", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await seed(page);
    await runTo(page, "/run/solo", 10, 9);
    await expect(page.getByRole("heading", { name: /Passed/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Share progress" })).toHaveCount(0);
    await page.getByRole("button", { name: "Share proof" }).click();
    await expect(page.locator("img.sh-card")).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download card" }).click()]);
    expect(download.suggestedFilename()).toMatch(/\.png$/);
    expect([...readFileSync((await download.path())!).subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    const message = await page.getByLabel("Message").inputValue();
    expect(message).not.toBe("");
    await page.getByRole("button", { name: "Copy text" }).click();
    await expect(page.getByRole("status")).toHaveText("Text copied.");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(message);
  });

  test("a not-yet result with an improved gap offers only Share progress", async ({ page }) => {
    await seedRecords(page, [finishedRun("a", "solo", 5, { n: 1, practice: 9, daysAgo: 4 }), finishedRun("b", "solo", 7, { n: 2, practice: 9 })], "/result/b");
    await expect(page.getByRole("button", { name: "Share progress" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Share proof" })).toHaveCount(0);
  });

  test("cancelling the share sheet leaves progress intact", async ({ page }) => {
    await page.addInitScript(() => Object.assign(navigator, { canShare: () => true, share: () => Promise.reject(new DOMException("cancelled", "AbortError")) }));
    await seedRecords(page, [finishedRun("a", "solo", 9, { n: 1, practice: 9 }), cycle("proved", "a", iso(0), iso(3))], "/share/a?kind=proof");
    const progress = async () => (await rows(page)).filter(([k]) => /^(run|cycle|attempt):/.test(k));
    const before = await progress();
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("");
    expect(await progress()).toEqual(before);
    await page.getByRole("button", { name: "Back to result" }).click();
    await expect(page.getByRole("img", { name: "Proved" })).toBeVisible();
  });
});

test.describe("offline reopening", () => {
  test("a cold new page reopens Home with saved progress, and practice, solo and Settings work", async ({ page, context }) => {
    const proved = { moveId: "strip-disguise", timeZone: "Africa/Lagos", state: "proved", earnedOn: "2099-03-01", anchor: "2099-03-01", entries: [{ id: "2099-03-01+3", day: 3, due: "2099-03-04", status: "scheduled" }], history: [] };
    await page.goto("/");
    await page.getByRole("button", { name: "Start" }).waitFor();
    await put(page, "learner", LEARNER);
    await put(page, "cycle:strip-disguise", proved);
    await page.goto("/");
    await expect(page.getByText("Ready offline")).toBeVisible();
    expect(await cacheComplete(page)).toBe(true);
    await page.close();
    await context.setOffline(true);

    const cold = await context.newPage();
    await cold.goto("/");
    await expect(cold.getByRole("heading", { name: "Tether" })).toBeVisible();
    await expect(cold.getByText("Ready offline")).toBeVisible();
    await expect(cold.getByRole("img", { name: "Proved" })).toBeVisible(); // the saved cycle
    await expect(cold.getByRole("button", { name: "Add to calendar" })).toBeVisible();

    await cold.getByRole("link", { name: "Practice" }).click();
    await expect(cold.getByRole("button", { name: "Check" })).toBeVisible();
    await cold.goto("/run/solo");
    await expect(cold.getByRole("heading", { name: /^Question 1 of 10/ })).toBeVisible();
    await cold.goto("/settings");
    await expect(cold.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("a first-ever visit with no cache and no connection explains the one initial download", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
    await context.route("**/sw.js", (route) => route.abort()); // a visit whose cache never got stored
    const page = await context.newPage();
    await page.goto("/");
    await page.getByRole("button", { name: "Start" }).waitFor();
    await put(page, "learner", LEARNER);
    await page.goto("/");
    await context.setOffline(true);
    await expect(page.getByText("You are offline. Tether needs one download first.")).toBeVisible();
    await expect(page.getByText("Ready offline")).toHaveCount(0);
    await context.close();
  });
});

test.describe("pilot measures", () => {
  test("every spec section 15 measure is stored on this device, and nothing leaves it", async ({ page }) => {
    const outside: string[] = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (!["data:", "blob:", "about:"].includes(u.protocol) && u.hostname !== "localhost") outside.push(r.url());
    });
    await page.addInitScript(() => {
      const real = Math.random;
      Math.random = () => (window as any).__r ?? real();
    });
    const claim = async (name: string, roll: number) => {
      await page.evaluate((r) => ((window as any).__r = r), roll);
      await page.getByRole("radio", { name }).click();
      await page.evaluate(() => delete (window as any).__r);
    };
    const right = async () => {
      const q = await current(page);
      await tile(page, q.answer).click();
      await page.getByRole("button", { name: "Check" }).click();
      await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
      return q;
    };
    const next = () => page.getByRole("button", { name: /^Next/ }).click();

    await seed(page);
    // 1: move card opened, "I used the move", not sampled.
    await page.getByRole("button", { name: /The move: Strip the Disguise/ }).click();
    await page.getByRole("button", { name: "Got it" }).click();
    await right();
    await claim("I used the move", 0.9);
    await next();
    // 2: "I used the move", sampled, verified.
    await right();
    await claim("I used the move", 0.1);
    await page.locator(".hn-words button").last().click(); // pass or fail, a verification outcome is stored
    await expect(page.getByRole("button", { name: /^Next/ })).toBeVisible();
    await next();
    // 3: a miss, then right with help flags.
    const q3 = await current(page);
    await tile(page, q3.options.find((o: string) => o !== q3.answer)!).click();
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: "Try again" }).click();
    await tile(page, q3.answer).click();
    await page.getByRole("button", { name: "Check" }).click();
    await next();
    // 4: sounded right, then a free look.
    await right();
    await claim("It sounded right", 0.5);
    await page.getByRole("button", { name: /Show me/ }).click();
    await page.getByRole("button", { name: "Close Show me" }).click();
    await page.getByRole("button", { name: /^Next/ }).click();
    // 5: guessed. Then the summary and Done for today.
    await right();
    await claim("I guessed", 0.5);
    await next();
    await page.getByRole("button", { name: "Done for today" }).click();

    // A solo pass, Add to calendar from Home, then a recheck made due.
    await runTo(page, "/run/solo", 10, 9);
    await expect(page.getByRole("heading", { name: /Passed/ })).toBeVisible();
    await page.getByRole("button", { name: "Back to Home" }).click();
    const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Add to calendar" }).click()]);
    expect(file.suggestedFilename()).toMatch(/\.ics$/);
    const [cyc] = await withPrefix(page, "cycle:");
    await put(page, "cycle:strip-disguise", { ...cyc, entries: cyc.entries.map((e: any) => ({ ...e, due: iso(0) })) });
    await runTo(page, "/run/recheck", 5, 4);
    await expect(page.getByRole("heading", { name: /Passed|Held|Proved/ })).toBeVisible();

    const all = await rows(page);
    const attempts = all.filter(([k]) => k.startsWith("attempt:")).map(([, v]) => v.attempt).filter((a) => a.origin === "practice");
    expect(attempts).toHaveLength(5);
    for (const a of attempts) {
      expect(a).toEqual(expect.objectContaining({ help: expect.any(Array), freeLook: expect.any(Boolean), moveSheetOpened: expect.any(Boolean), checks: expect.any(Number) }));
      expect(a.startedAt.at).toBeGreaterThan(0);
      expect(a.completedAt.at).toBeGreaterThanOrEqual(a.startedAt.at); // correct-to-next timings come from these moments
    }
    expect(attempts.map((a) => a.reason)).toEqual(expect.arrayContaining(["move", "sounded", "guessed"]));
    expect(attempts.some((a) => a.moveSheetOpened)).toBe(true);
    expect(attempts.some((a) => a.freeLook)).toBe(true);
    expect(attempts.some((a) => a.help.includes("nudge"))).toBe(true);
    expect(attempts.some((a) => a.verifySampled === true && a.verifyResult)).toBe(true);
    expect(attempts.some((a) => a.verifySampled === false)).toBe(true);

    const runs = (await withPrefix(page, "run:")).map((r) => r.run);
    const solo = runs.find((r) => r.kind === "solo");
    expect(solo).toMatchObject({ status: "completed", result: { score: 9, total: 10, passed: true } });
    expect("practiceSnapshot" in solo).toBe(true); // the gap compares against it
    expect(runs.find((r) => r.kind === "recheck")).toMatchObject({ status: "completed", result: { score: 4, total: 5, passed: true } });

    const [saved] = await withPrefix(page, "cycle:");
    expect(saved.history.map((h: any) => h.kind)).toEqual(["solo", "recheck"]); // due/pass/miss/recovery outcomes
    expect(saved.entries.length).toBeGreaterThan(0);

    const byKey = Object.fromEntries(all);
    expect(byKey["meta:calendarUses"]).toEqual([expect.any(Number)]);
    expect(byKey["meta:sessions"]).toEqual([expect.objectContaining({ end: "done", activeMs: expect.any(Number) }), expect.anything()]);

    expect(outside, "requests to non-localhost origins").toEqual([]);
  });
});
