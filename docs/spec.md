# Tether MVP build spec

Version 1 — 13 October 2026. This is the implementation source of truth.
It consolidates `requirements.txt` and `decisions.md`; conflicting historical
copy and priorities in those documents are superseded by this spec.

## 1. Outcome and scope

Deliver an installable web app within the 24-hour build that lets a learner
learn one move, practise with help, check it without help, see the difference,
share a win if they choose, and return to check whether it held.

Primary user: a Nigerian JAMB candidate on a low-cost Android phone, sometimes
using a shared phone or budget laptop. Nickname only; no account or email.
Progress stays on the device. Tagline: **Learning that doesn’t drift.**

The only working content is JAMB Use of English concord, Move 1,
**Strip the Disguise**: “Cover the side phrase. Read what’s left. Match the verb.”
Teach `as well as`, `along with`, `together with` and `in addition to` constructions.
Other moves are labelled Coming soon and have no working assessment controls.
Proof is for this move, never for all English or a predicted JAMB score.

Include onboarding, the lesson, five-question practice, the help ladder,
honesty/readiness, solo checks, results, rechecks/recovery, Home, Settings,
read-aloud, English/Pidgin coach text, optional sharing, offline installation,
calendar cues and usable phone/tablet/laptop layouts.

Exclude diagnostic, profiles/PINs, export/restore, AI explanations, Coach Auto,
separate Proof history, accounts, payments, mock exams, other working subjects,
leaderboards, tutor dashboards and automatic messages. French is a future label.
The opportunity card is conditional on source verification (§12).

## 2. App boundaries and records

Use a client-side app: content generation, grading and learning rules run locally.
No backend or runtime AI is required for this MVP. Framework, dependencies and
hosting are selected in roadmap step 2; this spec defines their required behaviour.

Keep five responsibilities separate: reviewed content, deterministic learning
rules, local persistence, UI, and browser capabilities with fallbacks. Learning
rules must be testable without rendering screens or relying on the real clock.

Persist these logical records; the implementation chooses their physical schema:

| Record | Required information |
|---|---|
| Learner | Nickname; onboarding/lesson completion; coach/language/read-aloud settings; optional partner; schema version |
| Question | Stable identity, content version, sentence segments, shuffled options, correct option, subject number and covered phrase |
| Practice attempt | Unique ID, question, time, origin, checked-answer count, correctness, help/reveal history, reason and verification result |
| Run | Unique ID, kind, question list, submitted answers, start/deadline, last visibility evidence, status, result, practice snapshot and covered recheck dates |
| Checkpoint snapshot | Run ID, date, practice score or absent, solo score, raw difference/displayed gap or absent, comparison eligibility |
| Proof cycle | Move, Proved/Held/Fading state, earned date, current schedule anchor, due dates, check results and recovery history |
| Local measurement | Sessions, relevant interaction times, reason/check events and calendar use; demo records kept separately |

Run states: active, completed, converted-to-practice or exited. An exited or
converted run cannot also become a completed proof run. IDs make answer, score,
dot and stamp updates idempotent. Only one tab may write an active learning
session; another tab offers to return to the active one rather than submit answers.

## 3. Content contract

Each pack contains its move ID/version, fixed rule identifier, tagged word
lists, compatible verb/predicate combinations, distractors, lesson examples,
English/Pidgin coach copy, reviewer status and syllabus-source metadata.

- Correct answers come from the subject’s tagged number and a fixed implemented
  rule. AI does not generate runtime questions, answer keys or scores.
- Each question has four distinct options and exactly one correct option.
  Shuffle their positions. Do not immediately repeat the previous question.
- A proof run uses distinct questions within that run. Lesson/tutorial examples
  are reserved separately and excluded from proof questions. Do not repeat the
  immediately preceding proof run’s questions where the validated pool permits.
- Ship at least 50 distinct practice/proof sentences. Different option order
  does not make a sentence new. Balance singular/plural coverage: five of each
  in solo, and alternate three/two coverage across five-question rechecks.
- Validate the entire finite question space for tags, filled placeholders,
  compatible combinations, keys and option uniqueness. Human review covers
  sentence sense and the teaching rule; automated number checks do not replace it.
