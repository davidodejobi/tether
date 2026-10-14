import { expect, test } from "@playwright/test";
import { finishedRun, seedRecords } from "./results-helpers";

const cycle = (state: string, due: string) => ({
  key: "cycle:strip-disguise",
  value: {
    moveId: "strip-disguise", timeZone: "UTC", state, earnedOn: "2026-10-01", anchor: "2026-10-01",
    entries: [{ id: "2026-10-01+3", day: 3, due, status: "scheduled" }],
    history: [{ runId: "s1", kind: "solo", on: "2026-10-01", passed: true, entryIds: [] }],
  },
});

test("a new learner's Home offers practice, solo and Settings, and Coming soon nodes do nothing", async ({ page }) => {
  await seedRecords(page, [], "/");
  await expect(page.getByRole("link", { name: "Practise Move 1" })).toHaveAttribute("href", "/practice");
  await expect(page.getByRole("link", { name: "Solo check" })).toHaveAttribute("href", "/solo-entry");
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  // The long trail: 50 stage nodes, stages 1 to 5 links, the other 45 plain Coming soon markers.
  const map = page.getByRole("region", { name: "Journey map" });
  await expect(map.locator(".hm-pos")).toHaveCount(50);
  await expect(map.getByRole("link")).toHaveCount(5);
  await expect(map.getByRole("button")).toHaveCount(0);
  await expect(map.getByText("Coming soon")).toHaveCount(45);
  await expect(map.getByText("Stage 7: There is, there are. Coming soon")).toHaveCount(1);
  await expect(map.getByText("Current")).toBeVisible();
  // Three regions with banners and counts from the blueprint.
  for (const name of ["Lexis and Structure", "Comprehension and Summary", "Oral Forms"]) await expect(map.getByRole("heading", { name })).toBeVisible();
  await expect(map.getByText("Stage 1 of 33")).toBeVisible();
  // A real long trail that scrolls inside the map, with the current stage in view on load.
  expect(await map.evaluate((el) => el.scrollHeight > el.clientHeight * 4)).toBe(true);
  await expect(map.getByRole("link", { name: /Move 1: Strip/ })).toBeInViewport();
  await expect(page.getByText("No gap yet. Take your first solo check.")).toBeHidden(); // lives in More on phone
  await page.getByRole("button", { name: "More" }).click();
  await expect(page.getByText("No gap yet. Take your first solo check.")).toBeVisible();
});

test("progress is always on Home, and the phone map keeps most of the screen", async ({ page }) => {
  await seedRecords(page, [], "/");
  await expect(page.getByText("English · 5 of 50 stages available · 0 completed")).toBeVisible(); // not behind More
  await expect(page.getByText("JAMB English concord. Move 1: Strip the Disguise.")).toBeVisible();
  const share = await page.locator(".hm-scroll").evaluate((el) => el.getBoundingClientRect().height / innerHeight);
  expect(share).toBeGreaterThanOrEqual(0.55);
  // The install card is one short line; the instructions open on tap.
  await expect(page.getByText("In your browser menu, choose Install app")).toBeHidden();
  await page.getByRole("button", { name: "How" }).click();
  await expect(page.getByText("In your browser menu, choose Install app")).toBeVisible();
});

test("Coming soon nodes show a number and lock on phone, with the full title in their name and in List view", async ({ page }) => {
  await seedRecords(page, [], "/");
  const map = page.getByRole("region", { name: "Journey map" });
  await expect(map.locator(".hm-soon .hm-lab").first()).toBeHidden();
  await expect(map.getByText("Stage 7: There is, there are. Coming soon")).toHaveCount(1);
  await expect(map.getByText("Strip the Disguise")).toBeVisible(); // the current stage keeps its title
});

for (const [name, width, height] of [["phone", 360, 800], ["tablet", 768, 1024], ["laptop", 1366, 768]] as const)
  test(`the bus and the current stage are in view on first load on ${name}, clear of the controls`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedRecords(page, [], "/");
    const node = page.getByRole("region", { name: "Journey map" }).getByRole("link", { name: /Move 1: Strip/ });
    await expect(node).toBeInViewport({ ratio: 0.99 });
    await expect(page.locator(".hm-bus")).toBeInViewport({ ratio: 0.99 });
    const box = async (l: ReturnType<typeof page.locator>) => (await l.boundingBox())!;
    const [n, b, c] = [await box(node), await box(page.locator(".hm-bus")), await box(page.locator(".hm-ctl-list"))];
    for (const o of [n, b]) expect(o.x + o.width <= c.x || o.y + o.height <= c.y || o.x >= c.x + c.width || o.y >= c.y + c.height).toBe(true);
  });

