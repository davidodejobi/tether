// Saved-learner compatibility (roadmap step 18): a learner who used the OLD app keeps everything when the NEW build loads at the same origin.
// Builds the old app (OLD_REF, default 3a139a6) in a temp worktree, serves it on COMPAT_PORT, drives a persistent Chromium profile through
// onboarding and practice, then serves THIS checkout's build on the same port, reopens the same profile and compares everything.
// Usage: node tools/compat-check.ts   (env: COMPAT_PORT=4263, OLD_REF=3a139a6, COMPAT_DIR=<temp dir>, KEEP=1 keeps the dir)
// The old app has no solo runs (its /solo is a placeholder), so the run, snapshot and proof cycle are written into the old profile in the saved format.
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { answerTutorials } from "../e2e/tutorial.ts";

const PORT = Number(process.env.COMPAT_PORT ?? 4263);
const REF = process.env.OLD_REF ?? "3a139a6";
const REPO = resolve(import.meta.dirname, "..");
const WORK = process.env.COMPAT_DIR ?? mkdtempSync(join(tmpdir(), "tether-compat-"));
const BASE = `http://localhost:${PORT}`;
const sh = (cmd: string, args: string[], cwd: string) => execFileSync(cmd, args, { cwd, stdio: ["ignore", "pipe", "inherit"] }).toString();

const results: { name: string; ok: boolean; note?: string }[] = [];
const check = (name: string, ok: boolean, note?: string) => (results.push({ name, ok, note }), console.log(`${ok ? "PASS" : "FAIL"}  ${name}${note ? `  (${note})` : ""}`));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------- builds and servers
function buildOld(): string {
  const tree = join(WORK, "old-app");
  if (!existsSync(join(tree, "dist/index.html"))) {
    if (!existsSync(tree)) {
      sh("git", ["worktree", "add", "--detach", tree, REF], REPO);
      sh("cp", ["-Rc", join(REPO, "node_modules"), join(tree, "node_modules")], REPO); // reuse installed modules, no npm install
    }
    sh("npx", ["vite", "build"], tree);
  }
  return join(tree, "dist");
}
function buildNew(): string {
  const out = join(WORK, "new-dist");
  sh("npx", ["vite", "build", "--outDir", out, "--emptyOutDir"], REPO);
  return out;
}
async function serve(dist: string): Promise<ChildProcess> {
  const p = spawn("npx", ["vite", "preview", "--outDir", dist, "--port", String(PORT), "--strictPort"], { cwd: REPO, stdio: "ignore", detached: true });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(BASE)).ok) return p;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`preview did not start on ${PORT}`);
}
const stop = async (p: ChildProcess) => {
  try {
    process.kill(-p.pid!);
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
};

// ---------------------------------------------------------------- storage helpers
type Rows = Record<string, any>;
const dump = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<Rows>((resolve) => {
        const open = indexedDB.open("tether");
        open.onsuccess = () => {
          const store = open.result.transaction("records").objectStore("records");
          const keys = store.getAllKeys();
          keys.onsuccess = () => {
            const vals = store.getAll();
            vals.onsuccess = () => resolve(Object.fromEntries(keys.result.map((k, i) => [String(k), vals.result[i]])));
          };
        };
      }),
  );
const put = (page: Page, items: [string, unknown][]) =>
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
    items,
  );
const withPrefix = (rows: Rows, p: string) => Object.entries(rows).filter(([k]) => k.startsWith(p));
const openAttempt = (rows: Rows) => withPrefix(rows, "attempt:").map(([, v]) => v).find((r) => r.attempt.completedAt === undefined);

// ---------------------------------------------------------------- driving the app
const tile = (page: Page, word: string) => page.getByRole("radio", { name: new RegExp(`: ${word}(,|$)`) });
// Math.random is read through window.__r when set, so the one-in-three verification can be skipped (0.9) on demand.
const forceable = `(() => { const real = Math.random; Math.random = () => window.__r ?? real(); })()`;

