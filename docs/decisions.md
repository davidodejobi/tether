# Agreed MVP decisions

These decisions override conflicting text in `requirements.txt`.

- Scope: JAMB English concord, Move 1 only; other moves are Coming soon.
  Ship learn → practise → help → solo → gap → optional sharing → recheck,
  with local progress, offline installation, Settings and usable phone/tablet/laptop layouts.
- Learn-first onboarding: three tutorial questions earn no scores or dots.
  Remove diagnostic; defer profiles, export/restore, Coach Auto and Proof history.
- AI explanation is required in the MVP: an online Still stuck? action in practice
  rewords reviewed Move 1 teaching content. It counts as help, never grades or
  chooses answers, and is absent in proof runs. The core loop remains offline.
- Practice rounds: five questions. “With help” counts first/second-attempt
  correct answers before reveal, out of the latest ten completed practice questions.
  Explain that hints were available; a free look after a correct answer preserves its score.
- “Alone”: ten-question solo, 8/10 earns Proved. Accessible from Home and round
  summaries. Three dots recommend readiness, never gate entry or recovery.
  Timers: ten minutes solo, five minutes recheck; unanswered questions count as wrong.
  Away under ten seconds keeps the timer running; ten seconds or more converts to practice.
- Honest guesses and free looks preserve dots. Verify move claims randomly one
  in three. Misses and learner-requested help reset dots. Introduce the honesty
  rule when regular practice begins.
- Gap requires ten practice questions and solo. Save score snapshots per checkpoint;
  display max(0, practice − solo). First result has no change claim. Celebrate a
  shrinking gap only when the solo score hasn’t fallen.
- Rechecks: 4/5 on days 3/7/14 from earning proof. Ordinary solo retries keep dates.
  One late check covers overdue checks; future dates stay fixed and lateness never fades proof.
  A miss makes proof Fading and pauses scheduling. Successful recovery restores
  Held and restarts the schedule; retain history. Due is an additional reminder.
- Sharing is learner-initiated, wins or qualifying improvements only. Bo is absent
  in solo, rechecks, results and sharing. Home and Settings are the MVP navigation.
- Use Day/Night themes: green/mint actions and dots, gold proof; distinguish gap
  from wrong-answer colour. Character coach default, Text only available. English
  default; Pidgin labelled Unreviewed until checked; French stays future scope.
  Lessons advance with Next; Show me supports pause/replay and reduced motion.
- Validate every Move 1 combination, including sentence sense, answer keys and
  option uniqueness. Verify published syllabus references and opportunity figures.
  Include the opportunity card only after verification. Label simulated recheck
  dates as demo data; actual retention evidence requires elapsed days.

## Technical foundation (roadmap step 2)

- Stack: Preact, TypeScript and Vite, with `preact-iso` routing. Learning and grading run client-side; online AI explanations use a separate server-side endpoint (spec section 5a). The first-load JS budget is 100 KB gzipped; the foundation is about 8 KB.
- Hosting: Cloudflare Pages serves `dist/` over HTTPS, with a Pages Function for AI explanations. Deployment happens in step 19; live AI integration is built in step 9a.
- Boundaries under `src/`: `content/` (reviewed content), `rules/` (pure learning rules; take a `Clock`), `storage/` (local persistence), `platform/` (browser capabilities and fallbacks), `ui/` (screens and components).
- Added later, when the step needs it: `idb-keyval` (step 5), local font and tokens (step 6), `vite-plugin-pwa` (step 16).
- Tests: Vitest for rules and content (`npm test`); Playwright at 360x800 for browser journeys against the preview build (`npm run test:e2e`).

## Move 1 content (roadmap step 3)

- Syllabus source verified on 13 Oct 2026 from JAMB's own PDF (IBASS portal): Use of English, Section B Lexis and Structure, item (e) "...number, agreement/concord...". Details and hash in `src/content/strip-disguise.ts` and `docs/content/move-1-review.md`. The syllabus names the topic, not the "as well as" rule, so learner-facing lines name the topic only.
- Questions pair a subject with an opposite-number side phrase, or with a same-number side phrase marked `sameNumber`. Options: singular form, plural form and two never-correct fillers. 1,560 questions; three reserved for the tutorial.
- Proof runs have fixed counts so "pick the verb that disagrees with the side phrase" cannot pass: solo 5 + 5 with four same-number items (shortcut scores 6/10), rechecks 3 + 2 or 2 + 3 with two (3/5). Practice is about 40% same-number. See `SOLO_SHAPE` and `RECHECK_SHAPES`.
- Content changes bump the pack `version`; stored questions keep the version they were built with.
- `validatePack` separates structural errors from release blockers. English v2 was approved by David on 13 October 2026; the pack has no release blockers. Pidgin stays labelled Unreviewed until a named native speaker approves it.

## Learning rules (roadmap step 4)