test("List view shows all 50 stages as an ordered list, and Map view brings the trail back", async ({ page }) => {
  await seedRecords(page, [], "/");
  const map = page.getByRole("region", { name: "Journey map" });
  await page.getByRole("button", { name: "List view" }).click();
  await expect(map.locator(".hm-listview ol > li")).toHaveCount(50);
  await expect(map.getByRole("link")).toHaveCount(5);
  await expect(map.getByText("Stage 7: There is, there are. Coming soon.")).toBeVisible();
  await expect(map.getByText("Stage 50: Emphatic stress. Coming soon.")).toHaveCount(1);
  await page.getByRole("button", { name: "Map view" }).click();
  await expect(map.locator(".hm-pos")).toHaveCount(50);
  await expect(map.getByRole("link", { name: /Move 1: Strip/ })).toBeInViewport();
});

test("Jump to my stage appears when the current stage is off screen", async ({ page }) => {
  await seedRecords(page, [], "/");
  const map = page.getByRole("region", { name: "Journey map" });
  const jump = page.getByRole("button", { name: "Jump to my stage" });
  await expect(map.getByRole("link", { name: /Move 1: Strip/ })).toBeInViewport();
  await expect(jump).toHaveCount(0);
  await map.evaluate((el) => el.scrollTo(0, 0));
  await expect(jump).toBeVisible();
  await jump.click();
  await expect(map.getByRole("link", { name: /Move 1: Strip/ })).toBeInViewport();
  await expect(jump).toHaveCount(0);
});

test("the bus ends beside the current stage once it has driven there", async ({ page }) => {
  await seedRecords(page, [], "/");
  const node = page.getByRole("region", { name: "Journey map" }).getByRole("link", { name: /Move 1: Strip/ });
  // The drive and the hop take a couple of seconds; poll until the bus has come to rest beside the stage.
  const gap = async () => {
    const [bus, n] = await Promise.all([page.locator(".hm-bus").boundingBox(), node.boundingBox()]);
    return Math.hypot(bus!.x + bus!.width / 2 - (n!.x + n!.width / 2), bus!.y + bus!.height / 2 - (n!.y + n!.height / 2));
  };
  await expect.poll(gap, { timeout: 8000 }).toBeLessThan(100);
  await page.waitForFunction(() => document.getAnimations().every((a) => a.effect?.getComputedTiming().endTime === Infinity || a.playState === "finished"));
  expect(await gap()).toBeLessThan(100);
  const [bus, n] = await Promise.all([page.locator(".hm-bus").boundingBox(), node.boundingBox()]);
  // It sits below the stage's disc, on the road, never covering the number.
  expect(bus!.y).toBeGreaterThan(n!.y + n!.height / 2);
});

test("with reduced motion the bus is placed, and nothing animates", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedRecords(page, [], "/");
  const node = page.getByRole("region", { name: "Journey map" }).getByRole("link", { name: /Move 1: Strip/ });
  await expect(node).toBeVisible();
  await page.waitForTimeout(400);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && (a.effect?.getComputedTiming().duration as number) > 1).length);
  expect(running).toBe(0);
  await expect(page.locator(".hm-bus")).not.toHaveAttribute("data-driving", "");
  const [bus, n] = await Promise.all([page.locator(".hm-bus").boundingBox(), node.boundingBox()]);
  expect(Math.hypot(bus!.x + bus!.width / 2 - (n!.x + n!.width / 2), bus!.y + bus!.height / 2 - (n!.y + n!.height / 2))).toBeLessThan(100);
});

test("tapping stage 1 hops the bus onto it, then opens practice", async ({ page }) => {
  await seedRecords(page, [], "/");
  await page.getByRole("region", { name: "Journey map" }).getByRole("link", { name: /Move 1: Strip/ }).click();
  await expect(page).toHaveURL(/\/practice$/);
});