- Record the verified official syllabus section and URL before learner release.
  Reuse that source on the move sheet and every partner card.
- English exam sentences/options stay English in both coach languages. Pidgin
  is visibly Unreviewed until a named native reviewer approves that pack version.
  Do not describe unreviewed text as verified teaching content.

## 4. First visit and lesson

Order: Welcome → Nickname → Learn the move → three tutorial questions →
first-win moment → skippable Make Tether yours → Home. No diagnostic or target score.

Nickname is trimmed, non-empty and at most 30 characters; it stays editable.
Setup offers Character/Text only, English/Pidgin and an optional partner.
Skipping uses Character, English, read-aloud off and no partner. Partner name
and phone are optional; neither is needed to create or share a card.

The lesson has three beats on its own example: cover the side phrase, identify
the remaining subject, match its verb. Each waits for Next; the last ends with
Got it. Revealing this example is allowed. Tutorials use the normal help ladder
but contribute no scores, dots or claim measurements. First win means completing
the introduction, not earning proof or claiming three unaided correct answers.

Regular practice introduces the honesty rule once: “Tell us the truth and
nothing is lost. Dots only come from using the move. The solo check is what
proves it. Sometimes we’ll ask you to show it.”

## 5. Practice and help

Each round has five completed questions, a summary, Another 5 as primary and
Done for today as secondary. Correctness is shown after checking. An unfinished
question survives a practice exit; it does not enter the completed-question window.
Each checked answer counts as an attempt; selecting/changing a tile does not.

The question shows a sentence blank, four tap-to-fill choices, Check, Show me,
The move, read-aloud, language control and round progress. Check is disabled
without a selection. Wrong tiles are struck out and cannot be selected again.

| Event | Behaviour |
|---|---|
| First miss | Reset dots; mark help; show one-line nudge and allow retry |
| Second miss | Offer Show me prominently; retain total miss count |
| Third miss | Hide all answer tiles; start Go deeper so elimination cannot expose the answer |
| Show me chosen at any time before a correct answer | Mark reveal/help; reset dots; animate this question’s sentence in three beats |
| Show me finished | Put it in yourself returns to this question; subsequent correctness earns no practice point or dot |
| Go deeper | Learner identifies subject, one/many, then verb; incorrect steps receive hints without stating the final answer |
| The move opened | Show the general rule/its separate lesson example; no help mark or dot reset |

Show me supports pause, replay and a static Next-based reduced-motion version.
Its third beat may reveal the verb. Nudge and Go deeper never state the answer
before the learner produces it. Help does not reset the question’s miss history.
An answer reached with help skips How did you know and offers the next question.

“With help” is the number of the latest ten completed practice questions answered
correctly on the first or second checked attempt, before any Show me/Go deeper
answer-building/reveal. Count unaided first-attempt answers too. Explain it as:
“Your last 10 practice questions. Hints were available.” A miss followed by a
successful second try contributes one point; a third try or a revealed answer
contributes zero. The move sheet is not answer help for this calculation.

## 6. Honesty and readiness

After every unaided correct regular-practice answer, ask How did you know with
three equally styled choices. Finalise correctness once; any subsequent reason
or verification updates the same attempt. Leaving the prompt earns no dot and
preserves the scored answer; resume the pending prompt on return.

| Response/event | Dot effect | Help effect |
|---|---|---|
| I used the move, not selected for verification | Add one, capped at three | None |
| I used the move, selected randomly with probability 1/3 | Add one only after correctly selecting the covered phrase | None |
| Failed verification | Preserve previous dots; offer a free Show me | None |
| It sounded right / I guessed | Preserve dots; optional free Show me | None |
| Miss, nudge, voluntary answer help before correct | Reset to zero | Mark question helped |

Sample verification once per claim and persist that choice; reloading cannot
reroll it. A free look after correctness changes neither score nor dots, and
finishes with Next question. Record it separately from voluntary answer help.
Never accuse the learner of lying. After three successive honest non-move
responses, offer The move once; reset that response counter and hint eligibility
after a move claim/miss.

