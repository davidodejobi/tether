import { expect, test } from "@playwright/test";
import { current, records, seed, tile } from "../e2e/practice-helpers";

// One genuine provider call through the deployed function, driven from the real Still stuck? control (spec section 5a).
test("deployed Still stuck? returns a genuine, labelled AI explanation and records AI help", async ({ page }) => {
  test.setTimeout(60_000);
  await seed(page);
  for (let n = 0; n < 3; n++) {
    const q = await current(page);
    await tile(page, q.options.filter((o) => o !== q.answer)[n]!).click();
    await page.getByRole("button", { name: "Check" }).click();
    if (n < 2) await page.getByRole("button", { name: "Try again" }).click();
  }
  const reply = page.waitForResponse((r) => r.url().endsWith("/api/explain"), { timeout: 20_000 });
  await page.getByRole("button", { name: "In plain words" }).click();
  const res = await reply;
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  await expect(page.getByText("AI help · based on the reviewed move explanation")).toBeVisible();
  await expect(page.getByText(body.text)).toBeVisible();
  await expect.poll(async () => (await records(page)).some((r) => r.attempt.help.includes("ai"))).toBe(true);
  console.log("live AI text:", body.text);
});
