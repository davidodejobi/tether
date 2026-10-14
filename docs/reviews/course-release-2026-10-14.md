# Course release review — 14 October 2026

Scope: `git diff 594c957...4c57e46`, on `chore/initial-setup`, and
https://tether-4cg.pages.dev. Review includes subject-first onboarding, the
approved stage blueprint, progress counts, course destinations, living map and
AI/release changes in that range. Documentation corrections accompany this
review; app code is unchanged.

## Standards

No validated functional, privacy or accessibility defect found in the living-map
and catalogue changes. Live stages are keyboard links, planned stages are named
Coming soon without assessment controls, reduced motion has a static alternative
and bus position stays local. A missing Web Animations API produced decorative
errors in a browser probe, but the stage link still navigated successfully; this
is not a confirmed navigation defect.

Older documentation contradicted later owner decisions. This review aligns the
onboarding contract, approved 50-stage total, browsable planned destinations,
scrolling Home trail, roadmap status and release handoff. Earlier decisions are
marked superseded rather than erased.

## Spec

### Fixed P2: accepted AI reply can leave loading permanently stuck

Locations: `src/ui/help/StillStuck.tsx:73` and
`src/ui/practice/QuestionView.tsx:181`.

`StillStuck` marks an accepted reply as saving and hides Cancel. Its callback
reaches `QuestionView.update`, which ignores it if another progress save is
pending. The response's timeout is then cleared, and no callback clears saving.
The explanation is neither shown nor recorded; the learner cannot retry it.
This violates spec §5a's bounded, recoverable request behaviour.

Reproduced in Chromium:

1. Reach Go deeper after three misses and request AI help.
2. Delay the next IndexedDB save by three seconds and open The move.
3. Deliver an accepted AI response while that save is still pending.
4. Let the save finish and close The move.

Observed: loading remains, no Cancel button, no AI label, and saved help contains
only `nudge`. Existing late-reply coverage waits until The move save has finished
before delivering the reply, so it misses this ordering. Queue acceptance after
pending saves using the latest attempt, or restore a recoverable fallback. The
regression must prove help is recorded once and the UI resolves after this exact
ordering, including a save failure and Retry.

Fixed on branch `fix-ai-save-race`: `StillStuck` holds an accepted reply until no
save is running or waiting for Retry, then records `help("ai")` on the attempt as
it is by then. Two regressions in `e2e/ai.spec.ts` replay this exact ordering, one
with the AI save failing and retried; both failed before the fix. Help is recorded
once and The move stays opened.

No concrete defect found in first-solo completion deduplication, Fading retaining
completion, English defaults for older learners, subject limits or section stage
numbering. Fifty is the owner-approved editorial plan, not fifty live lessons or
an official JAMB stage count. Only one stage is available.

## Independent verification

- Unit suite: 228 passed. Typecheck and production build passed.
- Main JavaScript: 67.48 KB gzipped; lazy map art: 3.80 KB gzipped.
- Current-build browser suite: 346/346 passed on the production preview (2.3 minutes).
- Deployed suite: 50/51 passed, including a genuine AI call. The solo-pass journey
  timed out at 30 seconds while polling saved submissions; it passed alone on
  recheck (20 seconds, one worker). This remains a timing observation, not a
  reproduced lost-answer defect. Do not describe this review run as 51/51.
- The initial local run reused port 4267 from an older `tether-step21-progress`
  worktree (`index-DFJ3aQxl.js`), so its failures are invalid for this release.
  The current suite uses fresh port 4391 and `index-Cd1HjjxD.js`; reports use
  `/private/tmp/tether-review-local-4c57e46` to avoid concurrent report collisions.
- Retrieved JAMB's cited PDF independently. SHA-256 matches
  `f2b6bc4f2c30fc19ecf57bc14778100ce0deca59445beff9f7e10f34cbf7da18`.
  Printed page 200 supports section allocations 25/25/10 and the displayed
  category weights; concord has no separate question allocation. Source:
  https://ibass.jamb.gov.ng/static/media/Use-of-English.885e843b1f51e6a3d062.pdf.
  This verifies English metadata, not the separate owner-supplied subject list.

## Remaining release and expansion work

- `docs/ai-review.md` contains 20 generated outputs but every human verdict is
  blank. Finish that named review before claiming roadmap 9a or the AI content
  acceptance check is complete. Automated filters and a provider call are
  separate evidence.
- Retain the untested real-device install/share/voice/VoiceOver/TalkBack/update
  limitations in `docs/release-checks.md`; headless passes do not cover them.
- Verify the complete non-English subject list against IBASS before describing
  its provenance as independently checked. Subjects remain optional preferences
  with Coming soon content.
- Before publishing another move, finish move-scoped records and migration
  (step 21); Learn pages (step 24) and further reviewed packs remain future work.
  Step 20 still requires real elapsed-day pilot evidence.

Review outcome: Standards has no confirmed runtime findings; Spec's one P2
runtime finding is fixed (see above). The new course shell is sound; the human
AI review is still open for complete release acceptance.
