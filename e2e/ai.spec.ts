import { expect, test, type Page, type Route } from "@playwright/test";
import { point } from "../src/rules/practice.ts";
import { LEARNER, current, lastAttempt, records, seed, tile } from "./practice-helpers";

// Still stuck? (spec section 5a). /api/explain is always mocked here; the live provider check is tools/ai-sample.ts.
const TEXT = "Words like along with only add extra people. Cover them and read what is left.";
const ok = (route: Route) => route.fulfill({ status: 200, json: { ok: true, text: TEXT } });

/** Three misses open Go deeper (tiles hidden); the Still stuck? section sits at its bottom. */
async function goDeeper(page: Page) {
  for (let n = 0; n < 3; n++) {
    const q = await current(page);
    await tile(page, q.options.filter((o) => o !== q.answer)[n]!).click();
    await page.getByRole("button", { name: "Check" }).click();
    if (n < 2) await page.getByRole("button", { name: "Try again" }).click();
  }
  await expect(page.getByRole("heading", { name: "Still stuck?" })).toBeVisible();
}
const ask = (page: Page, how: "In plain words" | "With an example" = "In plain words") => page.getByRole("button", { name: how }).click();
const aiHelped = async (page: Page) => (await records(page)).some((r) => r.attempt.help.includes("ai"));
const uses = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ result: string }[]>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const req = open.result.transaction("records").objectStore("records").get("meta:aiUses");
          req.onsuccess = () => resolve(req.result ?? []);
        };
      }),
  );
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

test("genuine: only the three fields are sent, the label shows, help is recorded, no dot or point", async ({ page }) => {
  let body: unknown;
  await page.route("**/api/explain", (route) => ((body = route.request().postDataJSON()), ok(route)));
  await seed(page);
  await goDeeper(page);
  await ask(page, "With an example");
  await expect(page.getByText(TEXT)).toBeVisible();
  await expect(page.getByText("AI help · based on the reviewed move explanation")).toBeVisible();
  await expect(page.getByText("AI help · English")).toHaveCount(0);
  expect(Object.keys(body as object).sort()).toEqual(["contentVersion", "moveId", "style"]);
  expect(body).toMatchObject({ moveId: "strip-disguise", style: "analogy" });
  const a = (await lastAttempt(page, (x) => x.help.includes("ai"))).attempt;
  expect(a.help).toEqual(["nudge", "ai"]);
  expect(a.resets.length).toBe(4); // three misses plus the AI help
  expect(point(a)).toBe(0);
  await expect.poll(async () => (await uses(page)).map((u) => u.result)).toEqual(["genuine"]);
  // A second explanation does not add a second help mark.
  await ask(page);
  await expect(page.getByText(TEXT)).toBeVisible();
  expect((await lastAttempt(page)).attempt.help.filter((h: string) => h === "ai")).toHaveLength(1);
});

test("Pidgin coach: the label also says AI help · English", async ({ page }) => {
  await page.route("**/api/explain", ok);
  await seed(page, { ...LEARNER, lang: "pcm" });
  await goDeeper(page);
  await ask(page);
  await expect(page.getByText("AI help · English")).toBeVisible();
});

