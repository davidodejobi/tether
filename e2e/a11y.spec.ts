import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { LEARNER, current, seed, tile } from "./practice-helpers";
import { cycle as proofCycle, finishedRun, seedRecords } from "./results-helpers";

// Step 17 (spec section 14): axe, sizes, overflow, focus and reduced motion on every screen.

const scan = async (page: Page) => {
  // Entrance fades would otherwise be measured half transparent.
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime !== Infinity).map((a) => a.finished.catch(() => {}))));
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
};

// Home's saved cycle uses the id "strip-disguise" (results-helpers' cycle() uses the pack's other id, which Share reads).
const cyc = (state: string, due: string, status = "scheduled") => ({
  key: "cycle:strip-disguise",
  value: { moveId: "strip-disguise", timeZone: "UTC", state, earnedOn: "2026-10-01", anchor: "2026-10-01", entries: [{ id: "2026-10-01+3", day: 3, due, status }], history: [{ runId: "g1", kind: "solo", on: "2026-10-01", passed: true, entryIds: [] }] },
});
const gapRun = finishedRun("g1", "solo", 8, { n: 1, practice: 10 });

const homeReady = async (page: Page) => {
  await expect(page.getByRole("heading", { name: "Tether" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Journey map" })).toBeVisible();
};

/** Every screen from the Step 17 list, seeded and waited for. `cues` are Home's offline and install cues. */
const SCREENS: [string, (page: Page) => Promise<void>][] = [
  ["home new", async (p) => (await seedRecords(p, [], "/"), await homeReady(p))],
  ["home held and due", async (p) => (await seedRecords(p, [gapRun, cyc("held", "2026-10-04")], "/"), await homeReady(p), await expect(p.getByRole("link", { name: "Start recheck" })).toBeVisible())],
  ["home fading with a gap", async (p) => (await seedRecords(p, [gapRun, cyc("fading", "2026-10-04", "paused")], "/"), await homeReady(p), await expect(p.getByText("Latest gap: 2")).toBeVisible())],
  ["course overview", async (p) => (await seedRecords(p, [], "/course"), await expect(p.getByRole("heading", { name: "English course" })).toBeVisible())],
  ["course section", async (p) => (await seedRecords(p, [], "/course/lexis-and-structure"), await expect(p.getByRole("heading", { name: "Lexis and Structure" })).toBeVisible())],
  ["course planned topic", async (p) => (await seedRecords(p, [], "/course/lexis-and-structure/tense-and-mood"), await expect(p.getByRole("heading", { name: "Tense and mood" })).toBeVisible())],
  ["course topic with a due recheck", async (p) => (await seedRecords(p, [gapRun, cyc("held", "2026-10-04")], "/course/lexis-and-structure/concord"), await expect(p.getByRole("link", { name: "Start recheck" })).toBeVisible())],
  ["settings", async (p) => (await seedRecords(p, [], "/settings"), await expect(p.getByRole("heading", { name: "Settings" })).toBeVisible())],
  ["share preview", async (p) => (await seedRecords(p, [finishedRun("a", "solo", 9, { n: 1, practice: 9 }), proofCycle("proved", "a", "2026-10-13", "2026-10-16")], "/share/a?kind=proof"), await expect(p.locator("img.sh-card")).toBeVisible())],
  ["offline cues", async (p) => (await seedRecords(p, [], "/"), await expect(p.getByText("Ready offline")).toBeVisible(), await expect(p.getByText("Add Tether to your home screen")).toBeVisible())],
  ["offline cue Retry", async (p) => {
    await seedRecords(p, [], "/");
    await expect(p.getByText("Ready offline")).toBeVisible();
    await p.evaluate(async () => (await caches.open((await caches.keys()).find((k) => k.startsWith("tether-"))!)).delete("/icon-512.png"));
    await p.reload();
    await expect(p.getByRole("button", { name: "Retry" })).toBeVisible();
  }],
  ["add to calendar on the result", async (p) => (await seedRecords(p, [gapRun, cyc("proved", "2099-03-04"), proofCycle("proved", "g1", "2026-10-01", "2099-03-04")], "/result/g1"), await expect(p.getByRole("button", { name: "Add to calendar" })).toBeVisible())],
];

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
        await expect(page.getByRole("heading", { name: "Pick your subjects" })).toBeFocused();
        await scan(page);
        await page.getByRole("button", { name: "Continue" }).click();
        await page.getByLabel("Nickname").fill("Amaka");
        await page.getByRole("button", { name: "Continue" }).click();
        await expect(page.getByRole("heading", { name: "Your English course" })).toBeFocused();
        await scan(page);
        await page.getByRole("button", { name: "Start Move 1" }).click();
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

for (const [w, h] of SIZES)
  for (const scheme of SCHEMES)
    test.describe(`axe step 14-16 screens ${w}px ${scheme}`, () => {
      test.use({ viewport: { width: w, height: h }, colorScheme: scheme });
      for (const [name, open] of SCREENS)
        test(name, async ({ page }) => {
          await open(page);
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
      // A radio or checkbox is operated through its whole label row, so that row is the target.
      const box = /^(radio|checkbox)$/.test((e as HTMLInputElement).type) ? (e.closest("label") ?? e) : e;
      const r = box.getBoundingClientRect();
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
    await page.getByRole("button", { name: "Continue" }).click();
    expect(await sizes(page), "subjects").toEqual([]);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Nickname").fill("Amaka");
    await page.getByRole("button", { name: "Continue" }).click();
    expect(await sizes(page), "course").toEqual([]);
    await page.getByRole("button", { name: "Start Move 1" }).click();
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
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /What should we call you/ })).toBeFocused();
  await page.getByLabel("Nickname").click();
  await page.getByLabel("Nickname").pressSequentially("Srsr", { delay: 60 });
  await expect(page.getByLabel("Nickname")).toHaveValue("Srsr");
});

// ---- Step 17: the same screens, checked for size, overflow, focus, order, map semantics and motion ----

for (const [name, open] of SCREENS) {
  for (const [w, h] of SIZES)
    test(`${name} meets size minimums at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await open(page);
      expect(await sizes(page)).toEqual([]);
    });

  test(`${name} does not scroll sideways at phone, tablet and laptop, nor at 200% text`, async ({ page }) => {
    await open(page);
    for (const [w, h] of [[360, 800], [768, 1024], [1366, 768]] as const) {
      await page.setViewportSize({ width: w, height: h });
      for (const size of ["16px", "32px"]) {
        await page.addStyleTag({ content: `html{font-size:${size} !important}` });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${w}px @${size}`).toBe(true);
      }
    }
  });
}