Three dots mean recommended readiness, not proof. Solo remains available on
Home and the round summary at zero, one or two dots via Try anyway. Dots reset
when a genuine solo/recheck run begins; tutorial and post-run review never add dots.

## 7. Solo, recheck and interruption rules

| Property | Solo | Scheduled/recovery recheck |
|---|---|---|
| Questions | Ten | Five |
| Duration | Ten minutes | Five minutes |
| Pass | 8/10 | 4/5 |
| Updates alone/gap | Yes | No |
| Help, move sheet, honesty prompt, Bo | Absent | Absent |

Entry states duration, pass threshold and no-help conditions. Show only timer,
progress, sentence, answer controls, question read-aloud and exit.
One submitted answer per question;
no backtracking and no correctness/answer feedback until the run finishes.
Selecting a tile is not submission. Timeout scores unsubmitted items as wrong.

Start a real deadline at entry; navigation cannot reset it. Warn during the last
20 seconds without relying on colour. Request wake lock where supported and
reacquire on return; failure does not disqualify the learner. Show a brief
keep-screen-open instruction when the device cannot stay awake automatically.

- Hidden for less than ten seconds: continue, deadline unchanged; show the
  welcome-back toast. Apply timeout if the deadline has already elapsed.
- Hidden for ten seconds or more: convert to practice before applying any proof
  result, even if the deadline elapsed while away. No alone score, stamp, fade
  or completed recheck comes from this run.
- An explicit exit asks Keep going or Leave. Leave converts submitted work to
  practice and returns Home; unsubmitted work remains available as practice.
- Refresh/reopen may resume a proof run only when saved evidence establishes an
  absence under ten seconds. Unknown/long absences convert it. Clock anomalies
  that make the remaining assessment time unreliable also convert it, with an explanation.
- Conversion is recorded once. Submitted answers become completed practice
  attempts with their actual one-check correctness; there is no retrospective
  honesty prompt or dot. Continue the unsubmitted questions as ordinary practice
  in a new round. Default action is Start a fresh solo run/recheck.

An abandoned practice question is excluded from scores until completed. Early
exits/conversions do not count as failed proof checks. Review is available only
after a completed run, where answers and free Show me may be shown. Post-run
review changes neither the practice window nor dots nor the saved result.

## 8. Results, alone score and gap

“Alone” means the latest completed ten-question solo score, including a timed-out
run scored out of ten. Recheck scores use “no help” and never replace alone.

Capture the latest-ten practice score at solo entry, or record it absent if fewer
than ten completed practice questions exist. Save it with the completed solo
result. Later practice cannot modify this snapshot or fill an absent old score.

| Condition | Result/Home copy |
|---|---|
| No solo result | Take your first solo check |
| Solo exists but practice snapshot is absent | Show alone; explain that ten practice questions then another solo check establish the first gap |
| First complete comparison | Show both scores and Your first gap; no change claim |
| Later comparison | Show both scores, current gap and comparison date |
| Alone equals/exceeds practice | Display gap zero and No help gap on this check; retain both actual scores |

Raw difference = practice − alone. Displayed gap = max(0, raw difference).
Compare to the immediately previous completed solo snapshot only when both
snapshots have practice scores; do not skip missing snapshots to invent continuity.
Celebrate shrinking gaps only if alone has not fallen. If it has, show the scores
neutrally and recommend practice without improvement copy or improvement sharing.

Home’s gap hero shows the saved checkpoint comparison, with its date. A live
practice score, if shown elsewhere, must not silently replace its practice value.
After 8/10+, show the earned/current proof state. On 7/10, say One more correct
answer would pass; other scores use plain, supportive copy. Include review of
misses and retry/practice controls. A failed repeat solo does not fade an existing
stamp; only a completed failed recheck does. Date existing proof separately and
do not celebrate it as earned by the failed run.

## 9. Proof, dates and recovery