const failures: [string, number, object | string, RegExp, string][] = [
  ["rate-limited", 429, { ok: false, reason: "rate" }, /Too many requests/, "rate"],
  ["unavailable (500)", 500, "<html>boom</html>", /AI help isn't available/, "unavailable"],
  ["invalid", 502, { ok: false, reason: "invalid" }, /could not give a safe explanation/, "invalid"],
];
for (const [name, status, json, note, result] of failures)
  test(`${name}: local help stays, The move is shown, nothing is recorded`, async ({ page }) => {
    await page.route("**/api/explain", (route) => route.fulfill(typeof json === "string" ? { status, body: json } : { status, json }));
    await seed(page);
    await goDeeper(page);
    await ask(page);
    await expect(page.getByText(note)).toBeVisible();
    await expect(page.locator(".hp-ai-label", { hasText: /^The move$/ })).toBeVisible();
    await expect(page.getByText(TEXT)).toHaveCount(0);
    expect(await aiHelped(page)).toBe(false);
    await expect.poll(async () => (await uses(page)).map((u) => u.result)).toEqual([result]);
    await expect(page.getByRole("heading", { name: /Step 1 of 3|Tap the subject|subject/i }).first()).toBeVisible(); // Go deeper still usable
  });

test("offline: says so at once with a path to the local help, and sends nothing", async ({ page, context }) => {
  let calls = 0;
  await page.route("**/api/explain", (route) => (calls++, ok(route)));
  await seed(page);
  await goDeeper(page);
  await context.setOffline(true);
  await ask(page);
  await expect(page.getByText(/Online AI help needs internet/)).toBeVisible();
  await expect(page.locator(".hp-ai-label", { hasText: /^The move$/ })).toBeVisible();
  expect(calls).toBe(0);
  expect(await aiHelped(page)).toBe(false);
  await expect.poll(async () => (await uses(page)).map((u) => u.result)).toEqual(["offline"]);
});

test("a request that never answers times out after 15 s", async ({ page }) => {
  await page.route("**/api/explain", () => {}); // never fulfilled
  await seed(page);
  await goDeeper(page);
  await page.clock.install();
  await ask(page);
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await page.clock.fastForward(16_000);
  await expect(page.getByText(/took too long/)).toBeVisible();
  expect(await aiHelped(page)).toBe(false);
  await expect.poll(async () => (await uses(page)).map((u) => u.result)).toEqual(["timeout"]);
});

/** A route that answers only once released, and reports whether the late reply could still be delivered. */
function lateRoute(page: Page) {
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  let settle!: (delivered: boolean) => void;
  const outcome = new Promise<boolean>((r) => (settle = r));
  void page.route("**/api/explain", async (route) => {
    await held;
    await route.fulfill({ status: 200, json: { ok: true, text: TEXT } }).then(
      () => settle(true),
      () => settle(false),
    );
  });
  return { release, outcome };
}

test("cancel: nothing changes, and a reply that still arrives is ignored", async ({ page }) => {
  const late = lateRoute(page);
  await seed(page);
  await goDeeper(page);
  await ask(page);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Cancelled. Nothing changed.")).toBeVisible();
  late.release();
  await late.outcome; // the route has now answered (the request itself was already aborted by Cancel)
  await page.waitForTimeout(200);
  await expect(page.getByText(TEXT)).toHaveCount(0);
  await expect(page.getByText("Cancelled. Nothing changed.")).toBeVisible();
  expect(await aiHelped(page)).toBe(false);
  await expect.poll(async () => (await uses(page)).map((u) => u.result)).toEqual(["cancelled"]);
});

test("a late reply after leaving the question never appears or records help", async ({ page }) => {
  const late = lateRoute(page);
  await seed(page);
  await goDeeper(page);
  await ask(page);
  await page.getByRole("button", { name: "Close and come back later" }).click(); // client-side navigation away
  late.release();
  await late.outcome;
  await page.waitForTimeout(200);
  await expect(page.getByText(TEXT)).toHaveCount(0);
  expect(await aiHelped(page)).toBe(false);
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Pick the verb that fits." })).toBeVisible(); // rendered, so the next check means something
  await expect(page.getByText(TEXT)).toHaveCount(0);
  expect(await aiHelped(page)).toBe(false);
});

test("a late AI save keeps what the learner did meanwhile (The move stays opened)", async ({ page }) => {
  const late = lateRoute(page);
  await seed(page);
  await goDeeper(page);
  await ask(page);
  await page.getByRole("button", { name: /^The move:/ }).click();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect.poll(async () => (await lastAttempt(page)).attempt.moveSheetOpened).toBe(true);
  late.release();
  await expect(page.getByText(TEXT)).toBeVisible();
  const a = (await lastAttempt(page, (x) => x.help.includes("ai"))).attempt;
  expect(a.help).toContain("ai");
  expect(a.moveSheetOpened).toBe(true);
});

/** Saves wait while window.slow is true (their transaction is held open) and throw while window.fail is true. */
const gateSaves = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { slow: boolean; fail: boolean };
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...a) {
      if (w.fail) throw new DOMException("simulated write failure", "QuotaExceededError");
      const hold = () => {
        if (w.slow) this.get("x").onsuccess = hold;
      };
      hold();
      return put.apply(this, a as never);
    };
  });
const setGate = (page: Page, gate: { slow?: boolean; fail?: boolean }) => page.evaluate((g) => void Object.assign(window, g), gate);