async function openQuestion(page: Page) {
  for (let i = 0; i < 60; i++) {
    const a = openAttempt(await dump(page));
    if (a) return a.question as { answer: string; options: string[] };
    await page.waitForTimeout(100);
  }
  throw new Error("no open question saved");
}
async function practiceRight(page: Page) {
  const q = await openQuestion(page);
  await tile(page, q.answer).click();
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("radio", { name: "I used the move" }).waitFor();
  await page.evaluate(() => ((window as any).__r = 0.9));
  await page.getByRole("radio", { name: "I used the move" }).click();
  await page.evaluate(() => ((window as any).__r = undefined));
  await page.getByRole("button", { name: /^Next/ }).click();
}
async function onboard(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByLabel("Nickname").fill("Amaka");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /Got it/ }).click();
  await answerTutorials(page);
  await page.getByRole("button", { name: "Make Tether yours" }).click();
  await page.getByText("Text only").click();
  await page.getByRole("button", { name: /Someone to see your wins/ }).click();
  await page.getByLabel(/Their name/).fill("Mrs Okafor");
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("heading", { name: "Tether" }).waitFor();
}

const DAY = 86_400_000;
const civil = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Old-format solo run, snapshot and proof cycle (the old UI cannot produce them), in the shapes the old rules wrote. */
function oldRecords(after: number): [string, unknown][] {
  const now = Date.now();
  const qs = Array.from({ length: 10 }, (_, i) => ({ id: `old-q${i}`, moveId: "strip-disguise", contentVersion: 1, subject: "The teacher", covered: "as well as the pupils", predicate: "the room", number: "sg", pairing: "x", options: ["enters", "enter", "entering", "entered"], answer: "enters" }));
  const run = {
    id: "old-run", kind: "solo", questionIds: qs.map((q) => q.id),
    submissions: qs.map((q, i) => ({ questionId: q.id, correct: i < 8, at: { at: now, seq: after + 1 + i } })),
    started: { at: now, seq: after }, deadline: now + 600_000, lastSeenAt: now, status: "completed", endedAt: now + 1000,
    result: { score: 8, total: 10, passed: true, timedOut: false }, practiceSnapshot: 3,
  };
  const anchor = civil(now - 5 * DAY);
  const cycle = {
    moveId: "strip-disguise", timeZone: "Africa/Lagos", state: "proved", earnedOn: anchor, anchor,
    entries: [3, 7, 14].map((day, i) => ({ id: `${anchor}+${day}`, day, due: civil(now - 5 * DAY + day * DAY), status: "scheduled" })),
    history: [{ runId: "old-run", kind: "solo", on: anchor, passed: true, entryIds: [] }],
  };
  return [["run:old-run", { run, questions: qs }], ["cycle:strip-disguise", cycle]];
}

async function answerRun(page: Page, rightCount: number) {
  for (let n = 1; n <= 10; n++) {
    await page.getByRole("heading", { name: new RegExp(`^Question ${n} of 10`) }).waitFor();
    let saved: any;
    for (let i = 0; i < 60 && !saved; i++) {
      saved = withPrefix(await dump(page), "run:").map(([, v]) => v).find((r) => r.run.status === "active" && r.run.submissions.length === n - 1);
      if (!saved) await page.waitForTimeout(100);
    }
    const q = saved.questions[n - 1];
    const word = n <= rightCount ? q.answer : q.options.find((o: string) => o !== q.answer);
    await page.getByRole("radio", { name: new RegExp(`: ${word}$`) }).click();
    await page.getByRole("button", { name: n === 10 ? "Finish" : "Next" }).click();
  }
}

// ---------------------------------------------------------------- main
const profile = join(WORK, "profile");
mkdirSync(profile, { recursive: true });
let server: ChildProcess | undefined;
let ctx: BrowserContext | undefined;
const watch = (c: BrowserContext, bag: string[]) => {
  c.on("page", (p) => {
    p.on("pageerror", (e) => bag.push(`pageerror: ${e.message}`));
    p.on("console", (m) => m.type() === "error" && bag.push(`console: ${m.text()}`));
  });
};
const launch = (bag: string[]) => chromium.launchPersistentContext(profile, { viewport: { width: 360, height: 800 }, baseURL: BASE }).then((c) => (watch(c, bag), c.addInitScript(forceable), c));