- `src/rules/` holds pure functions over plain records; callers pass the time, the time zone and randomness. Modules: `practice.ts` (attempts, with-help score, dots, verification, move hint), `runs.ts` (solo/recheck deadlines, submissions, absences, conversion), `gap.ts` (snapshots and comparisons), `proof.ts` (stamps, day-3/7/14 schedule, recovery).
- Dots are derived from the attempt timeline plus run start times, so an unfinished question with a miss still resets them.
- An unknown absence on reopen is passed as `null` and converts the run.
- Owner decision (13 Oct 2026): a gap counts as improved only when it shrinks and alone rises. A gap that shrinks because practice fell, with alone flat or lower, gets neutral copy and no improvement sharing. Spec §8 updated.
- For step 5: store attempts and runs keyed by ID. `practiceScore` and `readiness` assume each attempt appears once, so keyed storage is what keeps a duplicate save from inflating scores.
- For step 11: save `lastSeenAt` on `visibilitychange` (hidden), on `pagehide` and on a short heartbeat. `onReturn` judges a reopen from it, so a stale value would convert a run that should resume.
- Learning events are `Moment`s: wall-clock time plus a sequence number (`src/rules/moment.ts`). Step 5 must persist the last moment and create every new one with `nextMoment`, so the sequence never repeats, even across reloads or a changed device clock.

## Local progress (roadmap step 5)

- One IndexedDB database (`tether`) with one object store (`records`). Keys: `learner`, `attempt:<id>`, `run:<id>`, `cycle:<moveId>`, `meta:schema`, `meta:lastMoment`. Never rename a prefix; add a migration in `ProgressStore.open` when `SCHEMA_VERSION` rises.
- Each batch is one transaction. Memory updates only after it commits; on failure the screen stays put and offers retry with the same batch.
- Attempts and runs are saved with the exact question shown (shuffled options, content version), so a reload or content update never changes an active question or run.
- Interrupted runs: judge with `recoverRun` before marking the run seen, then save its batch once. Converted answers keep deterministic IDs and proof applies once per run ID.
- If IndexedDB is missing or fails its probe, progress lives in memory and `durable` is false; step 7 must say progress is temporary before learning starts. If the probe only times out, `openProgress` throws `timedOut`: show "Couldn't open your saved progress" with Retry, and use memory only if the learner chooses to continue.
- One save at a time: wait for each save before advancing and build no newer batch until a failed one has been retried successfully (`save` refuses with `busy` while one is in flight).
- Review fix: the question screen changes phase only after `save()` resolves (`commit` in `QuestionView`). While a save runs or a failed one waits for Retry, tiles, Check, reasons, verification taps, Next, Show me, free look, The move and the language toggle are disabled; Close stays enabled. A failed save keeps the current screen, shows the existing Retry for the same batch and never claims it was saved. Slots that follow a save (`help`, `update`) take a `then` that runs after it lands, also after a Retry. The honesty-intro flag goes through the same guard. Onboarding already awaited its saves before moving on.
- Each storage open probes its own key, so tabs opening together never see each other's probe and fall back to memory.
- A page keeps its writer claim: Retry after a timeout reuses it instead of queueing behind its own lock. A refused claim is retried.
- A reloading page waits up to 1.5 s for the writer lock released by the page it replaces. Checked in Chromium (reload regains the lock; a second tab cannot take it); WebKit is untested.
- Private or incognito windows pass the storage probe but are cleared when closed, so copy must say progress is saved "on this device", never more.
- Data from a newer app version, or a second tab without the writer lock, opens read-only. Without the Web Locks API every tab may write (a known gap on browsers lacking it).
- Call `requestPersistentStorage` after the nickname is saved, not on load.
- For step 16: WebKit can clear script-written storage after seven days without a visit unless the app is installed, which puts the day-14 recheck at risk on iOS Safari. Check whether persistent storage exempts it, and say so in the install guidance.

## Design foundation (roadmap step 6)

