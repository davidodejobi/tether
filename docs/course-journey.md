# Course journeys and destinations

Owner decision: 14 October 2026. This is the contract for the syllabus/stage
expansion. Spec §14b defines the deployed course shell included in this submission.
Subject-first onboarding, planned-stage counts and the Home trail are live;
remaining roadmap steps 21 onward deliver move-scoped records and reviewed content.
Step 20's pilot continues independently and still requires real elapsed days.

## Hierarchy and sources

Use Subject → Section → Topic → Move. One move is one numbered stage: one
teachable technique with its reviewed pack, reading lesson, practice, solo proof
and day-3/7/14 rechecks. Reading, tutorial questions, five-question rounds and
rechecks do not add stages.

English uses JAMB's official sections: Comprehension/Summary, Lexis and Structure,
and Oral Forms. Recommended start: English → Lexis and Structure → Concord →
Strip the Disguise. Basic grammar is a Tether teaching group, not a replacement
name for an official section.

Verify the subject catalogue and topic/category names against
[IBASS](https://ibass.jamb.gov.ng/e-syllabus). Store source URL, retrieved date,
exam year/version and document checksum with the catalogue. Teaching and examples
are original, human-reviewed content; do not reproduce syllabus pages.
Question-count weights belong only to categories the source actually quantifies.
An individual move or concord/tense topic must not inherit its parent's entire
question allocation. Stage counts are Tether's units, not JAMB exam weights.

## Counts, destinations and progress

Every course and section has a start, current position and a finish destination.
Compute counts from a versioned stage catalogue, with stable IDs and explicit
availability. Separate planned stages, available reviewed stages, completed
stages and current proof. A planned stage needs an editorially approved identity
and scope; a published stage also needs its reviewed teaching and assessment pack.

The owner approved blueprint version 1 on 14 October 2026: 50 planned English
stages, comprising 33 Lexis and Structure, 9 Comprehension and Summary and 8 Oral
Forms. `src/content/blueprint.ts` owns the stage identities and order. Only Move 1
is available today. Labels distinguish planned totals, available stages and first
solo completions. The earlier 100-stage and 20/15/15 examples are superseded;
these totals describe Tether's editorial plan, not JAMB question allocations.

Within a section show “Stage n of N”, the section's destination, and a clear next
action. Number/order comes from the catalogue, never a learner's attempt count.
If N includes future stages, label that planned denominator visibly. An overview
may say “2 of 4 available stages completed; 8 more planned.”

- Move states: Not started, Learning, Practising, Proved, Held, Fading, Coming soon.
  Derive learning states from that move's saved reading/practice events. Proof
  states and Due badges reuse the existing deterministic rules.
- Completing a stage means first passing its solo check. Record that achievement
  once; repeat passes/rechecks never increase completed-stage counts. Fading
  adds a needs-review state without erasing historical completion or navigation.
- A topic/section shows counts of its moves and any review due. Do not claim the
  entire topic/course is Proved because one move passed. Unpublished required
  stages prevent a full-course completion claim. Reading never creates proof.
- Keep the existing main-action priority; due/recovery work can take precedence
  over a new stage. Learners may inspect sections and choose available stages;
  recommendations do not force a rigid unlock sequence.

## Interaction and accessibility

Owner decision 14 Oct 2026 (docs/decisions.md): Home's map is a long vertically
scrolling trail of all 50 stages, with a list view and keyboard-reachable nodes;
it is never drag-only. Course and section views below stay bounded views, not a
drag-only canvas. Larger sections have chapters/pages with Previous/Next and named links
back to the course and section. Show current location, available next destination
and finish explicitly; preserve position on return without resetting a run.

Use semantic HTML controls above decorative art, an accessible list view, visible
focus and concise page-change feedback. Meet spec §14's target sizes, contrast,
phone/tablet/laptop, keyboard and reduced-motion requirements. Surrounding reading/settings and enlarged text may scroll to preserve
readability. Never shrink labels or hide actions just to fit a viewport.

## Deployed onboarding and future Learn layer

The deployed flow is: Welcome → subject selection → nickname → English course map →
recommended first stage → existing lesson/tutorial → first win → preferences.
English is compulsory and preselected. Allow up to three other subjects from the
verified IBASS catalogue, labelled Coming soon and optional to select in Tether
while their content is unavailable. Keep subject selection editable in Settings.
This preference is not a profile or a course-eligibility recommendation.

Roadmap step 24 will give each topic concise Learn pages with reviewed original
examples. Track Read and Understood separately; Understood is a learner claim, not measured mastery.
Pages have Not started, Reading, Read, Understood, Coming soon and save-failure
states. Online AI may re-explain reviewed lessons within a separately validated
contract; it never grades. Keep reviewed text available offline.

## Data and expansion

Add stable subject, section, topic, move and lesson IDs, catalogue/content versions,
subject preferences, per-topic reading progress and first-stage-completion events.
Existing `strip-disguise` IDs, attempts, option order, snapshots, proof cycles,
time zones, schedules, avatar and learner settings must survive migration. Older
learners default to English without repeating onboarding. Use atomic guarded
saves, idempotent migration and retry; read-only/newer-schema data stays protected.

Before enabling a second move, scope practice windows, dots, gaps, question
history, proof and rechecks by move. All grading remains deterministic and pack-
specific; vocabulary, cloze and oral content need their own reviewed validators.

Content sequence: concord → tense/question tags → synonyms/antonyms → cloze →
sentence interpretation → vowels/consonants. Oral assessments use reviewed local
pronunciation assets, not an arbitrary device voice as the answer authority.
Comprehension, summary and the set text follow later. Store the prescribed title
by verified exam year; write original material and review rights before publishing
novel-derived material. Other subject content, profiles, diagnostics, full mock
exams and course-by-course cutoff marks stay outside this expansion.

## Submission course-shell acceptance (steps 17a, 22 and Home portion of 23)

Provide a course overview/section-topic-stage path around the existing Move 1,
the approved scrolling Home trail, actual availability counts, destination labels
and a list view. Future topics are Coming soon; they have no working assessment controls.
Use bundled source metadata and the current lesson. Subject-first onboarding is
included; the separate reading-progress model and additional reviewed packs remain
future work. All section/topic destinations may be browsed; planned stages have
no working assessment controls.

Done when a new or existing learner can view the English destination, reach and
resume Move 1, take an early solo check and return to a due recheck with unchanged
scores/schedules. Verify 360/768/1366 widths, keyboard, 200% text, offline reload,
Coming soon semantics, preserved records and the existing JavaScript budget.