try {
  console.log(`work dir ${WORK}`);
  const oldDist = buildOld();
  const newDist = buildNew();

  // ---- phase 1: the old app
  server = await serve(oldDist);
  const oldErrors: string[] = [];
  ctx = await launch(oldErrors);
  let page = await ctx.newPage();
  await onboard(page);
  check("old: no service worker registered", (await page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length))) === 0);
  await page.goto("/settings");
  await page.getByRole("checkbox", { name: "Sounds" }).check();
  await page.waitForFunction(() => true);
  for (let i = 0; i < 3; i++) {
    await page.goto("/practice");
    await practiceRight(page);
  }
  await page.goto("/practice");
  await openQuestion(page); // a fourth question is left open and unanswered
  await page.waitForTimeout(500);
  let rows = await dump(page);
  const seqs = Object.values(rows).flatMap((v: any) => (v?.attempt ? [v.attempt.startedAt?.seq, v.attempt.completedAt?.seq, v.attempt.reasonAt?.seq] : [])).filter(Number.isFinite);
  await put(page, oldRecords(Math.max(0, ...seqs) + 1));
  const before = await dump(page);
  await ctx.close();
  await stop(server);
  const L0 = before.learner;
  check("old: learner saved with choices", L0?.nickname === "Amaka" && L0.coach === "text" && L0.sounds === true && L0.partner?.name === "Mrs Okafor" && !!L0.avatarSeed, JSON.stringify({ ...L0, partner: L0?.partner }));
  const done = withPrefix(before, "attempt:").filter(([, v]) => v.attempt.completedAt !== undefined);
  check("old: 3 completed practice attempts and 1 open question", done.length >= 3 && !!openAttempt(before), `${done.length} completed`);
  const openBefore = openAttempt(before)!;

  // ---- phase 2: the new build at the same origin and profile
  server = await serve(newDist);
  const newErrors: string[] = [];
  ctx = await launch(newErrors);
  page = await ctx.newPage();
  await page.goto("/");
  await page.getByRole("heading", { name: "Tether" }).waitFor();
  await page.getByText("Solo check").first().waitFor();
  const after1 = await dump(page);

  // everything saved by the old app is byte-for-byte unchanged (the new build may add meta keys, never alter old records)
  const changed = Object.keys(before).filter((k) => !same(before[k], after1[k]));
  check("new: every old record unchanged after load", changed.length === 0, changed.length ? `changed: ${changed.join(", ")}` : `${Object.keys(before).length} records`);
  const L1 = after1.learner;
  check("new: learner, settings, avatar seed unchanged", same(L0, L1), `avatarSeed ${L1?.avatarSeed}, coach ${L1?.coach}, sounds ${L1?.sounds}`);
  check("new: proof cycle, schedule and time zone unchanged", same(before["cycle:strip-disguise"], after1["cycle:strip-disguise"]) && after1["cycle:strip-disguise"].timeZone === "Africa/Lagos");
  check("new: solo run and snapshot unchanged", same(before["run:old-run"], after1["run:old-run"]) && after1["run:old-run"].run.practiceSnapshot === 3);
  const body = await page.locator("body").innerText();
  check("new: Home shows the due recheck and the latest solo gap", /recheck/i.test(body) && /Alone: 8 of 10|Latest gap|gap/i.test(body), body.replace(/\s+/g, " ").slice(0, 160));

  // service worker installs over a page that had none
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    for (let i = 0; i < 100 && reg.active?.state !== "activated"; i++) await new Promise((r) => setTimeout(r, 100));
    return { active: reg.active?.state, scope: reg.scope };
  });
  check("new: service worker installed and activated over a page that had none", sw.active === "activated", JSON.stringify(sw));
  await page.getByText("Ready offline").waitFor({ timeout: 15_000 }).then(() => check("new: precache completes (Ready offline)", true), () => check("new: precache completes (Ready offline)", false));

  // practice continues: the open question keeps its exact option order and resumes
  await page.goto("/practice");
  await page.getByRole("radio").first().waitFor();
  const names = await page.getByRole("radio").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? e.textContent ?? ""));
  const order = openBefore.question.options as string[];
  check("new: open question resumes with the same option order", names.length === 4 && order.every((o, i) => new RegExp(`: ${o}(,|$)`).test(names[i]!)), `${order.join(" / ")}`);
  const attemptsBefore = withPrefix(after1, "attempt:").length;
  await tile(page, openBefore.question.answer).click();
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: /^Next/ }).or(page.getByRole("radio", { name: "It sounded right" })).waitFor();
  await page.waitForTimeout(500);
  const after2 = await dump(page);
  const finished = after2[Object.keys(after2).find((k) => k.startsWith("attempt:") && after2[k].attempt.id === openBefore.attempt.id)!];
  check("new: the old open attempt completes in place (same id, same options)", !!finished?.attempt.completedAt && same(finished.question.options, order) && withPrefix(after2, "attempt:").length === attemptsBefore);

  // solo entry and a full run, scoring against the old cycle
  await page.goto("/solo-entry");
  await page.getByRole("heading", { name: /solo-ready/ }).waitFor();
  // The old solo run began after the dots were earned, so readiness restarts at 0 by design (rules/practice.ts): "Try anyway" is offered.
  const start = page.getByRole("button", { name: /^(Start solo checkpoint|Try anyway)$/ });
  check("new: solo entry opens and offers a start", await start.isVisible(), (await page.getByRole("heading", { level: 1 }).innerText()).trim());
  await start.click();
  await answerRun(page, 8);
  await page.waitForURL(/\/result\/run-/);
  await page.waitForTimeout(500);
  const after3 = await dump(page);
  const newRuns = withPrefix(after3, "run:").filter(([k]) => k !== "run:old-run");
  const cyc = after3["cycle:strip-disguise"];
  check("new: a solo run completes and saves beside the old run", newRuns.length === 1 && newRuns[0]![1].run.status === "completed" && same(after3["run:old-run"], before["run:old-run"]));
  check("new: the old proof cycle keeps its time zone and old history", cyc.timeZone === "Africa/Lagos" && cyc.history.some((h: any) => h.runId === "old-run"), `state ${cyc.state}, ${cyc.entries.length} entries, ${cyc.history.length} history`);

  // reload and offline reopen keep everything
  await ctx.setOffline(true);
  await page.goto("/");
  await page.getByRole("heading", { name: "Tether" }).waitFor();
  await page.goto("/settings");
  await page.getByText("Coach style").waitFor();
  const off = await page.locator("body").innerText();
  const sounds = page.getByRole("checkbox", { name: "Sounds" }).or(page.getByRole("switch", { name: "Sounds" }));
  check("new: offline reopen works; Settings shows the nickname and Sounds on", (await page.locator("body").textContent())!.includes("Amaka") && (await sounds.first().isChecked()), off.replace(/\s+/g, " ").slice(0, 120));
  await ctx.setOffline(false);
  check("new: no page errors or console errors", newErrors.length === 0, newErrors.slice(0, 3).join(" | "));
  check("old: no page errors or console errors", oldErrors.length === 0, oldErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("script completed", false, String((e as Error).stack ?? e).split("\n").slice(0, 4).join(" | "));
} finally {
  await ctx?.close().catch(() => {});
  if (server) await stop(server);
  if (!process.env.KEEP && !process.env.COMPAT_DIR) {
    try {
      sh("git", ["worktree", "remove", "--force", join(WORK, "old-app")], REPO);
    } catch {}
    rmSync(WORK, { recursive: true, force: true });
  }
}
const failed = results.filter((r) => !r.ok);
console.log(`\ncompat: ${results.length - failed.length}/${results.length} passed against ${REF}`);
process.exit(failed.length ? 1 : 0);
