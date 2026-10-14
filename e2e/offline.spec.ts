import { finishLesson } from "./learn-helpers";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { answerRight, LEARNER } from "./practice-helpers";
import { answerTutorials } from "./tutorial";

// Step 16: runs against the production preview, where the service worker is registered.

/** True once the worker reports every required precache entry stored. */
const cacheComplete = (page: Page) =>
  page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return new Promise<boolean>((resolve) => {
      const ch = new MessageChannel();
      ch.port1.onmessage = (e) => resolve(e.data.missing === 0);
      reg.active!.postMessage({ type: "status" }, [ch.port2]);
    });
  });

const put = (page: Page, records: [string, unknown][]) =>
  page.evaluate(
    (items) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const tx = open.result.transaction("records", "readwrite");
          for (const [k, v] of items) tx.objectStore("records").put(v, k);
          tx.oncomplete = () => resolve();
        };
      }),
    records,
  );

const NEXT = "2099-03-04";
const cycle = {
  moveId: "strip-disguise", timeZone: "Africa/Lagos", state: "proved", earnedOn: "2099-03-01", anchor: "2099-03-01",
  entries: [{ id: "2099-03-01+3", day: 3, due: NEXT, status: "scheduled" }], history: [],
};

async function seedHome(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).waitFor();
  await put(page, [["learner", LEARNER], ["cycle:strip-disguise", cycle]]);
  await page.goto("/");
}

test("manifest and icons are served", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "Tether", display: "standalone" });
  expect(manifest.icons.map((i: any) => `${i.sizes}${i.purpose ?? ""}`)).toEqual(["192x192", "512x512", "512x512maskable"]);
  for (const path of [...manifest.icons.map((i: any) => i.src), "/apple-touch-icon.png", "/favicon.png"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-type"], path).toContain("image/png");
  }
});

test("Ready offline appears only after the cache is complete and survives going offline", async ({ page, context }) => {
  await seedHome(page);
  await expect(page.getByText("Ready offline")).toBeVisible();
  expect(await cacheComplete(page)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();
  await expect(page.getByText("Ready offline")).toBeVisible();
});

// Cloudflare Pages answers /index.html with a 308 to /. A redirected response cannot answer a navigation, so a cached
// one broke every later load (net::ERR_FAILED), online and offline. This host behaviour is simulated here.
test("a host that redirects /index.html to / still reloads, online and offline", async ({ page, context }) => {
  await context.route(/\/index\.html$/, (route) => route.fulfill({ status: 308, headers: { location: "/" } }));
  await seedHome(page);
  await expect(page.getByText("Ready offline")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await context.setOffline(true);
  await page.goto("/practice");
  await expect(page.getByRole("radio").first()).toBeVisible();
});

test("a partly stored cache offers Retry, and Retry completes it", async ({ page }) => {
  await seedHome(page);
  await expect(page.getByText("Ready offline")).toBeVisible();
  await page.evaluate(async () => {
    const cache = await caches.open((await caches.keys()).find((k) => k.startsWith("tether-"))!);
    await cache.delete("/icon-512.png");
  });
  await page.reload();
  await expect(page.getByText("Ready offline")).toHaveCount(0);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Ready offline")).toBeVisible();
});

test("the whole loop starts offline after one load: onboarding, practice, solo", async ({ page, context }) => {
  await page.goto("/");
  await expect.poll(() => cacheComplete(page)).toBe(true);
  await context.setOffline(true);
  await page.reload();

  await page.getByRole("button", { name: "Start" }).click();

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Nickname").fill("Amaka");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "Start Move 1" }).click();
  await finishLesson(page);
  await page.getByRole("button", { name: /Got it/ }).click();
  await answerTutorials(page);
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();
  await expect(page.getByText("Ready offline")).toBeVisible();

  await page.getByRole("link", { name: /^Stage 1, Move 1/ }).click();
  await answerRight(page);
  await page.getByRole("button", { name: /^Next/ }).click();

  await page.goto("/run/solo");
  await expect(page.getByRole("heading", { name: /^Question 1 of 10/ })).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});

test("Add to calendar downloads an all-day .ics for the next recheck, offline, and records the use", async ({ page, context }) => {
  await seedHome(page);
  await expect(page.getByText("Ready offline")).toBeVisible();
  await context.setOffline(true);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`tether-recheck-${NEXT}.ics`);
  const text = await (await import("node:fs/promises")).readFile((await file.path())!, "utf8");
  expect(text).toContain("BEGIN:VCALENDAR");
  expect(text).toContain("DTSTART;VALUE=DATE:20990304");
  expect(text).toContain("DTEND;VALUE=DATE:20990305");
  expect(text).toContain("X-WR-TIMEZONE:Africa/Lagos");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<unknown>((resolve) => {
            const open = indexedDB.open("tether");
            open.onsuccess = () => {
              const req = open.result.transaction("records").objectStore("records").get("meta:calendarUses");
              req.onsuccess = () => resolve(req.result);
            };
          }),
      ),
    )
    .toEqual([expect.any(Number)]);
});

test("on a simulated date, Add to calendar is a disabled preview and records nothing", async ({ page }) => {
  await seedHome(page);
  await page.goto("/?demo=2099-03-02");
  const button = page.getByRole("button", { name: "Add to calendar (demo preview)" });
  await expect(button).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add to calendar", exact: true })).toHaveCount(0);
  const uses = await page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const req = open.result.transaction("records").objectStore("records").get("meta:calendarUses");
          req.onsuccess = () => resolve(req.result);
        };
      }),
  );
  expect(uses).toBeUndefined();
});

// An update that cannot store every file must leave the working offline app alone (spec section 13).
/** Playwright cannot intercept the browser's own sw.js update check, so the page registers a changed copy at /sw.js?next:
 * a new script URL on the same scope is an update with the old worker still active. Serves it (new cache name), optionally with one JS asset missing, then runs update() and returns the new worker's end state. */
async function update(page: Page, context: BrowserContext, missingAsset: boolean) {
  await seedHome(page);
  await expect(page.getByText("Ready offline")).toBeVisible();
  await context.route("**/sw.js?next", async (route) => {
    const body = (await (await route.fetch()).text()).replace(/tether-([^"]+)"/, 'tether-$1-next"');
    await route.fulfill({ body, contentType: "text/javascript", headers: { "cache-control": "no-store" } });
  });
  if (missingAsset) await context.route("**/assets/*.js", (route) => route.fulfill({ status: 404 }));
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    await navigator.serviceWorker.register("/sw.js?next");
    const w = reg.installing ?? reg.waiting;
    if (w && w.state !== "installed" && w.state !== "redundant")
      await new Promise((r) => w.addEventListener("statechange", () => (w.state === "installed" || w.state === "redundant") && r(null)));
    return { state: w?.state ?? "none", waiting: !!reg.waiting };
  });
}

test("an update missing a file is rejected: no Update ready, and the old app still works offline", async ({ page, context }) => {
  expect(await update(page, context, true)).toEqual({ state: "redundant", waiting: false });
  await expect(page.getByRole("button", { name: "Update ready" })).toHaveCount(0);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();
  await expect(page.getByText("Ready offline")).toBeVisible();
});

test("control: a complete update offers Update ready", async ({ page, context }) => {
  expect(await update(page, context, false)).toEqual({ state: "installed", waiting: true });
  await expect(page.getByRole("button", { name: "Update ready" })).toBeVisible();
});