| State/event | Meaning and action |
|---|---|
| No proof + solo pass | Proved; create day-3/7/14 schedule |
| Proved/Held + repeat solo | Keep proof cycle and scheduled dates; save the new solo result |
| Completed recheck pass | Held; complete the schedule entries captured as due at run entry |
| Completed recheck miss | Fading; pause remaining entries; offer recovery |
| Fading + recovery pass | Held; new schedule anchored to recovery date; retain history |
| Fading + recovery miss | Stay Fading; recovery remains available |
| Fading + solo pass | Save alone; remain Fading until the five-question recovery passes |

Use calendar days in the timezone saved with the proof cycle, not multiples of
24 elapsed hours. Day 3 is the third calendar date after the anchor; due starts
at its midnight. Day 0 is the local pass date. Keep this timezone for the cycle.

Due is an additional badge on Proved/Held. An entry is overdue from the following
date, with neutral copy; lateness never changes the proof state. If multiple
entries are due at run entry, one recheck resolves them together. Save those
entry IDs with the run; crossing midnight does not change its coverage.
A late pass does not shift future dates. After the last scheduled pass,
show Held and no invented next date.
Before due, offer ordinary solo/practice rather than a scheduled recheck.

After a miss: “It slipped a bit. Practise the move, then pass 4 of 5 to restore it.”
Recommend three dots; Try anyway always works. Recovery can start immediately.
A successful recovery restarts day-3/7/14 from that pass date. A converted or
exited recheck leaves its due entry unresolved and does not fade proof.

## 10. Home, map and Settings

Navigation: Home and Settings. Practice, solo, recheck and results are reached
through their actions; there is no empty Proof tab or profile switcher.

Home’s primary action uses this order: Continue active practice → Start recheck
if due → Practise to recover if Fading → Continue/start practice. Recovery entry
also provides Try anyway. Move 1 always has a visible solo entry, independent of
dots. Show offline/readiness status and the latest saved gap when available.

Map states: Current, Proved, Held, Fading and Coming soon; Due is an extra badge.
Nodes are accessible HTML controls above decorative art. Keep the map scrollable,
initially centred on Move 1; use clear words/icons and a plain path fallback.
Future exam-day art is decorative, not a working mock exam or proof claim.

Settings includes nickname, Character/Text only, English/Pidgin, read-aloud and
optional partner details. Changes persist immediately; Text only retains every
teaching caption. Bo appears in setup, Home and practice/help, never proof runs,
results, gap cards, share preview or partner cards. Default read-aloud is off;
manual playback stays available. The language list includes Coming next:
Français. More languages later. Only English/Pidgin are selectable.

## 11. Sharing and return cues

Sharing is never automatic and does not require a partner. Offer Share proof
only for the completed successful solo/recheck currently being viewed. Offer
secondary Share progress for a solo result with a qualifying gap improvement,
including a not-yet result; that progress card has no newly earned stamp.
No sharing entry on a failed recheck or Fading result, even if an old gap improved.

Cards use a serious light background, nickname, exam/move, actual score/date,
verified rule source, and one supportive action such as Ask Amaka how it went.
Display a gap only from a complete saved comparison. Recheck cards distinguish
today’s five-question score from any dated prior solo/gap; never present them as
one new ten-question score. Green conveys improvement; gold conveys proof.

Mobile: image preview, editable message and supported share action; fall back to
image download and text copy. Shared laptops: Download card and text copy, without
opening WhatsApp Web. Downloads/previews work offline; explain that delivery to
another person may need connectivity. Cancelling sharing leaves progress intact.

Add to calendar exports the next scheduled date on proof/recheck results and
Home due details. Record use locally; calendar users are a separate return-rate
cohort. Install guidance appears after the first win or on Home, never mid-question.

## 12. Opportunity card and factual sources

Show What a JAMB score opens in Settings only after the official current-year
national minimums and their source dates/URLs have been verified. Do not ship
the historical requirement’s numerical claims as verified facts automatically.
State that each school sets its own requirements and link to its latest notice.
No prediction that a course is out of reach; sourced course-by-course marks are
outside this MVP. If verification is incomplete, omit the card and Settings row.
The verified syllabus source line remains a learner-release requirement.

## 13. Offline, persistence and browser fallbacks

