# Implement roadmap step 10a

Build local interaction sounds with Cuelume and learner avatars with Blobatar.
The behaviour contract is `docs/spec.md` §14a. Read `AGENTS.md`, the full spec,
roadmap and relevant decisions before editing.

Start from the latest `wave3`, which contains the reviewed steps 6–10 and this
contract. Use a separate branch/worktree so parallel agents cannot overwrite
each other. `chore/initial-setup` is still behind; verify branch state first.

1. Inspect the guarded progress provider, learner record, question/help/honesty
   controllers and Home/Settings. Preserve the save-before-UI and pending-save
   resume fixes. Keep audio/browser effects out of the pure learning rules.
2. Verify current official package APIs, licences and browser support. Install
   pinned local packages; use the framework-neutral or Preact-compatible APIs.
   Bundle runtime code and keep mandatory licence notices locally.
3. Add backwards-compatible learner sound/avatar fields and guarded persistence.
   Build a small sound service, static avatar component and Sounds toggle; wire
   the existing practice/round actions and minimal Home/Settings identity display.
   Coordinate shared storage/controller files with any AI or solo agent.
4. Cover sound-on/off, unavailable Web Audio, save failure/retry and delayed-save
   exit/re-entry; cues must neither repeat nor fire for failed/cancelled actions.
   Verify speech suppression, hidden tabs and proof-mode silence. Expose the
   sound boundary so steps 11–13 can keep active runs silent and celebrate a saved
   result without adding correctness feedback during assessment.
5. Verify older records retain their settings/progress and receive one stable
   seed; retry/reload/nickname changes preserve it. Check keyboard operation,
   Text only, light/dark, reduced motion and requests with external access blocked.
   Run unit tests, browser journeys, typecheck and production build; report bundle
   delta and distinguish local asset checks from step 16's installed offline test.
6. Commit small related chunks: storage compatibility, sounds, avatars, then
   integration/verification as needed. Update the roadmap only after checks pass.
   Report commits, checks, measured bundle size and any remaining limitations.

Keep this task limited to §14a. AI step 9a, solo/recheck implementation, the full
Home map/Settings redesign, avatar editor, account/profile switching, Figma work
and tile-flight animation belong to their own tasks. Keep source paths local;
do not push or deploy as part of this handoff.
