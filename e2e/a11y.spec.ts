import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { LEARNER, current, seed, tile } from "./practice-helpers";
import { finishedRun, seedRecords } from "./results-helpers";

// Step 17 first pass (spec section 14). TODO(post-merge): add Home and Settings once steps 14-16 land;
// they are excluded from axe here because they are being rewritten in parallel.

const scan = async (page: Page) => {
  // Entrance fades would otherwise be measured half transparent.
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime !== Infinity).map((a) => a.finished.catch(() => {}))));
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
};

const SIZES = [[360, 800], [1366, 768]] as const;
const SCHEMES = ["light", "dark"] as const;

async function soloRun(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).waitFor();
  await page.evaluate(
    (learner) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const tx = open.result.transaction("records", "readwrite");
          tx.objectStore("records").put(learner, "learner");
          tx.oncomplete = () => resolve();
        };
      }),
    LEARNER,
  );
  await page.goto("/run/solo");
  await expect(page.getByRole("heading", { name: /^Question 1 of 10/ })).toBeVisible();
}

for (const [w, h] of SIZES)
  for (const scheme of SCHEMES)
    test.describe(`axe ${w}px ${scheme}`, () => {
      test.use({ viewport: { width: w, height: h }, colorScheme: scheme });

      test("onboarding and lesson", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("button", { name: "Start" }).click();
        await scan(page);
        await page.getByLabel("Nickname").fill("Amaka");
        await page.getByRole("button", { name: "Continue" }).click();
        await expect(page.getByRole("heading", { name: /Cover the side phrase/ })).toBeFocused();
        await scan(page);
      });

      test("practice question and Show me", async ({ page }) => {
        await seed(page);
        await current(page);
        await expect(page.getByRole("button", { name: "Check" })).toBeVisible();
        await scan(page);
        await page.getByRole("button", { name: "Show me" }).first().click();
        await expect(page.getByText("Step 1 of 3")).toBeVisible();
        await scan(page);
      });

      test("honesty reasons", async ({ page }) => {
        await seed(page);
        await tile(page, (await current(page)).answer).click();
        await page.getByRole("button", { name: "Check" }).click();
        await expect(page.getByRole("radio", { name: "I guessed" })).toBeEnabled();
        await scan(page);
      });

      test("solo run", async ({ page }) => {
        await soloRun(page);
        await scan(page);
      });

      test("result", async ({ page }) => {
        await seedRecords(page, [finishedRun("a", "solo", 6, { n: 1, practice: 9 })], "/result/a");
        await expect(page.getByRole("heading", { name: "Not yet" })).toBeVisible();
        await scan(page);
      });
    });

test("no horizontal overflow at phone, tablet and laptop, and at 200% text", async ({ page }) => {
  await seed(page);
  for (const [w, h] of [[360, 800], [768, 1024], [1366, 768]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/practice");
    await current(page);
    for (const size of ["16px", "32px"]) {
      await page.addStyleTag({ content: `html{font-size:${size} !important}` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${w}px @${size}`).toBe(true);
      // Actions stay reachable: Check can be scrolled to and clicked.
      await page.getByRole("button", { name: "Check" }).scrollIntoViewIfNeeded();
      await expect(page.getByRole("button", { name: "Check" })).toBeInViewport();
    }
  }
});

test("the move sheet and Show me hand focus back sensibly", async ({ page }) => {
  await seed(page);
  await current(page);
  const opener = page.getByRole("button", { name: /^The move:/ });
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
  // Show me ends with "Put it in yourself": focus goes to the first choice, on purpose.
  await page.getByRole("button", { name: "Show me" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Show me" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true); // focus stays trapped
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("radio").first()).toBeFocused();
});

test("reduced motion leaves no running animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(page);
  await current(page);
  await tile(page, (await current(page)).answer).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
  const running = await page.evaluate(() =>
    document.getAnimations().filter((a) => a.playState === "running" && !((a as CSSAnimation).animationName ?? "").startsWith("")).length +
    document.getAnimations().filter((a) => a.playState === "running" && (a.effect?.getComputedTiming().duration as number) > 1).length,
  );
  expect(running).toBe(0);
});

test("without speechSynthesis the text controls stay usable", async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as any).speechSynthesis;
  });
  await seed(page, { ...LEARNER, readAloud: true });
  await current(page);
  await expect(page.getByRole("button", { name: "Check" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show me" }).first()).toBeEnabled();
  await tile(page, (await current(page)).answer).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("radio", { name: "I guessed" })).toBeVisible();
  await page.keyboard.press("r"); // must not throw
  await expect(page.getByText(/Read aloud isn.t available/)).toBeVisible();
});

// Targets of 48 px, text of 12 px and 16 px inputs, on each screen (spec section 14).
const sizes = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
    const name = (e: Element) => `${e.tagName.toLowerCase()}.${(e as HTMLElement).className} "${(e.textContent ?? "").trim().slice(0, 20)}"`;
    for (const e of document.querySelectorAll("button, a[href], [role=radio], input, select, textarea, summary")) {
      if (!vis(e) || (e as HTMLInputElement).type === "hidden") continue;
      const r = e.getBoundingClientRect();
      if (r.width < 47.5 || r.height < 47.5) out.push(`target ${Math.round(r.width)}x${Math.round(r.height)} ${name(e)}`);
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) && parseFloat(getComputedStyle(e).fontSize) < 16) out.push(`input font ${name(e)}`);
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (el && n.textContent?.trim() && vis(el) && !el.closest("[aria-hidden=true]") && parseFloat(getComputedStyle(el).fontSize) < 12) out.push(`text ${getComputedStyle(el).fontSize} ${name(el)}`);
    }
    return out;
  });

for (const [w, h] of SIZES)
  test(`targets, text and inputs meet size minimums at ${w}px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    await page.getByRole("button", { name: "Start" }).click();
    expect(await sizes(page), "onboarding").toEqual([]);
    await page.getByLabel("Nickname").fill("Amaka");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: /Cover the side phrase/ })).toBeFocused();
    expect(await sizes(page), "lesson").toEqual([]);
  });

for (const [w, h] of SIZES)
  test(`practice and run meet size minimums at ${w}px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await seed(page);
    await current(page);
    expect(await sizes(page), "question").toEqual([]);
    await tile(page, (await current(page)).answer).click();
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByRole("radio", { name: "I guessed" })).toBeEnabled();
    expect(await sizes(page), "honesty").toEqual([]);
    await page.goto("/run/solo");
    await expect(page.getByRole("heading", { name: /^Question 1 of 10/ })).toBeVisible();
    expect(await sizes(page), "solo").toEqual([]);
  });

test("choices are a radio group: 1-4 and arrows select, the blank is filled, Enter checks", async ({ page }) => {
  await seed(page);
  await current(page);
  await expect(page.getByRole("radiogroup")).toBeVisible();
  await page.keyboard.press("2");
  await expect(page.getByRole("radio").nth(1)).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowRight");
  const checked = page.getByRole("radio", { checked: true });
  await expect(checked).toHaveCount(1);
  await expect(checked).not.toHaveAttribute("aria-checked", "false");
  await expect(page.locator(".qv-sentence")).toContainText((await checked.getAttribute("aria-label"))!.split(": ").pop()!.trim());
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").first()).toBeAttached();
});

test("shortcuts are ignored while typing", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByLabel("Nickname").fill("");
  await page.getByLabel("Nickname").pressSequentially("Srsr");
  await expect(page.getByLabel("Nickname")).toHaveValue("Srsr");
});
