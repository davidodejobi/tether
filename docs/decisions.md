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
- Open question for the owner: as written, §8 counts a shrinking gap as improvement when practice falls and alone stays the same (pinned by a test). Requiring alone to rise would stop a falling practice score reading as progress.