test("once accepted and saving, Cancel is gone, so it never claims nothing changed", async ({ page }) => {
  await page.route("**/api/explain", ok);
  await seed(page);
  await goDeeper(page);
  await gateSaves(page);
  await setGate(page, { slow: true });
  await ask(page);
  await expect(page.getByText("Asking for an explanation.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
  await setGate(page, { slow: false });
  await expect(page.getByText(TEXT)).toBeVisible();
  expect(await aiHelped(page)).toBe(true);
});

for (const fails of [false, true])
  test(`a reply accepted while another save runs is recorded once and shown${fails ? ", after its own save fails and is retried" : ""}`, async ({ page }) => {
    const late = lateRoute(page);
    await seed(page);
    await goDeeper(page);
    await gateSaves(page);
    await ask(page);
    await setGate(page, { slow: true });
    await page.getByRole("button", { name: /^The move:/ }).click(); // its save is held open
    late.release();
    await late.outcome;
    await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0); // accepted while The move's save is pending
    await setGate(page, { slow: false, fail: fails });
    await page.getByRole("button", { name: "Got it" }).click();
    if (fails) {
      await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
      await expect(page.getByText(TEXT)).toHaveCount(0);
      expect(await aiHelped(page)).toBe(false);
      await setGate(page, { fail: false });
      await page.getByRole("button", { name: "Retry" }).click();
    }
    await expect(page.getByText(TEXT)).toBeVisible();
    await expect(page.getByText("Asking for an explanation.")).toHaveCount(0);
    const a = (await lastAttempt(page, (x) => x.help.includes("ai"))).attempt;
    expect(a.help.filter((h: string) => h === "ai")).toHaveLength(1);
    expect(a.moveSheetOpened).toBe(true);
    await expect.poll(async () => (await uses(page)).map((u) => u.result)).toEqual(["genuine"]);
  });

test("a response body that stalls ends as a timeout, not a stuck spinner", async ({ page }) => {
  await page.addInitScript(() => {
    const real = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (!String(input instanceof Request ? input.url : input).includes("/api/explain")) return real(input, init);
      const stream = new ReadableStream({
        start(c) {
          init?.signal?.addEventListener("abort", () => c.error(new DOMException("aborted", "AbortError")));
        },
      });
      return Promise.resolve(new Response(stream, { status: 200, headers: { "content-type": "application/json" } })); // headers now, body never
    };
  });
  await seed(page);
  await goDeeper(page);
  await page.clock.install();
  await ask(page);
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await page.clock.fastForward(16_000);
  await expect(page.getByText(/took too long/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
  expect(await aiHelped(page)).toBe(false);
  await expect.poll(async () => (await uses(page)).map((u) => u.result)).toEqual(["timeout"]);
});

async function noAi(page: Page, path: string, first: RegExp, setup?: () => Promise<void>) {
  let calls = 0;
  await page.route("**/api/explain", (route) => (calls++, ok(route)));
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).waitFor();
  await put(page, "learner", LEARNER);
  await setup?.();
  await page.goto(path);
  await expect(page.getByRole("heading", { name: first })).toBeVisible();
  await expect(page.getByText(/Still stuck|AI help/)).toHaveCount(0);
  expect(calls).toBe(0);
}

test("solo has no AI UI and makes no AI request", async ({ page }) => noAi(page, "/run/solo", /^Question 1 of 10/));

test("a recheck has no AI UI and makes no AI request", async ({ page }) =>
  noAi(page, "/run/recheck", /^Question 1 of 5/, () =>
    put(page, "cycle:strip-disguise", { moveId: "strip-disguise", timeZone: "UTC", state: "fading", earnedOn: "2026-01-01", anchor: "2026-01-01", entries: [], history: [] }),
  ));

test("Still stuck: the AI buttons and note sit fully above the sticky Check/Show me footer", async ({ page }) => {
  await page.route("**/api/explain", ok);
  await seed(page);
  await goDeeper(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const box = async (l: ReturnType<Page["locator"]>) => (await l.boundingBox())!;
  const bar = await box(page.locator(".qv-bar"));
  const last = async () => {
    const parts = [page.getByRole("button", { name: "In plain words" }), page.getByRole("button", { name: "With an example" }), page.locator(".hp-ai-note, .hp-ai-card").last()];
    for (const part of parts) { const b = await box(part); expect(b.y + b.height).toBeLessThanOrEqual(bar.y + 0.5); }
  };
  await last();
  await ask(page);
  await expect(page.getByText(TEXT)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await last();
  // Focus-scrolling a button into view must not leave it behind the footer.
  await page.getByRole("button", { name: "With an example" }).focus();
  const f = await box(page.getByRole("button", { name: "With an example" }));
  expect(f.y + f.height).toBeLessThanOrEqual((await box(page.locator(".qv-bar"))).y + 0.5);
});