After the first complete load/cache, the lesson, content generation, practice,
proof runs, results, rechecks, card generation, calendar export and Settings work
offline. Ready offline appears only after all required local resources are ready;
connectivity alone is not proof of cache readiness. Partial caching offers retry.
First-ever access without cached resources explains that one initial download is needed.

Persist checked answers and their rule effects together before advancing. After
storage failure, retain the current UI, show retry and do not promise the result
was saved. Unsupported/blocked storage shows that progress is temporary before
learning begins; never silently present it as durable. Browser eviction removes
local progress; there is no cloud restoration promise. Ask for persistent storage
where supported and keep content versions stable for active runs.

Defer an app/content update until the current question/run is safely finished.
Version data and content; an update must not reinterpret stored keys, change old
score snapshots or lose the nickname. No external planning-folder files, remote
fonts or network fetches are required for the learning loop.

Read-aloud uses available device/browser speech: exam sentences stay English;
coach text uses the selected language. Prefer a suitable Nigerian English voice
when available, label a Pidgin voice fallback honestly, and keep text controls
usable when speech is unavailable/offline. Do not promise speech on every device.
Wake lock, installation prompts and native file sharing each have a working
fallback; capability failure never blocks the learning loop.

## 14. UI, accessibility and performance

Phone base 360×800; tablet 768×1024; laptop 1366×768. Phone layout below 768 px,
tablet from 768–1279 px, laptop from 1280 px. Avoid horizontal scrolling at the
target widths; keep short laptop screens usable. Solo/rechecks use focus layouts
without navigation or help panels. Do not double-scale map labels on tablets.

- Day theme: Naija Green; Night: Adire Night. Green/mint actions and dots,
  gold stamps, gap colour visibly distinct from wrong red. Every state also
  has words/icons; proof cards remain light in either theme.
- Use Atkinson Hyperlegible Next locally. Minimum text 12 px, inputs 16 px,
  touch targets 48 px. Text contrast at least 4.5:1, meaningful control boundaries 3:1.
- Choices expose single-selection radio semantics, checked state and the filled
  blank. Keyboard: arrows/Space plus 1–4 to select and Enter to check; R reads;
  S opens Show me only in practice. Ignore shortcuts while typing in Settings.
- Visible focus, readable labels, logical focus order and concise live feedback.
  Modal sheets block underlying input and return focus on dismissal.
- Every motion has a reduced-motion alternative. No auto-advancing lesson beats.
  Allow larger text without hiding actions; help text stays with Text only.
- Keep first-load application JavaScript below 100 KB gzipped, excluding font,
  images and content. Measure total cached download separately. Avoid loading
  decorative map art before the first teaching interaction; fallback remains usable.

## 15. Measurements and demonstration

Store measurements on-device only; no analytics service, automatic uploads or
progress-export feature. With consent, pilot observation/manual recording can
collect the local results without adding a learner-facing data-sharing workflow.

Track completed solo scores/gaps; due/pass/miss/recovery; claimed/sounded/guessed
responses; verification outcomes; move-card/free-look usage; calendar use; session
and correct-to-next timings. Reason rates use answered unaided-correct prompts as
their denominator. Preserve verification status and whether the move card was
opened. Session ends on Done for today or 30 minutes of inactivity; hidden time
is excluded from interaction duration. Aborted/converted proof runs are separate.

Demo dates and simulated rechecks use separate demo records, a persistent Demo
label and demo-labelled cards. They cannot modify real schedules, proof, metrics
or card claims. Real retention needs elapsed days; the first-day build proves
the workflow, not a measured retention outcome. Arrange consent before sessions
with under-18 testers, as required by the project’s pilot requirements.

## 16. Required states and acceptance

| Flow | Required states |
|---|---|
| Setup | New learner, nickname validation, lesson steps, tutorial help, skipped/saved preferences |
| Home | New, active practice, scored, Proved, Held, due, overdue, Fading, offline, cache incomplete |
| Practice | Empty/selected answer, miss 1/2/3, Show me playing/paused/finished/static, Go deeper steps, correctness, pending reason/verification, summary |
| Proof run | Ready/not-ready entry, running, low time, timeout, short/long absence, exit confirmation, restored/converted run |
| Result | First alone, missing practice comparison, first gap, later improvement/no improvement, pass/not yet, misses review |
| Recheck | Due/overdue, pass, miss, recovery entry/pass/miss, paused schedule |
| Share | Eligible proof/progress, no partner, offline preview/download, unsupported native share, cancelled share |
| Settings/browser | Persisted preferences, speech fallback, storage failure/temporary storage, pending update |