test("a solo without a practice score shows the alone score and how to get a first gap", async ({ page }) => {
  await seedRecords(page, [finishedRun("s1", "solo", 6, { n: 1, practice: null })], "/");
  await expect(page.getByText("Alone: 6 of 10")).toBeVisible();
  await expect(page.getByText(/Answer ten practice questions, then take another solo check/)).toBeVisible();
  await expect(page.getByText("No gap yet")).toHaveCount(0);
});

// A service worker would answer from its cache and skip the route below.
test.describe("art blocked", () => {
test.use({ serviceWorkers: "block" });
test("the map art loads lazily and the screen works without it", async ({ page }) => {
  // The art is its own chunk (mapArt-*.js); blocking it leaves the plain colour, the road, the nodes and the bus.
  await page.route(/mapArt.*\.js/, (r) => r.abort());
  await page.route("**/*.svg", (r) => (r.request().url().includes("/map/") || /day|night/.test(r.request().url()) ? r.abort() : r.continue()));
  await seedRecords(page, [], "/");
  await expect(page.getByRole("link", { name: "Practise Move 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Move 1: Strip/ })).toBeVisible();
  await expect(page.locator(".hm-pos")).toHaveCount(50);
  await expect(page.locator(".hm-art svg")).toHaveCount(0);
  await expect(page.locator(".hm-bus")).toBeVisible();
});
});

test("the map art arrives after first paint, as decoration only", async ({ page }) => {
  await seedRecords(page, [], "/");
  await expect(page.locator(".hm-art svg").first()).toBeAttached();
  expect(await page.locator(".hm-art, .hm-amb").evaluateAll((els) => els.every((e) => e.getAttribute("aria-hidden") === "true"))).toBe(true);
});

test("a due recheck is the primary action, shown as Held with a Due badge and dated like the result page", async ({ page }) => {
  await seedRecords(page, [finishedRun("s1", "solo", 6, { n: 1, practice: 10 }), cycle("held", "2026-10-04")], "/");
  await expect(page.getByRole("link", { name: "Start recheck" })).toHaveAttribute("href", "/recheck-entry");
  await expect(page.getByRole("link", { name: /Move 1.*Held, due/ }).first()).toBeVisible();
  await expect(page.getByText("Latest gap: 4")).toBeVisible();
  await expect(page.getByRole("link", { name: "Solo check" })).toBeVisible();
  await page.goto("/?demo=2026-10-02");
  await expect(page.getByText("First recheck")).toHaveCount(0); // held: nothing due yet, so the next date is shown
  await expect(page.getByText("Next recheck: 4 Oct 2026")).toBeVisible();
  await expect(page.getByText(/\d{4}-\d{2}-\d{2}/)).toHaveCount(0);
});

test("a fading move offers recovery", async ({ page }) => {
  await seedRecords(page, [finishedRun("s1", "solo", 9, { n: 1, practice: 9 }), cycle("fading", "2026-10-04")], "/");
  await expect(page.getByRole("link", { name: "Practise to recover" })).toHaveAttribute("href", "/practice");
  await expect(page.getByRole("link", { name: /Move 1.*Fading/ })).toBeVisible();
  await expect(page.getByText("No help gap on your latest solo check")).toBeVisible();
});

for (const [name, width, height] of [["phone", 360, 800], ["tablet", 768, 1024], ["laptop", 1366, 768]] as const) {
  test(`Settings is reachable from Home on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await seedRecords(page, [], "/");
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("Home names the move beside the primary action", async ({ page }) => {
  await seedRecords(page, [], "/");
  await expect(page.getByText("JAMB English concord. Move 1: Strip the Disguise.")).toBeVisible();
});

for (const [name, width, height] of [["phone", 360, 800], ["tablet", 768, 1024], ["laptop", 1366, 768]] as const)
  test(`Settings has a way back to Home on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await seedRecords(page, [], "/settings");
    // From 1280 px the rail's Home link is the way back; below that, the page's own back link.
    const home = page.getByRole("link", { name: "Home" });
    await home.first().click();
    await expect(page).toHaveURL(/\/$/);
  });
