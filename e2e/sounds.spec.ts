import { expect, test, type Page } from "@playwright/test";
import { answerRight, current, LEARNER, leave, seed, tile } from "./practice-helpers";

// Cues are counted from the sound service's own log: the test defines window.__soundLog, the app pushes each cue it plays.
// Writes can be failed (__failWrites) or held (__hold: the data is stored but the app's save promise stays pending).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__soundLog = [];
    w.__held = [];
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: [any, any?]) {
      if (w.__failWrites) throw new DOMException("simulated write failure", "QuotaExceededError");
      return put.apply(this, args);
    };
    const d = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, "oncomplete")!;
    Object.defineProperty(IDBTransaction.prototype, "oncomplete", {
      ...d,
      set(f: any) {
        d.set!.call(this, f && ((ev: Event) => (w.__hold ? w.__held.push(() => f.call(this, ev)) : f.call(this, ev))));
      },
    });
  });
});

const log = (page: Page) => page.evaluate(() => (window as any).__soundLog as string[]);
const set = (page: Page, key: string, value: unknown) => page.evaluate(([k, v]) => ((window as any)[k as string] = v), [key, value] as const);
const release = (page: Page) => page.evaluate(() => { const w = window as any; w.__hold = false; w.__held.splice(0).forEach((f: () => void) => f()); });
const stored = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<any>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const get = open.result.transaction("records").objectStore("records").get("learner");
          get.onsuccess = () => resolve(get.result);
        };
      }),
  );
const writeLearner = (page: Page, learner: object) =>
  page.evaluate(
    (l) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const tx = open.result.transaction("records", "readwrite");
          tx.objectStore("records").put(l, "learner");
          tx.oncomplete = () => resolve();
        };
      }),
    learner,
  );

const SOUNDS_ON = { ...LEARNER, sounds: true, avatarSeed: "fixedseed0001", avatarGen: 2 };
const sounds = (page: Page) => page.getByRole("checkbox", { name: "Sounds" });
const pickRight = async (page: Page) => tile(page, (await current(page)).answer).click();
const check = (page: Page) => page.getByRole("button", { name: "Check" }).click();

test("Sounds is off by default, switches by keyboard, saves at once, and plays tile, outcome and nothing else", async ({ page }) => {
  await seed(page);
  await page.goto("/settings");
  await expect(sounds(page)).not.toBeChecked();
  await sounds(page).focus();
  await page.keyboard.press("Space");
  await expect(sounds(page)).toBeChecked();
  expect((await stored(page)).sounds).toBe(true);
  expect(await log(page)).toEqual(["toggle"]);

  await page.getByRole("link", { name: "Home" }).click();
  await page.goto("/practice");
  const first = await current(page);
  await page.getByRole("radio").first().hover();
  await page.mouse.move(0, 0);
  expect(await log(page)).toEqual([]); // loading and hovering are silent
  const wrong = first.options.find((o) => o !== first.answer)!;
  await tile(page, wrong).click();
  expect(await log(page)).toEqual(["select"]); // selecting does not grade
  await tile(page, first.answer).click();
  await check(page);
  await expect.poll(() => log(page)).toEqual(["select", "select", "correct"]);
  await page.reload(); // restoring a saved answer is silent
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
  expect(await log(page)).toEqual([]);

  // Off: persisted at once and silent.
  await page.goto("/settings");
  await sounds(page).focus();
  await page.keyboard.press("Space");
  await expect(sounds(page)).not.toBeChecked();
  expect((await stored(page)).sounds).toBe(false);
  await page.goto("/practice");
  await page.getByRole("radio", { name: "I guessed" }).click();
  await page.getByRole("button", { name: /^Next/ }).click();
  await pickRight(page);
  await check(page);
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
  expect(await log(page)).toEqual([]);
});

test("the round celebration plays once, from Next on the last answer, never before or on return", async ({ page }) => {
  await seed(page, SOUNDS_ON);
  for (let n = 0; n < 5; n++) {
    await answerRight(page, null);
    if (n < 4) {
      await leave(page);
      continue;
    }
    expect((await log(page)).filter((c) => c === "celebrate")).toEqual([]);
    await leave(page);
  }
  await expect(page.getByRole("heading", { name: "Round done" })).toBeVisible();
  await expect.poll(async () => (await log(page)).filter((c) => c === "celebrate")).toEqual(["celebrate"]);
  expect((await log(page)).filter((c) => c === "correct")).toHaveLength(5);
  await page.reload(); // the summary is not restored, and nothing plays on reload
  await page.waitForTimeout(300);
  expect(await log(page)).toEqual([]);
});

test("a wrong answer plays try-again after its save", async ({ page }) => {
  await seed(page, SOUNDS_ON);
  const q = await current(page);
  await tile(page, q.options.find((o) => o !== q.answer)!).click();
  await check(page);
  await expect.poll(() => log(page)).toEqual(["select", "tryAgain"]);
});

test("the Sounds toggle keeps the UI unchanged on a failed save and Retry applies it", async ({ page }) => {
  await seed(page);
  await page.goto("/settings");
  await expect(sounds(page)).toBeVisible();
  await set(page, "__failWrites", true);
  await sounds(page).click();
  await expect(page.getByRole("alert")).toContainText("Couldn't save");
  await expect(sounds(page)).not.toBeChecked();
  await set(page, "__failWrites", false);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(sounds(page)).toBeChecked();
  expect((await stored(page)).sounds).toBe(true);
});

