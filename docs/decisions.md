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
- For step 16: an update install fails unless the new cache holds every file (the old worker and cache keep serving, no "Update ready"); activate keeps the old cache unless the current one is complete. Only the first install may be partial.

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

## Local sounds and avatars (roadmap step 10a)

- Packages, pinned exact: `cuelume` 0.2.8 and `blobatar` 2.7.0, both MIT, no dependencies, bundled. Notices are in `THIRD_PARTY_NOTICES.md` at the repo root (the font keeps `src/styles/fonts/OFL.txt`). Blobatar is used through its framework-neutral `blobatar/blob` renderer (SVG string, rendered in-process; no `blobatar.dev` endpoint, no Preact adapter package). Cuelume is driven only through `play`, `setEnabled`, `setVolume` and `unlock`; `bind()` is never called, so typing and hover can never sound. Gzipped first-load JS went from 28.7 KB to 40.8 KB.
- Sound boundary: `src/platform/sound.ts`, outside `src/rules`. `cue(name)` is the only way to ask for a sound and is a no-op unless sounds are on, the tab is visible, nothing is being read aloud (`speechSynthesis.speaking/pending`) and no proof run is active. `setProofMode(true)` silences everything including `celebrate`. Steps 11-13: call `setProofMode(true)` when a solo/recheck starts and `false` when it ends, then call `cue("celebrate")` from the action that saved the result. Cues requested in the same tick (a button tap and a round celebration) play as the largest one, and a pending cue re-checks the gates when it plays, so mute applies at once. The volume is fixed at 0.2. Tests can define `window.__soundLog = []` to count the cues played; the app never defines it.
- Cues: tile choice `select`, deliberate buttons `tap` (Check and Retry are `silent`), a saved answer `correct` or `tryAgain`, the round summary `celebrate`, turning Sounds on `toggle`. Outcome cues run in the save's success callback, so a failed save plays nothing and Retry plays once. A save that lands after the learner left the question plays nothing, and a restored question is silent.
- Storage: `Learner.sounds`, `avatarSeed` (96 random bits as hex, never derived from anything) and `avatarGen` (2, the Blobatar major) are optional, so old records stay valid and `SCHEMA_VERSION` stays 1. `ProgressStore.backfill()` runs once on open before any screen can save; every learner save also fills missing fields from the saved record or a per-store seed, so a failed backfill or onboarding retry reuses one seed and a stale learner copy never loses the avatar. Unsupported generation or a render error shows initials.
- Settings keeps only the identity row and the Sounds checkbox (native, keyboard operable). The checkbox follows the saved value: it changes only after the save lands, Retry repeats the change, and turning off mutes at once (restored if the save fails). There is no nickname editor yet; step 14 adds it and must keep `avatarSeed`.
- Offline: `e2e/sounds.spec.ts` blocks every non-localhost request and checks the toggle, avatar and a saved answer. That proves local assets only; the installed offline journey stays in step 16.

## Solo checks and rechecks (roadmap step 11)

