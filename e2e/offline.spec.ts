import { expect, test, type Page } from "@playwright/test";
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
  await page.getByLabel("Nickname").fill("Amaka");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /Got it/ }).click();
  await answerTutorials(page);
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();
  await expect(page.getByText("Ready offline")).toBeVisible();

  await page.getByRole("link", { name: "Practice" }).click();
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
