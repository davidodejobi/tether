import { expect, test, type Page } from "@playwright/test";
import { seedRecords } from "./results-helpers";

// IndexedDB writes fail while window.__failWrites is true (see save-failure.spec.ts).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: [any, any?]) {
      if ((window as any).__failWrites) throw new DOMException("simulated write failure", "QuotaExceededError");
      // __slowWrites (ms): keep the transaction busy so the save resolves late.
      const until = Date.now() + ((window as any).__slowWrites ?? 0);
      const spin = () => { if (Date.now() < until) this.count().onsuccess = spin; };
      spin();
      return put.apply(this, args);
    };
  });
});
const failWrites = (page: Page, on: boolean) => page.evaluate((v) => ((window as any).__failWrites = v), on);
const learner = (page: Page) =>
  page.evaluate(() => new Promise<any>((resolve) => {
    const open = indexedDB.open("tether");
    open.onsuccess = () => { const r = open.result.transaction("records").objectStore("records").get("learner"); r.onsuccess = () => resolve(r.result); };
  }));
const alert = (page: Page) => page.getByRole("alert").filter({ hasText: "Couldn't save this change" });

test("every change saves at once and survives a reload; the avatar seed stays", async ({ page }) => {
  await seedRecords(page, [], "/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  const seed = (await learner(page)).avatarSeed;
  expect(seed).toBeTruthy();

  await page.getByLabel("Nickname").fill("Chidi");
  await page.getByRole("button", { name: "Save nickname" }).click();
  await expect(page.getByRole("button", { name: "Save nickname" })).toBeDisabled(); // saved: nothing left to save
  await page.getByRole("radio", { name: "Text only" }).click();
  await expect(page.getByRole("radio", { name: "Text only" })).toBeChecked();
  await page.getByRole("radio", { name: /Pidgin/ }).click();
  await expect(page.getByRole("radio", { name: /Pidgin/ })).toBeChecked();
  await page.getByRole("checkbox", { name: "Read-aloud" }).click();
  await expect(page.getByRole("checkbox", { name: "Read-aloud" })).toBeChecked();
  await page.getByLabel("Partner name").fill("Ife");
  await page.getByLabel("Partner phone").fill("0801 234 5678");
  await page.getByRole("button", { name: "Save partner" }).click();
  await expect.poll(async () => (await learner(page)).partner).toEqual({ name: "Ife", phone: "0801 234 5678" });
  await expect(page.getByRole("button", { name: "Save partner" })).toBeDisabled(); // saved, nothing left to save

  await page.reload();
  await expect(page.getByLabel("Nickname")).toHaveValue("Chidi");
  await expect(page.getByRole("radio", { name: "Text only" })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Pidgin/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Read-aloud" })).toBeChecked();
  await expect(page.getByLabel("Partner name")).toHaveValue("Ife");
  await expect(page.getByLabel("Partner phone")).toHaveValue("0801 234 5678");
  expect(await learner(page)).toMatchObject({ nickname: "Chidi", coach: "text", lang: "pcm", readAloud: true, partner: { name: "Ife", phone: "0801 234 5678" }, avatarSeed: seed });

  // Clearing both partner fields removes the partner.
  await page.getByLabel("Partner name").fill("");
  await page.getByLabel("Partner phone").fill("");
  await page.getByRole("button", { name: "Save partner" }).click();
  await expect.poll(async () => (await learner(page)).partner).toBeNull();
});

test("language labels Pidgin unreviewed and lists Français as not selectable", async ({ page }) => {
  await seedRecords(page, [], "/settings");
  await expect(page.getByText("Unreviewed")).toBeVisible();
  await expect(page.getByText("Coming next: Français. More languages later.")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Fran/ })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Read-aloud" })).not.toBeChecked();
});

test("a failed save keeps the old value and Retry repeats the same change", async ({ page }) => {
  await seedRecords(page, [], "/settings");
  await expect(page.getByRole("radio", { name: "Character" })).toBeChecked();
  await failWrites(page, true);
  await page.getByRole("radio", { name: "Text only" }).click();
  await expect(alert(page)).toBeVisible();
  await expect(page.getByRole("radio", { name: "Character" })).toBeChecked(); // old value stays
  await expect(page.getByRole("radio", { name: "Text only" })).not.toBeChecked();

  await page.getByLabel("Nickname").fill("Nneka");
  await page.getByRole("button", { name: "Save nickname" }).click();
  await expect(alert(page)).toBeVisible();
  expect((await learner(page)).nickname).toBe("Amaka");

  await failWrites(page, false);
  await page.getByRole("button", { name: "Retry" }).click(); // repeats the nickname change, the latest one
  await expect(alert(page)).toHaveCount(0);
  expect((await learner(page)).nickname).toBe("Nneka");
});

test("leaving and returning mid-save, then Retry, never brings back an older value", async ({ page }) => {
  await seedRecords(page, [], "/settings");
  await expect(page.getByRole("radio", { name: "Character" })).toBeChecked();
  await page.evaluate(() => ((window as any).__slowWrites = 800));
  await page.getByRole("radio", { name: "Text only" }).click();
  await page.getByRole("link", { name: "Home" }).click();
  await page.getByRole("link", { name: "Settings" }).click();
  await page.evaluate(() => ((window as any).__slowWrites = 0));
  await failWrites(page, true);
  await page.getByRole("radio", { name: /Pidgin/ }).click(); // applied once the earlier save has landed
  await expect(alert(page)).toBeVisible();
  await failWrites(page, false);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(alert(page)).toHaveCount(0);
  expect(await learner(page)).toMatchObject({ coach: "text", lang: "pcm" });
  await expect(page.getByRole("radio", { name: "Text only" })).toBeChecked();
});

test("subjects: English is fixed, the limit is 3, changes persist, and a failed save offers Retry", async ({ page }) => {
  await seedRecords(page, [], "/settings");
  await expect(page.getByRole("checkbox", { name: /Use of English/ })).toBeDisabled();
  await expect(page.getByRole("checkbox", { name: /Biology/ })).not.toBeChecked(); // absent subjects means English only
  for (const n of ["Biology", "Chemistry", "Physics"]) {
    await page.getByRole("checkbox", { name: new RegExp(n) }).click();
    await expect(page.getByRole("checkbox", { name: new RegExp(n) })).toBeChecked();
  }
  await expect(page.getByRole("checkbox", { name: /Mathematics/ })).toBeDisabled();
  await expect.poll(async () => (await learner(page)).subjects).toEqual(["english", "biology", "chemistry", "physics"]);
  await page.reload();
  await expect(page.getByRole("checkbox", { name: /Chemistry/ })).toBeChecked();

  await failWrites(page, true);
  await page.getByRole("checkbox", { name: /Physics/ }).click();
  await expect(alert(page)).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Physics/ })).toBeChecked(); // old value stays
  await failWrites(page, false);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(alert(page)).toHaveCount(0);
  expect((await learner(page)).subjects).toEqual(["english", "biology", "chemistry"]);
});

