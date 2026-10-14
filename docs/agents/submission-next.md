# Submission handoff

The course shell is deployed at https://tether-4cg.pages.dev. Review baseline:
`chore/initial-setup` at `4c57e46` (14 October 2026). Read `docs/spec.md`,
`docs/course-journey.md`, `docs/roadmap.md` and
`docs/reviews/course-release-2026-10-14.md` before release work.

1. Done on `fix-ai-save-race`: the accepted-AI-reply race is fixed, with two
   regressions in `e2e/ai.spec.ts` (one with a failed save and Retry). Not deployed yet.
2. Complete the named human review of all 20 outputs in `docs/ai-review.md`.
   A real provider call and automated output checks do not satisfy that review.
3. Keep the live solo-journey timeout observation in the release review visible;
   its isolated recheck passed. Rerun affected journeys against HTTPS after the
   AI fix. Use a fresh local preview port and verify its asset hash: Playwright
   may reuse an old worktree server.
4. Record actual phone install/offline/share/voice and VoiceOver/TalkBack checks
   in `docs/release-checks.md`, or retain their explicit untested status.

Submit the working demo with honest claims: 50 planned English stages, five live
concord stages (Move 1 reviewed; Moves 2–5 await the owner's line-by-line review, with no labels shown); online AI explains, fixed rules grade, core study works offline.
The long scrolling Home trail is an approved owner decision. Keep its list view,
keyboard access and reduced-motion fallback. Preserve the solo-speech diagnostic.

For later expansion (move-scoped records are done), get the named review of Moves 2–5,
then implement reviewed Learn pages and further packs. Keep step 20
as a real elapsed-day pilot. Use small focused commits and coordinate shared
files when delegating work.