- Tokens live in `tools/tokens/` (`tokens.py` is the source and runs the WCAG contrast check, `gen_css.py` writes `src/styles/tokens.css`). Run `npm run tokens`; never edit the generated CSS. Light = Naija Green, Dark = Adire Night; the OS setting decides unless `data-theme="light|dark"` is set on `<html>` or any element. `.pin-light` keeps proof cards light.
- Gap colour fix (review-4): gap was the same colour as wrong red (1.00:1 apart). The gap ramp is now orange (seed `#F07A1A`, hue about 52 against red's 27): Light `#AB5200` (text `#894101`), Dark `#FEAA76` (text `#FED0B4`). Luminance contrast to red stays near 1.0 by design, so the generator now also fails if gap and wrong hues are under 20 degrees apart, and gap is never shown without a word or icon. Contrast check: 0 FAIL in both themes.
- Font: Atkinson Hyperlegible Next, variable woff2 (latin plus latin-ext, from Fontsource), in `src/styles/fonts/` with its SIL OFL licence (`OFL.txt`). No runtime font fetch.
- Icons are drawn as CSS masks so they follow `currentColor`. Bo art keeps its own colours.
- Stamp states follow spec.md section 9: none, proved, held, fading, plus a Due badge. Figma's "Reopened" stamp and gold Button variant are not built. Readiness label reads "Readiness n/3" instead of Figma's "Solo-ready".
- Readiness dots are green (spec.md section 14), not Figma's gold: gold means proof, and dots only recommend readiness. Figma's SoloDots were changed to green to match.
- `E2E_PORT` and `SCREENS_PORT` override the test server ports so parallel worktrees never reuse each other's server.
- `/kit` shows every component in light and dark and exists only under `vite dev` (guarded by `import.meta.env.DEV` plus a dynamic import); the production build contains no kit code.
- `npm run screens` runs `playwright.screens.config.ts` against the Vite dev server on port 5174. It visits each `{name, path}` in `e2e-screens/screens.ts` at 360x800 in light, dark and reduced motion and writes `screenshots/` (gitignored). Add each new screen to that list.

## Onboarding and the lesson (roadmap step 7)

- Startup gate (`src/ui/onboarding/Gate.tsx`) wraps Home and Settings, not the dev-only kit. It shows, in order: opening, could not open (Retry; "Continue without saving" is the learner's explicit choice and opens `memoryKV`), read-only (another tab; newer schema), a temporary-progress notice when storage is not durable, then onboarding or the app.
- Resume derives from saved fields only: no learner → Welcome; `lessonDone` false → lesson; `lessonDone` true and not `onboarded` → tutorial questions. First win and Make Tether yours are reached from the questions in one visit, so no extra stored field exists. Reloading there repeats the tutorial questions, which earn nothing.
- Preferences are saved together with `onboarded` when the learner presses Done or either Skip; nothing is stored earlier.
- The lesson uses the pack's own `lessonExample` (Chidi), not Figma's Tunde sentence. Reduced motion renders static step cards revealed by Next.

## Practice round (roadmap step 8)

- `QuestionView` (`src/ui/practice/`) is the one question screen for practice and, later, the tutorial. Slots for steps 9 and 10, all documented at the top of the file: `afterMiss({attempt, misses, retry, help, finish})`, `hideTiles(attempt, misses)`, `onShowMe({attempt, help})`, `afterCorrect({attempt, next})`. Every checked answer is saved before a slot runs; `help(kind)` goes through `useHelp` and saves.
- A started question is saved at once (checks 0), so a reload or the close button brings back the same question through `resumePoint`. `SavedAttempt` gained optional `struck` (options checked wrong) so struck tiles survive a reload; old records stay valid.
- Rounds are derived, not stored: position is completed practice questions modulo 5 (`src/rules/round.ts`). The summary is in-memory, so a reload on it opens a fresh question; nothing is blocked.
- Practice ignores a pending How did you know or verification (`resumePoint` kinds "reason" and "verify") until step 10 handles them.
- The move sheet is a native modal `<dialog>`: it blocks input underneath, traps focus and returns it on close.

## Help ladder (roadmap step 9)

- `HelpedQuestion` (`src/ui/help/`) wraps `QuestionView` and fills its slots; practice and the tutorial both render it. `QuestionView` changed in one line: the `afterMiss` slot also renders once help was used with no miss yet (only when a caller supplies `afterMiss`), so "Now put it in yourself" shows after an early Show me.
- Tiles are hidden from the third miss until Show me or Go deeper has recorded help. Go deeper records `help("goDeeper")` only when the learner finishes the verb step and presses Back to the question, so hiding cannot lift early; a reload mid-way restarts Go deeper.
- Show me records `help("showMe")` when opened (a second open in the same question does not record again) and plays in a modal dialog. With normal motion the beats play on a 2.6 s timer with Pause/Play and Replay; with reduced motion nothing advances by itself and beats are static cards revealed by Next. `ShowMe` takes `doneLabel` and `note` so step 10 can reuse it for free looks. After a correct answer the S key and button do nothing here; step 10 owns free looks.
- After help, a further miss shows "Not quite. Pick again" with Try again instead of a nudge; the nudge appears only on the first and second miss with no help.
- The tutorial e2e helper (`e2e/tutorial.ts`) now opens Show me on each question first, so tiles are never hidden.
- Step 9a plugs into `src/ui/help/StillStuck.tsx` (renders nothing now), placed at the bottom of Go deeper.

## Honesty and readiness (roadmap step 10)

- Honesty-rule intro: one optional boolean on the learner record, `honestyIntroSeen`. It is saved the moment the intro is first shown (inside the first How did you know), so a reload mid-prompt never repeats it. Optional, so old records stay valid and no migration is needed. Tutorials never ask a reason, so they never show it.
- `QuestionView`'s `afterCorrect` context gained `update(attempt)`, `help(kind)` and `openMove()` so the honesty step edits the one attempt the question view owns and saves; otherwise a later save from the view (a free look, the move sheet) would overwrite the reason with an older copy.
- A pending How did you know or verification resumes through `begin()` in Practice: the already-scored question reopens in `QuestionView`, which shows the prompt for a completed attempt.
- Solo entry is `/solo-entry` (ready card at three dots; "not solo-ready yet" with Try anyway otherwise). Start or Try anyway go to `/solo`, a placeholder until step 11. The Solo-ready card also appears once, right after the answer that earns the third dot; "Keep practising" carries on. No Bo on the entry, since spec section 7 keeps Bo out of solo.
- The free-look Show me is a placeholder (`ShowMeSlot`) recorded as `help("showMe")` when chosen, until step 9's playback replaces it.

## Integration notes (steps 7–10)

- Show me plays its three beats on a 2.6 s timer with Pause/Play and Replay; reduced motion uses static beats revealed by Next. Reading: spec §14's "no auto-advancing" covers lesson beats; §5 asks Show me for pause and replay, which only make sense if it plays.
- Free looks after a correct answer play the same `ShowMe` with the note "Free look: nothing lost"; `help("showMe")` is recorded when chosen, so `freeLook` is set and nothing is penalised.
- New Pidgin line in Go deeper ("Na no be the subject…") is shown under the Unreviewed tag until a native reviewer approves Pidgin.
- The startup gate now also covers `/practice`: with no learner it shows Welcome.

## Review fixes (wave 3)

- Read-aloud lives in one helper, `src/platform/speech.ts`. Exam sentences are always read with an English voice (en-NG first). Pidgin coach text looks for a `pcm` voice, then `en-NG`, then any English voice. Unless a `pcm` voice exists, the move sheet says "Read in a Nigerian English voice" or "Read in an English voice" beside Read it to me. It reads anyway; speech is never promised.
- The move sheet shows the pack's `lessonExample` (Chidi). It can never be the current sentence: `validatePack` fails if the lesson sentence repeats any question sentence. When the question uses the same verb as the example, the example's verb shows as ___, so a singular or plural form is never hinted.
- Text only means no Bo anywhere after the choice (practice, honesty, summary, First win); the quiet text coach card replaces her. The Unreviewed tag shows wherever Pidgin coach copy does.

## Layout shell and breakpoints (wave 4)

- Breakpoints follow spec section 14: phone below 768 px, tablet 768–1279 px, laptop 1280 px and up. The phone layout is untouched; every wider rule sits in a `min-width` query.
- `AppShell` (`src/ui/shell`) wraps Home, Practice and Settings for an onboarded learner. From 1280 px it adds a 240 px left rail (Tether, Home, Practice, Settings, learner card). Proof is left out until a Proof screen exists (spec section 10). `--shell-rail` holds the rail width (0 below 1280 px, 240 px from there); pages fill the rest of the row (`.shell-content` is `flex: 1; min-width: 0`).
- Tablet has no rail: Figma's tablet frames use a bottom bar with Proof, which the spec rules out, so tablet gets a wider, centred single column. Solo and onboarding never get the shell.
- Onboarding is a centred column from 768 px; Welcome and Learn the move go two-column at 1280 px.

## Tablet and laptop layouts for practice, help and honesty

- `QuestionView` is a grid from 768 px: one wider column on tablet (Bo beside the sentence card), and from 1280 px a centre column plus a right panel (Bo or the Text-only coach card, "Open The move any time", the Help ladder with the current rung highlighted, the move card once help is used). Only practice shows the panel; the tutorial keeps one column.
- Sizing never uses viewport widths: the grid is a fluid column plus a fixed 320 px panel (`--qv-panel`), so it fits with or without the shell's 240 px rail (`--shell-rail`) and never scrolls sideways.
- Show me plays inline from 768 px (`ShowMe` renders a section; `HelpedQuestion` passes it as `overlay` and sets `suspended` so the question ignores keys under it). On phone it stays a modal dialog. Inline keys: R replay, Enter next, Esc leave. Behaviour, saving and help marking are unchanged.
- The correct moment and reasons are a focus page: two columns with a large Bo on the right on laptop, no panel. Reasons are numbered 1-3 and keys 1-3 pick one, with equal weight (spec section 6).
- Figma differences resolved for the spec: the readiness label stays "Readiness n/3" (Figma says "Solo-ready"); the nudge text stays in the centre column (Figma puts it in the panel) so it sits beside Try again; the correct moment keeps the app header and the page colour (Figma's warm page has neither); copy "How did you know?" is kept over Figma's "How did you get that one?".