test("Appearance: Light or Dark overrides the device, survives a reload, and Match my device hands back to it", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await seedRecords(page, [], "/settings");
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme ?? "system");
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await expect(page.getByRole("radio", { name: "Match my device" })).toBeChecked();
  const deviceDark = await bg();

  await page.getByRole("radio", { name: "Light" }).click();
  await expect(page.getByRole("radio", { name: "Light" })).toBeChecked();
  await expect.poll(theme).toBe("light"); // applied just after the save re-renders
  await expect.poll(bg).not.toBe(deviceDark);
  expect((await learner(page)).theme).toBe("light");
  await page.reload();
  await expect(page.getByRole("radio", { name: "Light" })).toBeChecked();
  await expect.poll(theme).toBe("light"); // applied just after the save re-renders

  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
  await expect.poll(theme).toBe("dark"); // applied just after the save re-renders
  await expect.poll(bg).toBe(deviceDark);

  await page.getByRole("radio", { name: "Match my device" }).click();
  await expect(page.getByRole("radio", { name: "Match my device" })).toBeChecked();
  await expect.poll(theme).toBe("system"); // applied just after the save re-renders
  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(bg).not.toBe(deviceDark);
});

test("Appearance: a failed save keeps the old look, and Retry applies the new one", async ({ page }) => {
  await seedRecords(page, [], "/settings");
  await failWrites(page, true);
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(alert(page)).toBeVisible();
  await expect(page.getByRole("radio", { name: "Match my device" })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.dataset.theme ?? "system")).toBe("system");
  await failWrites(page, false);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
});

test("Appearance: a saved Light or Dark choice applies before the app's code loads", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("tether:theme", "dark"));
  await page.route(/\/assets\/index-.*\.js$/, () => {}); // the bundle never arrives
  await page.goto("/", { waitUntil: "commit" });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  expect(await page.locator("#app").innerHTML()).toBe(""); // so the app's own code really did not run
});
