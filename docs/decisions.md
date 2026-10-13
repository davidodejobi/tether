# Agreed MVP decisions

These decisions override conflicting text in `requirements.txt`.

- Scope: JAMB English concord, Move 1 only; other moves are Coming soon.
  Ship learn → practise → help → solo → gap → optional sharing → recheck,
  with local progress, offline installation, Settings and usable phone/tablet/laptop layouts.
- Learn-first onboarding: three tutorial questions earn no scores or dots.
  Remove diagnostic; defer profiles, export/restore, AI help, Coach Auto and Proof history.
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

- Stack: Preact, TypeScript and Vite, with `preact-iso` routing. Client-side only; no backend or runtime AI (spec section 2). The first-load JS budget is 100 KB gzipped; the foundation is about 8 KB.
- Hosting: Cloudflare Pages serving the static `dist/` build over HTTPS. Deployment happens in step 19.
- Boundaries under `src/`: `content/` (reviewed content), `rules/` (pure learning rules; take a `Clock`), `storage/` (local persistence), `platform/` (browser capabilities and fallbacks), `ui/` (screens and components).
- Added later, when the step needs it: `idb-keyval` (step 5), local font and tokens (step 6), `vite-plugin-pwa` (step 16).
- Tests: Vitest for rules and content (`npm test`); Playwright at 360x800 for browser journeys against the preview build (`npm run test:e2e`).