/** Tabs through the page; returns each stop's label, outline, and whether it follows the previous stop in the DOM. */
async function tabStops(page: Page, max = 40) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const stops: { label: string; ring: boolean; inOrder: boolean; positive: boolean }[] = [];
  let prev = "";
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate((previous) => {
      const el = document.activeElement as HTMLElement;
      if (!el || el === document.body) return null;
      const id = el.getAttribute("data-tab") ?? String(Math.random());
      el.setAttribute("data-tab", id);
      const cs = getComputedStyle(el);
      const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2) || cs.boxShadow !== "none";
      const before = previous ? document.querySelector(`[data-tab="${previous}"]`) : null;
      const label = `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 24)}"`;
      return { id, label, ring, positive: el.tabIndex > 0, inOrder: !before || !!(before.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) };
    }, prev);
    if (!stop) break;
    if (stop.id === prev) break;
    prev = stop.id;
    stops.push(stop);
  }
  return stops;
}

for (const [name, open] of SCREENS)
  for (const [w, h] of SIZES)
    test(`${name}: every tab stop has a visible focus ring and the order follows the page at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await open(page);
      const stops = await tabStops(page);
      expect(stops.length, "tab stops").toBeGreaterThan(0);
      expect(stops.filter((s) => !s.ring).map((s) => s.label), "focus ring").toEqual([]);
      expect(stops.filter((s) => !s.inOrder || s.positive).map((s) => s.label), "tab order").toEqual([]);
    });

test("Home map: stage 1 is the only link, Coming soon nodes cannot be focused, and the art is decorative", async ({ page }) => {
  await seedRecords(page, [], "/");
  await homeReady(page);
  const map = page.getByRole("region", { name: "Journey map" });
  await expect(map.getByRole("link")).toHaveCount(1);
  await expect(map.getByRole("link")).toHaveAttribute("href", "/practice");
  await expect(map.getByRole("button")).toHaveCount(0);
  const soon = await map.locator(".hm-pos.hm-soon").evaluateAll((els) => els.map((e) => ({ tag: e.tagName, tabindex: e.getAttribute("tabindex"), role: e.getAttribute("role"), focusable: !!e.querySelector("a, button, [tabindex]"), name: e.querySelector(".sr-only")?.textContent })));
  expect(soon).toHaveLength(49);
  for (const n of soon) expect(n).toMatchObject({ tag: "LI", tabindex: null, role: null, focusable: false });
  expect(soon[5]!.name).toBe("Stage 7: There is, there are. Coming soon");
  // Tabbing through the page never lands on a Coming soon node; the map itself is one scrollable stop, then stage 1.
  const stops = await tabStops(page, 60);
  expect(stops.filter((s) => /Coming soon|Stage [2-9]/.test(s.label))).toEqual([]);
  expect(stops.some((s) => /Move 1: Strip/.test(s.label) || /Stage 1/.test(s.label))).toBe(true);
  // Disc numbers, icons, the art and the bus are decoration; no unlabelled image or svg is exposed.
  const exposed = await map.evaluate((m) => [...m.querySelectorAll(".hm-disc, .icon, img, svg")].filter((e) => !e.closest("[aria-hidden=true]") && !e.getAttribute("aria-label")).map((e) => e.className || e.tagName));
  expect(exposed).toEqual([]);
});

for (const [name, open] of SCREENS)
  test(`${name}: reduced motion leaves no running animations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && (a.effect?.getComputedTiming().duration as number) > 1).map((a) => (a as CSSAnimation).animationName ?? a.constructor.name));
    expect(running).toEqual([]);
  });

test("a device with speechSynthesis but no voices says read-aloud is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const synth = Object.assign(new EventTarget(), { getVoices: () => [], speak() {}, cancel() {}, speaking: false, pending: false });
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  });
  await seed(page, { ...LEARNER, readAloud: true });
  await current(page);
  await expect(page.getByText(/Read aloud isn.t available/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Read aloud" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Check" })).toBeVisible();
});