- One runner serves `/run/solo` and `/run/recheck` (`src/ui/runs/Run.tsx`, Gate-wrapped, no shell). `/solo` is gone; Solo entry and the practice solo-ready card go to `/run/solo`. On entry it calls `recoverRun` first: an active saved run resumes (the route follows the saved run's kind), times out or converts, before a new run is planned (`plan.ts`). A recheck is allowed only when `recheckAvailable` says so (due, overdue, or recovery while Fading); otherwise "No recheck is due". The runner uses only `Date.now()` and ignores `?demo`.
- A run starts only after its first save lands. Every answer is saved before the screen advances. The finished run is saved with `completeRunBatch`; only then `setProofMode(false)`, `cue("celebrate")` on a pass, and navigation to `/result/<runId>`. A failed save keeps the screen with Retry and never claims it was saved.
- A 2 s heartbeat (and hiding the page) saves `lastSeenAt`, so a reload within ten seconds resumes and a longer gap converts. Under ten seconds hidden shows the Welcome back toast; ten seconds or more, or a clock that went back, converts with an explanation (`convertBatch`, shared with `recoverRun`). Practising the unanswered questions goes to ordinary `/practice`.
- The last 20 seconds show a warning icon, words and a polite status line. Wake lock is `src/platform/wakeLock.ts`; refusal shows "Keep this screen open." and never blocks.

## Rechecks and recovery around the runner (roadmap step 13)

- Due, overdue, Held/Fading and recovery dates reuse `dueEntries`, `proofStatus`, `recheckAvailable` and `applyRun`. Step 13 added only `homeAction` (Home's primary-action order, spec section 10) and `atCivilDate` (an instant on a civil date in a zone, for simulation and tests).
- Home gets a `ProofCard` (stamp with Due badge, neutral due/overdue/Fading/Held copy, one action). With nothing due it shows no action, so the existing Practice link stays the practice entry. The card's resume button reads "Continue where you stopped". Fading offers Practise to recover plus Try anyway. Both recheck links go via `/recheck-entry`, which links to `/run/recheck`. The full map is step 14.
- Simulated dates live only in the URL (`?demo=YYYY-MM-DD`; `?demo` alone shows the date control). They are never stored, and every screen that shows one says "Simulated date ... Demo only; your saved progress is not changed." `appNow(timeZone)` in `src/ui/proof/simulate.ts` is the clock for due checks on Home and the entry screen; the runner must keep using the real clock for what it saves.

## Results (step 12)
- `/result/:runId` (Gate, no AppShell, no Bo, no sound) reads the saved run from `progress.runs` and never saves it. Unknown or unfinished runs show "Result not found" with a way Home. Pure logic is `src/ui/results/view.ts`; the comparison is the saved run's own, using only snapshots up to that run, so an old result never shows a later comparison.
- "See your misses" (spec section 7: review changes neither the practice window, dots nor the saved result) plays Show me as a free look. Each look is saved with the guarded save as an attempt `<runId>:look:<questionId>`, origin "converted", `freeLook: true`, never completed: measured (section 15), never scored, never a round or resume point.
- Try anyway goes to `/solo-entry` (solo) or `/run/recheck` (recheck); Practise again goes to `/practice`. `ResultView.shares` lists the shares spec section 11 allows (step 15).
- Demo dates (`?demo=DATE`) are a read-only preview: Home and the recheck entry show the simulated state, but every action that starts a run is a disabled "(demo preview)" button, and nothing links to `/run/...` with a demo date, so a simulated day cannot change saved progress.

## Home and Settings (roadmap step 14)

- Spec wins over Figma: navigation stays Home and Settings (no Practice/Proof rail items, no profile switcher, no Export/restore, no "What a JAMB score opens" row). Settings holds only nickname, Coach style (Character/Text only), Language, Read-aloud, Sounds and the optional partner. Phone and tablet have no rail, so Home's header carries a visible Settings link; from 1280 px the rail's link replaces it.
- Home's map art is generated from `design/map/map-svg.js` with nodes, Bo and labels removed (`src/assets/map/day.svg`, `night.svg`; Naija Green day and Adire Night). The HTML node list works without it; the art loads after Home mounts, one theme file only, so it never loads before the first lesson. Move 1 links to practice; moves 2 to 5 and exam day are plain "Coming soon" text, not controls.
- Move 1 shows Current until a solo pass earns proof, then Proved, Held or Fading, with Due as a second badge. The single primary action is ProofCard's (`homeAction`); when it is plain practice the card shows "Practise Move 1". Solo check is a separate always-visible link. The empty `.hm-status` block is reserved for step 16's Ready offline line.
- Dates read "16 Oct 2026" through `src/ui/results/dates.ts`, shared with the result page.
- Settings changes share one save-first path: the saved value decides what shows, controls disable while saving, and Retry repeats the failed change. Nickname edits keep `avatarSeed`. Read-aloud is saved but its automatic playback is not wired yet; manual playback is unchanged.

## Sharing (step 15)
- `ResultView.shares` replaces `share`: `["proof"]`, `["progress"]`, both (an improved pass), or none. Nothing is offered from a Fading result, which includes every failed recheck, even when an old gap improved.
- `/share/:runId?kind=proof|progress` (Gate, no shell, no Bo) draws the card with Canvas 2D into a PNG (`src/ui/share/draw.ts`), reading colour tokens from a `.pin-light` element so the card is light in dark mode. Gold is proof, green is improvement; a progress card has no stamp. The text is the pure model in `card.ts`, and the preview shows the actual PNG.
- A gap shows only when the saved solo has both practice and alone scores. A recheck card shows today's five-question score plus the latest earlier solo with its own date and gap, never one combined score.
- Phone: `navigator.share({files, text})` only when `canShare({files})` and the viewport is under 1280 px; otherwise Download card and Copy text. Laptop (1280 px and up) never shows a share button. AbortError is silent; other failures say to download or copy instead. The offline note appears from `navigator.onLine`.
- Message starts as plain text and is editable; the "Ask <partner> how it went" line is on the card, and a neutral line replaces it with no partner.
- Not built: the Figma header back arrow and "Next check" line on the card; "Back to result" replaces the arrow.

## Step 17 (device and accessibility; ticked)
- Verified by `e2e/a11y.spec.ts`: axe (wcag2a, wcag2aa, wcag21aa) with no violations on onboarding, lesson, practice question, Show me, honesty reasons, solo run and result, at 360 and 1366, in light and dark; no horizontal overflow at 360, 768 and 1366 including a 200% root font size with Check still reachable; target size 48 px, text 12 px and input 16 px on onboarding, lesson, practice, honesty and solo; radio-group keys (1-4, arrows, Enter); shortcuts ignored in inputs; no running animations under reduced motion; no `speechSynthesis` leaves text controls usable.
- Fixed: the covered phrase in the lesson/Show me sentence was dimmed with `opacity: .35` and failed contrast (now `--text-secondary`); closing the "The move" sheet now returns focus to its opener (the opener is disabled while the open is saved, so the browser lost it); with no speech the question and run screens say "Read aloud isn't available on this device"; a global `:focus-visible` ring is the fallback for any control without its own.
- Show me closing deliberately focuses the first answer choice ("Put it in yourself"), not its opener.
- Second pass (after steps 14-16): `e2e/a11y.spec.ts` now also covers Home (new, held and due, fading with a gap), Settings, the share preview, the offline/install cues (ready, and partial with Retry) and Add to calendar on the result, at 360 and 1366, light and dark. Axe found no violations on any of them. Also checked on those screens: 48 px targets and 12 px text (a radio or checkbox counts as its whole label row), no horizontal scroll at 360, 768 and 1366 including a 200% root font size, a visible focus ring on every tab stop, tab order following the document with no positive tabindex, reduced motion.
- Home map: Move 1 is the only link; the five Coming soon nodes are plain `div`s with no role, tabindex or control inside, and tabbing never lands on them; disc numbers and icons are `aria-hidden`; the art is a CSS background, not an element.
- Polish: Settings' bare "Home" link is now a styled back link at the top (hidden from 1280 px, where the rail has Home), so phone and tablet keep a way back. Home names the move again ("JAMB English concord. Move 1: Strip the Disguise.") above the proof card. Read-aloud: `useCanSpeak()` treats the API alone as enough until `voiceschanged` or a 1.5 s wait; if `getVoices()` is still empty it shows the same "Read aloud isn't available on this device." label as the missing-API case.
- Race fixed: the solo run's shortcut listener was attached in a post-paint effect, so "question visible" did not imply "R works" (failed once in a full run). It is now a layout effect.
- Verified in the build: first-load JS is 57.7 kB gzipped (index chunk 178.8 kB raw; the day and night map chunks are 0.05 kB, the art SVGs load lazily).
- Still needs real devices: VoiceOver and TalkBack passes over Home, the map, practice and results; a real PWA install (Android Chrome prompt, iOS Add to Home Screen) and an offline launch from the installed app; real voices, including a device with no voices and a Pidgin/en-NG voice; physical large-text and display-zoom settings; a physical-keyboard run on a laptop.

## Read-aloud speaks coach lines (fix)
- `learner.readAloud` was saved but nothing used it. `CoachBubble` now calls `useAutoSpeak`: with read-aloud on, speech usable (`useCanSpeak`) and the tab visible, each new coach line is spoken once in `learner.lang` through `speak()` (Pidgin follows the existing pcm, then en-NG, fallback). The last spoken text stops repeats on re-render; turning read-aloud off and on again allows the line once more.
- A bubble that spoke cancels speech when it unmounts, so a route change never leaves a line talking over the next screen. Off (the default), no speech API or a hidden tab: silent. Exam sentences are never auto-read; the manual R / Read aloud control is unchanged and works with read-aloud off.
- Coach bubbles never render in proof runs, results or share, so nothing speaks there (`e2e/readaloud.spec.ts`, solo case).

## Read-aloud: fallback note, Show me captions, hidden bubbles (fix)
- `CoachBubble` shows the voice note (`useVoiceNote`) in small secondary text under its line whenever read-aloud is on and Pidgin would be read by an English voice, so automatic speech is labelled like the move sheet's button.
- Show me speaks each beat's caption (the teaching instruction) once as the beat appears, in normal and reduced motion, inline and dialog; Replay speaks beat 1 again. Closing it cancels speech. Same gates as the bubble: read-aloud on, `useCanSpeak()`, tab visible.
- `useAutoSpeak` never speaks a bubble that is not rendered (closed `<dialog>` or `display:none`, via `closest("dialog:not([open])")` and `checkVisibility()`). An IntersectionObserver re-runs it when the bubble appears, so the move sheet's line speaks when the sheet opens; closing the sheet cancels it.

## Online AI explanations (step 9a)
- Provider: OpenRouter (OpenAI-compatible `POST https://openrouter.ai/api/v1/chat/completions`) through plain `fetch` in `functions/api/explain.ts`; no SDK. The browser bundle also uses plain `fetch`. Headers: `Authorization: Bearer`, `HTTP-Referer` (request origin), `X-Title: Tether`. Text comes from `choices[0].message.content` (`parseCompletion`); any `finish_reason` other than `stop`, or empty text, is `invalid`.
- Model: `AI_MODEL` env var, default `google/gemini-3.5-flash-lite` (newest non-preview Gemini Flash Lite on OpenRouter). `max_tokens` 220, `temperature` 0.4, 15 s timeout (`AbortController`), no retries. Set `AI_MODEL` to switch; prices per token (prompt / completion) from `https://openrouter.ai/api/v1/models`, checked 2026-10-14:
  - `google/gemini-3.5-flash-lite` $0.0000003 / $0.0000025 (default; $0.30 / $2.50 per M tokens)
  - `google/gemini-3.1-flash-lite` $0.00000025 / $0.0000015 (older, cheaper)
  - `google/gemini-3.5-flash` $0.0000015 / $0.000009 (matching Flash)
  - `inclusionai/ling-3.1-flash` $0.000000075 / $0.000000225 (Ling flash, cheapest; the owner said "Link")
- Contract: the body is exactly `{ moveId, contentVersion, style }`; the server loads the approved pack itself (`server/explain-core.ts`) and sends only the reviewed rule text. No question sentence, options, answer, nickname or progress reach the provider. Nothing is logged.
- Output check: plain text, at most 3 sentences and 90 words, no option verb used as an instruction (use/pick/choose... followed by any pack verb), and none of "the answer is", "choose", "correct option" and similar. A rejected reply returns `{ ok: false, reason: "invalid" }` and the app shows the reviewed explanation labelled "The move". Replies are `{ ok: true, text }` or `{ ok: false, reason }` with a generic reason only.
- Rate limit: Pages Functions do not support the Workers Rate Limiting binding (Cloudflare's Pages bindings list has no `ratelimit`). The function keeps a sliding window of 10 requests per minute per `cf-connecting-ip` in isolate memory. Limits: counters are per isolate, so they reset on a cold start and are not shared across locations or instances; a determined client can exceed 10 per minute overall. It stops accidental loops and button-mashing; the hard cap is the credit limit on the OpenRouter key below. Upgrade path: move to a Worker with the Rate Limiting binding or a Durable Object counter.
- Spending limit: the owner sets a credit limit on the OpenRouter key (openrouter.ai, Settings, Keys). That, not the in-memory limiter, bounds cost.
- Secrets: `OPENROUTER_API_KEY` lives in the gitignored `.dev.vars` locally (`.dev.vars.example` has placeholders) and in a Cloudflare Pages secret when deployed. It is never in the bundle, logs or responses.
- Local run: `npm run build`, then `npx wrangler@4.150.0 pages dev dist` serves the app and the function (wrangler is not a dependency).
- Client: `StillStuck` (Go deeper only) saves `help("ai")` when an accepted reply arrives, and shows the text once that save has landed (once per question). The save uses the attempt as it is at that moment (kept in a ref), so a late reply cannot undo what the learner did meanwhile, such as opening The move. Cancel disappears once a reply is accepted, since help is then being recorded; a body that stalls past 15 s ends as a timeout; failed, cancelled or offline requests record nothing on the attempt. Local usage status (`meta:aiUses`: time and result only) is kept like calendar uses. The request aborts on unmount, so a late reply cannot reach another question or a proof run. The service worker only handles GETs, so `/api/explain` is always network-only.
- Review: `node tools/ai-sample.ts` writes 20 outputs (10 plain, 10 analogy) to `docs/ai-review.md` with the checker's verdict and a blank column for the human reviewer. It needs the owner's key in `.dev.vars`.
- Known limitation: a question bank built with an older content version is rejected by the explain function (`contentVersion` must equal the approved pack's), so AI help falls back to The move for stale stored questions. No code change before submission.
- Output check also rejects `correct verb`, `verb should/must be` and `is/are/was/were/has/have correct`, and does not count `Mr.`, `Mrs.`, `Dr.`, `e.g.`, `i.e.` as sentence ends.
- Session log (`meta:sessions`): writes are applied in order and the list is capped at 500; time before the page loaded never counts as active time.


## 2026-10-14 - English destination preview (step 17a)

- Routes: `/course` (overview), `/course/:section`, `/course/:section/:topic`, inside the app shell and the onboarding gate. Only Lexis and Structure and Concord are reachable; Coming soon sections and topics are plain text, and their URLs show Page not found.
- `src/content/catalogue.ts` (version 1) holds stable IDs for English, three sections and their topics. Section counts (A 25, B 25, C 10) and category counts (comprehension 5, summary 5, cloze 10, reading text 5; sentence interpretation 5, antonyms 5, synonyms 5; oral forms 2 each) come from JAMB's IBASS syllabus. Concord is a separate topic with no question count, so it never inherits Basic grammar's 10. Stage counts are computed (`1 stage available · more Coming soon`) and are Tether units, not exam weights.
- Source: https://ibass.jamb.gov.ng/static/media/Use-of-English.885e843b1f51e6a3d062.pdf, read 2026-10-14, SHA-256 `f2b6bc4f2c30fc19ecf57bc14778100ce0deca59445beff9f7e10f34cbf7da18` (matches the checksum in Move 1's source). The PDF prints no exam year; the file is dated July 2025.
- The topic view reuses `ProofCard` (Practise/Continue, recheck, recovery) and the Solo check link. It writes nothing; a test compares saved runs and cycles before and after browsing.
- Home's map is now bounded: three nodes per page with Previous/Next, art cropped to fit, and a List view (`details`) with every node. With one available stage there is no paging on the course views; add Previous/Next there when a list outgrows a screen.

## 2026-10-14 - Subject-first onboarding (step 22)

- Flow: Welcome, Pick your subjects, Nickname, Your English course, then the unchanged lesson, tutorial, first win and preferences. No diagnostic, profile or eligibility advice.
- `src/content/subjects.ts` lists the 24 non-English subjects named by the owner (the brief said 23; the names given number 24, so all are kept). They are marked Coming soon; English is fixed. Up to 3 others may be picked. Source line: "Subjects from JAMB's IBASS e-syllabus"; it is a preference only.
- `Learner.subjects?: string[]` (`["english", ...extras]`). Absent means `["english"]`: no schema bump, no migration, older learners never repeat onboarding.
- Subjects are held in memory until the nickname is saved (the learner record does not exist before that), so a reload at the subjects step returns to Welcome. A learner with saved subjects and no finished lesson resumes at the course map; one without subjects resumes the lesson.
- Settings has a Subjects group that saves each change at once with Retry, through the existing `change()` path.
