import { expect, type Page } from "@playwright/test";

// Shared by the solo specs and the whole-product journeys: reading saved runs, answering a run, and faking tab visibility.
export const idb = <T,>(page: Page, fn: (rows: [string, any][]) => T) =>
  page.evaluate(
    (src) =>
      new Promise<any>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const store = open.result.transaction("records").objectStore("records");
          const keys = store.getAllKeys();
          keys.onsuccess = () => {
            const vals = store.getAll();
            vals.onsuccess = () => resolve(new Function("rows", `return (${src})(rows)`)(keys.result.map((k, i) => [k, vals.result[i]])));
          };
        };
      }),
    fn.toString(),
  ) as Promise<T>;
export const runs = (page: Page) => idb(page, (rows) => rows.filter(([k]) => String(k).startsWith("run:")).map(([, v]) => v));
export const activeRun = async (page: Page) => (await runs(page)).find((r: any) => r.run.status === "active");

export async function put(page: Page, key: string, value: unknown) {
  await page.evaluate(
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
}
export const heading = (page: Page, n: number, of = 10) => page.getByRole("heading", { name: new RegExp(`^Question ${n} of ${of}`) });

/** Answers the current question (right or deliberately wrong) and moves on. The saved run holds the answer; the UI never shows it. */
export async function answer(page: Page, right: boolean, n: number, of = 10) {
  await expect(heading(page, n, of)).toBeVisible();
  await expect.poll(async () => (await activeRun(page))?.run.submissions.length).toBe(n - 1);
  const saved = await activeRun(page);
  const q = saved.questions[n - 1];
  const word = right ? q.answer : q.options.find((o: string) => o !== q.answer);
  await page.getByRole("radio", { name: new RegExp(`: ${word}$`) }).click();
  await page.getByRole("button", { name: n === of ? "Finish" : "Next" }).click();
}
export const hide = (page: Page, hidden: boolean) =>
  page.evaluate((h) => {
    Object.defineProperty(document, "visibilityState", { value: h ? "hidden" : "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
