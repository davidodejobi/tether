# Tether MVP roadmap

Work in order. Each step ends with its completion check; verify the change and
commit the completed unit before moving on. `spec.md` is the current build
contract. Bring supporting files into this repository only when needed.

- [x] **1. Finalise the build spec.** Combine requirements and agreed decisions
  into `docs/spec.md`. Define screen states, scoring, assessment interruption,
  incomplete runs, recovery, dates and release criteria. Map every requirement
  to a step below or an explicitly deferred feature.
  Done: one current spec with no conflicting behaviour or unexplained controls.
- [x] **2. Establish the technical foundation.** Confirm the lightweight browser
  stack and hosting target; define boundaries for app, content, learning logic,
  persistence and UI. Scaffold the app, routing, scripts, tests and preview build.
  Done: a minimal app runs locally and produces a deployable production build.
- [x] **3. Prepare and verify Move 1 content.** Verify the official syllabus
  section; write the reviewed word lists, templates, English/Pidgin coach copy,
  distractors and source metadata. Implement generation and content validation.
  Enumerate the finite question space; check keys, options, grammar and repetition.
  Done: validated content generates four shuffled options with one correct answer.
  Status: syllabus verified; v2 pack, generator and validator pass all checks.
  English signed off by David on 13 October 2026 (`docs/content/move-1-review.md`).
  Unknown number tags/rule IDs are rejected; 23 tests, typecheck and build pass.
  Pidgin remains visibly Unreviewed until native-speaker approval.
- [x] **4. Implement the learning rules.** Build attempt scoring, readiness dots,
  verification, score snapshots, gap calculation, stamp transitions and scheduling.
  Exercise free looks, early solo entry, declining practice scores and overdue dates.
  Done: focused logic tests demonstrate the agreed rules independently of the UI.
- [x] **5. Persist learner progress.** Store nickname, settings, attempts, runs,
  stamps and schedules locally. Define interrupted-run restoration, storage failure
  feedback and schema versioning; request persistent storage where available.
  Done: refresh/reopen preserves progress without duplicate answers or proof awards.
- [x] **6. Build the design foundation.** Bring in the needed tokens, font, Bo
  poses and icons; verify current Figma references when implementing the designs.
  Correct reviewed colour issues and build buttons, sentence/answer controls,
  dots, stamps and score displays with light/dark and reduced-motion support.
  Done: shared components are legible, accessible and usable at 360 px.
- [x] **7. Build onboarding and the lesson.** Welcome, nickname, three lesson
  beats with Next, three tutorial questions, first win and skippable preferences.
  Done: a new learner reaches Home; tutorial answers change no scores or dots.
- [x] **8. Build five-question practice.** Tap-to-fill answers, checking, round
  progress, Another 5, Done for today and safe exits.
  Done: completed rounds feed the practice score and never block further practice.
- [x] **9. Build the help ladder.** Nudge after one miss, Show me on the same
  sentence, replay/pause, Put it in yourself and Go deeper after three misses.
  Keep The move available and prevent reveal by elimination.
  Done: every help route recovers to practice and records help correctly.
- [ ] **9a. Build online AI explanations.** Add Still stuck? in the practice help
  view and a Pages Function that rewords approved Move 1 teaching content.
  Select/verify the provider/model; configure server secrets and request/spending
  limits. Apply §5a scoring, labels and proof-mode isolation. Verify timeout,
  cancellation, late response, offline, invalid-output and rate-limit fallbacks.
  Done: a real provider call explains the concept in the demo; at least 20 reviewed
  outputs match the rule, failures preserve local help, and the pitch states online-only AI.
- [x] **10. Build honesty and readiness.** Equal-weight reason choices, random
  one-in-three verification, free looks, the three-honest-answer hint and readiness.
  Done: honesty preserves dots; solo is reachable both ready and not ready.
- [x] **10a. Add local sounds and learner avatars.** Implement spec §14a with
  bundled Cuelume/Blobatar, a saved Sounds toggle and stable local avatar identity.
  Keep the Home/Settings additions small; step 14 completes those screens.
  Done: sounds respect save/mute/speech/proof boundaries, old records remain intact,
  avatars survive reload/nickname changes, and runtime external requests are absent.
- [x] **11. Build solo checks.** Ten questions, no help/Bo, ten-minute timer,
  wake lock with fallback, absence grace period, timeout and exit confirmation.
  Done: scores, practice conversion and 8/10 proof work without help leakage.
- [x] **12. Build results and gap cards.** First-score state, absent-practice-score
  state, saved comparisons, passed/not-yet outcomes and post-run misses review.
  Done: results show only real scores and qualifying improvement claims.
- [x] **13. Build rechecks and recovery.** Five no-help questions, five-minute
  timer, 4/5 pass, due/overdue entry, Held/Fading states and recovery scheduling.
  Include labelled simulated dates for demonstration without altering real records.
  Done: day-3/7/14, late checks and recovery behave according to the spec.
- [x] **14. Complete Home and Settings.** Import only needed map assets; use
  accessible HTML nodes, correct proof states and Coming soon labels. Provide one
  primary action, solo entry, reachable Settings, partner preferences, coach style,
  language and read-aloud. Preserve exam content in English; label unreviewed Pidgin.
  Retain step 10a's Sounds toggle and learner avatar when completing these screens.
  Done: every implemented flow is reachable; state changes persist across screens.
- [x] **15. Build optional sharing.** Generate the serious proof/progress image,
  source line and plain-language message. Add learner-controlled mobile sharing
  and image download on laptops; cover no-partner and offline states.
  Done: eligible wins can be shared/downloaded; failures never trigger sharing.
- [ ] **16. Complete offline installation and return cues.** Cache the shell,
  local font, assets and pack; add app icons, safe update behaviour, Ready offline,
  install guidance and Add to calendar. Record calendar use locally for pilot metrics.
  Done: after initial loading, the full learning loop runs with the network disabled.
- [ ] **17. Finish device and accessibility support.** Verify phone 360, tablet
  768 and laptop 1366×768 layouts; keyboard controls, focus, screen-reader labels,
  48 px targets, contrast, large text, reduced motion and read-aloud with fallbacks.
  Keep download/rendering costs small; inspect real-device behaviour.
  Done: the core loop works on target devices without clipping or inaccessible controls.
- [ ] **18. Verify the whole product.** Run content/logic checks and browser
  journeys for onboarding, helped practice, honest answers, solo pass/fail,
  interruptions, sharing, recheck pass/fail/recovery, AI help and offline reopening.
  Check stored pilot measures without adding automatic uploads.
  Done: release checks pass and any remaining limitations are documented.
- [ ] **19. Deploy and verify the release.** Produce a clean build from this
  repository, deploy to the chosen HTTPS host and repeat installation/offline smoke
  checks on the deployed app. Check that no required files point outside the repo.
  Configure the deployed AI endpoint and make a genuine provider call; align the
  capstone pitch with the demo's online AI and offline learning behaviour.
  Include the opportunity card only if its figures and sources have been verified.
  Done: a usable release URL and reproducible local setup exist independently of planning.
- [ ] **20. Run the pilot and observe retention.** Arrange testers and the
  required consent before under-18 sessions. Follow up on real days 3/7/14;
  observe solo improvement, gaps, honesty friction and returns with/without calendar use.
  Done: learning claims are supported by actual elapsed-time evidence.

Steps 1–19 deliver the application. Step 20 validates it over time and cannot be
completed within a 24-hour build. Deferred: diagnostic, profiles, export/restore,
Coach Auto, Proof history and working content for other moves/exams.