test("a failed save plays no cue; Retry plays exactly one", async ({ page }) => {
  await seed(page, SOUNDS_ON);
  await pickRight(page);
  await set(page, "__failWrites", true);
  await check(page);
  await expect(page.getByRole("alert").filter({ hasText: "Couldn't save this answer" })).toBeVisible();
  expect((await log(page)).filter((c) => c !== "select")).toEqual([]);
  await set(page, "__failWrites", false);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
  await expect.poll(async () => (await log(page)).filter((c) => c === "correct")).toEqual(["correct"]);
  await page.waitForTimeout(300);
  expect((await log(page)).filter((c) => c !== "select")).toEqual(["correct"]);
});

test("a save still landing after the learner left plays no cue, and coming back does not repeat it", async ({ page }) => {
  await seed(page, SOUNDS_ON);
  await pickRight(page);
  await set(page, "__hold", true);
  await check(page);
  await expect(page.getByRole("button", { name: "Check" })).toBeDisabled();
  await page.getByRole("button", { name: "Close and come back later" }).click();
  await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();
  await release(page);
  await page.getByRole("link", { name: "Practice" }).click();
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible(); // the pending reason prompt resumes
  await page.waitForTimeout(300);
  expect((await log(page)).filter((c) => c !== "select")).toEqual([]);
});

test("read-aloud and a hidden tab keep cues silent", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    Object.defineProperty(window, "speechSynthesis", {
      value: { speaking: false, pending: false, getVoices: () => [], cancel() {}, speak() {}, addEventListener() {}, removeEventListener() {} },
    });
    Object.defineProperty(document, "visibilityState", { get: () => w.__vis ?? "visible", configurable: true });
  });
  await seed(page, SOUNDS_ON);
  const q = await current(page);
  const options = q.options.filter((o) => o !== q.answer);
  await page.evaluate(() => ((window as any).speechSynthesis.speaking = true));
  await tile(page, options[0]!).click();
  expect(await log(page)).toEqual([]);
  await page.evaluate(() => ((window as any).speechSynthesis.speaking = false));
  await set(page, "__vis", "hidden");
  await tile(page, options[1]!).click();
  expect(await log(page)).toEqual([]);
  await set(page, "__vis", "visible");
  await tile(page, options[2]!).click();
  expect(await log(page)).toEqual(["select"]);
});

for (const variant of ["missing", "throwing"] as const) {
  test(`unavailable Web Audio (${variant}) never breaks the toggle or a saved answer`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((v) => {
      const w = window as any;
      w.AudioContext = v === "missing" ? undefined : function () { throw new Error("blocked"); };
      w.webkitAudioContext = w.AudioContext;
    }, variant);
    await seed(page);
    await page.goto("/settings");
    await sounds(page).focus();
    await page.keyboard.press("Space");
    await expect(sounds(page)).toBeChecked();
    await page.goto("/practice");
    await pickRight(page);
    await check(page);
    await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
    await expect.poll(() => log(page)).toContain("correct");
    expect(errors).toEqual([]);
  });
}

test("an older learner record is backfilled once with every setting kept, and the avatar survives reloads and a nickname change", async ({ page }) => {
  const old = { ...LEARNER, coach: "text", lang: "pcm", readAloud: true, partner: { name: "Mrs Okafor" } };
  await seed(page, old);
  await page.goto("/");
  await expect(page.locator(".identity .avatar svg")).toBeVisible();
  const first = await stored(page);
  expect(first).toMatchObject({ ...old, sounds: false, avatarGen: 2 });
  expect(first.avatarSeed).toMatch(/^[0-9a-f]{24}$/);
  const art = await page.locator(".identity .avatar").innerHTML();

  await page.reload();
  await expect(page.locator(".identity .avatar svg")).toBeVisible();
  expect((await stored(page)).avatarSeed).toBe(first.avatarSeed);
  expect(await page.locator(".identity .avatar").innerHTML()).toBe(art);

  // Text only still shows the avatar (and no Bo).
  expect(first.coach).toBe("text");
  await expect(page.locator(".bo")).toHaveCount(0);

  // A nickname change keeps the avatar (there is no editor yet; this is what one will save).
  await writeLearner(page, { ...first, nickname: "Chidinma" });
  await page.reload();
  await expect(page.locator(".identity-name")).toHaveText("Chidinma");
  expect(await page.locator(".identity .avatar").innerHTML()).toBe(art);
  expect((await stored(page)).avatarSeed).toBe(first.avatarSeed);
});

test("the avatar is decorative, falls back to initials, and stays out of practice", async ({ page }) => {
  await seed(page, { ...SOUNDS_ON, avatarGen: 99 });
  await expect(page.locator(".avatar")).toHaveCount(0); // not in teaching or practice
  await page.goto("/settings");
  const avatar = page.locator(".identity .avatar");
  await expect(avatar).toHaveAttribute("aria-hidden", "true");
  await expect(avatar).toHaveText("A");
  await expect(page.locator(".identity-name")).toHaveText("Amaka");
});

test("with every external request blocked, the toggle, the avatar and a saved answer still work", async ({ page, baseURL }) => {
  const external: string[] = [];
  const own = new URL(baseURL!).origin;
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === own || url.protocol === "data:" || url.protocol === "blob:") return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.origin !== own && u.protocol.startsWith("http")) external.push(r.url());
  });
  await seed(page);
  await page.goto("/settings");
  await expect(page.locator(".identity .avatar svg")).toBeVisible();
  await sounds(page).focus();
  await page.keyboard.press("Space");
  await expect(sounds(page)).toBeChecked();
  await page.goto("/practice");
  await pickRight(page);
  await check(page);
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
  await expect.poll(() => log(page)).toEqual(["select", "correct"]);
  expect(external).toEqual([]);
});
