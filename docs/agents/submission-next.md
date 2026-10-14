# Next work before submission

Read `AGENTS.md`, `docs/spec.md`, `docs/roadmap.md`, `docs/course-journey.md` and
`docs/release-checks.md`. This handoff prepares the submission in a few hours;
the full syllabus course is roadmap steps 21 onward, after step 19.

## Integration first

`wave5` contains the reviewed steps 11–17 plus newer AI/release work. The main
`chore/initial-setup` checkout was still at `3a139a6` when this note was written.
Verify current branches and working trees. Review the changes after `bf031bc`
before treating the whole branch as signed off, then integrate the approved
work. Keep the previous solo-speech failure's diagnostic assertion intact.

## Parallel tasks with separate file ownership

- Journey agent: implement only step 17a/spec §14b. A reachable English overview,
  section/topic route to existing Move 1, bounded stage view, destination/count
  labels and accessible list view. Verify source metadata; omit unsupported
  counts. Leave onboarding, grading, storage schema and new teaching packs alone.
- AI agent: complete and verify the existing step 9a implementation; do not rebuild
  it from scratch. Configure the server-only OpenRouter key/model, verify a real
  provider call, review 20 plain/analogy outputs and failure/late-response paths.
  Use spec §5a as the contract. No keys or learner records in browser code/logs.
- Release agent: own step 18 integration QA, the production preview and device
  checks. Review new AI/journey diffs, rerun the release journeys after integration,
  capture phone/tablet/laptop screens and test saved-learner compatibility,
  keyboard/large text, share/download, update rejection and offline reopening.
  Record real-device voice/install/share/VoiceOver/TalkBack evidence or explicit
  limitations. Coordinate shared files with the other agents before editing.

Once those checks pass, step 19 deploys the release to HTTPS and verifies the real
AI endpoint, installation and offline restart there. Prepare the submission URL,
short demo and pitch: one reviewed English stage is live; the syllabus journey
shows the expansion plan; AI explains online, fixed rules grade, and core study
works offline. Claim retention only when step 20 supplies actual elapsed-day data.

Use isolated branches/worktrees from the integrated approved base. Keep commits
small and focused. Report the preview URL, changed scope, test evidence, measured
bundle size and release limitations. Do not tick steps from mock-only checks or
turn Coming soon stages into fake learning/proof. Tile-flight polish and Figma
alignment can follow as small visual tasks if the submission checks remain green.