Release checks must demonstrate:

1. Entire Move 1 content space passes validation; reviewed combinations have
   no incorrect keys or invalid sentences. Official rule source is present.
2. New learner completes setup; tutorials affect no scores/dots. Guided and
   unaided practice both finish; honesty/free looks apply the correct effects.
3. Solo works before readiness, at 8/10 and 7/10, at timeout, and across
   absences of 9.9 seconds and ten seconds. Conversion/refresh never awards proof twice.
4. Early solo produces no invented gap; saved comparisons remain unchanged;
   negative raw differences and falling-alone comparisons have truthful copy.
5. Day-3/7/14, late/multiple-due, failed/converted checks and recovery apply the
   correct stamps/dates. Repeat solo cannot postpone a due recheck.
6. Sharing is learner-initiated and eligibility is respected. Scores, timestamps
   and source line match records; offline/laptop download succeeds.
7. Reload/offline reopening preserves progress; cache readiness, storage failures
   and update handling do not silently lose or inflate learning records.
8. Phone/tablet/laptop, keyboard, screen-reader feedback, reduced motion, larger
   text and unavailable browser capabilities all preserve the core flow.
9. A production build/deployed HTTPS app installs where supported and runs the
   complete cached loop offline, independent of any planning folder.

## 17. Requirement coverage and roadmap ownership

These are the current release priorities; original Must/Should labels do not
override the agreed scope. Step numbers refer to `roadmap.md`.

| Original requirement | Current disposition | Spec section | Roadmap step(s) |
|---|---|---|---|
| FR1 generation/shuffling | Required | 3 | 3 |
| FR2 answer UI | Required | 5, 14 | 6, 8, 17 |
| FR3 ladder | Required | 5 | 9 |
| FR4 Show me | Required | 5 | 9 |
| FR5 honesty | Required | 6 | 10 |
| FR6 help/dots | Required | 5–6 | 4, 9–10 |
| FR7 solo | Required | 7 | 11 |
| FR8 gap/review | Required | 8 | 4, 12 |
| FR9 offline/storage | Required | 13 | 5, 16 |
| FR10 lesson/move chip | Required | 4–5 | 7, 9 |
| FR11 onboarding | Required | 4 | 7 |
| FR12 Settings | Required, without deferred profile/export controls | 10 | 14 |
| FR13 Home | Required | 10 | 14 |
| FR14 map | Required for Move 1 states; other moves Coming soon | 10 | 14 |
| FR15 rechecks | Required | 7, 9 | 4, 13 |
| FR16 Pidgin | Required with visible review status | 3, 10 | 3, 14 |
| FR17 read-aloud | Required where available, with text fallback | 13–14 | 14, 17 |
| FR18 sharing | Required capability; optional learner action | 11 | 15 |
| FR19 diagnostic | Removed from MVP | 1 | Deferred |
| FR20 rounds | Required | 5 | 8 |
| FR21 return cues | Required | 11, 13 | 16 |
| FR22 coach style | Character/Text only required; Auto deferred | 10 | 14 |
| FR23 responsive | Required | 14 | 17 |
| FR24 AI | Deferred | 1 | Deferred |
| FR25 profiles | Deferred | 1 | Deferred |
| FR26 export/restore | Deferred | 1 | Deferred |
| FR27 validator | Required | 3 | 3 |
| FR28 source line | Required before learner release | 3, 11 | 3, 15 |
| FR29 language list | Required future label; no French content | 10 | 14 |
| FR30 opportunity | Conditional; omit if verification incomplete | 12 | 19 |

Global privacy/device/accessibility constraints are covered in §§1–2, 13–15 and
roadmap steps 5, 16–18. Complete-product verification is step 18, deployment is
step 19, and real elapsed-time pilot evidence is step 20.
