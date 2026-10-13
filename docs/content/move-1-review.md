# Move 1 content review: Strip the Disguise (v2)

Status: **English v2 approved by David on 13 October 2026. Pidgin unreviewed.**
David explicitly signed off the five English review items below. This approval
covers the current v2 lists, pairings, samples and English coach copy.

## 1. Syllabus source (checked 13 Oct 2026)

- **Document:** JAMB UTME syllabus, Use of English (pages 198–200 of the syllabus brochure).
- **Opened from:** JAMB's IBASS portal, https://ibass.jamb.gov.ng/
- **PDF:** https://ibass.jamb.gov.ng/static/media/Use-of-English.885e843b1f51e6a3d062.pdf
  (SHA-256 `f2b6bc4f2c30fc19ecf57bc14778100ce0deca59445beff9f7e10f34cbf7da18`). The file name is a build hash, so the link will change when JAMB rebuilds the site; the hash tells you whether a later copy is the same document.
- **Exact wording:**
  - Section B, Lexis and Structure, topics: "(e) mood, tense, aspect, number, agreement/concord, degree (positive, comparative and superlative) and question tags".
  - Objective: "Candidates should be able to: … iv. identify various grammatical patterns in use".
  - Exam structure: "SECTION B: Lexis and Structure … (d) Basic Grammar – 10 questions".

**What this verifies:** concord is a JAMB Use of English syllabus topic.
**What it does not verify:** the syllabus does not state the "as well as / along with" rule. That rule is standard English grammar and is part of this review.

**Learner-facing source line:** "Topic: agreement/concord. JAMB UTME Use of English syllabus, Section B (Lexis and Structure)."
The Figma partner-card footer ("Marked by fixed rules from the JAMB Use of English syllabus") and the move-sheet line say more than the syllabus does. Use the line above when those screens are built (roadmap steps 6 and 15).

## 2. The rule

Words like *as well as*, *along with*, *together with* and *in addition to* add extra people but do not change the subject. The verb agrees with the subject before the side phrase.

- Most questions pair a subject with a side phrase of the **opposite** number, so the side phrase is the trap.
- Some pair a subject with a side phrase of the **same** number. Without these, "pick the verb that disagrees with the side phrase" would answer every question correctly without the move (section 6).
- Options are the singular form, the plural form, and two forms that are never correct in the blank (for example *am*/*be*, *having*/*to have*, *walking*/*to walk*). Exactly one option is correct.
- Note for the pilot: learners will rarely pick the two filler forms, so the real guess rate is nearer 1 in 2 than 1 in 4. Keep that in mind when reading "8/10 alone".

## 3. Word lists (the review unit)

Review rule: **every subject must read sensibly with every side phrase it is paired with, and every predicate.** Each subject pairs with every opposite-number side phrase, and with the same-number side phrases marked ★. If one line fails that, change or remove the line.

**Singular subjects (paired with the plural side phrases):** Tunde · Amina · Emeka · Ngozi · The head boy · The head girl

**Plural subjects (paired with the singular side phrases):** The students · The prefects · The players · The twins · My classmates · The new pupils

**Plural side phrases (★ also with plural subjects):** as well as two classmates · as well as some parents ★ · as well as the other players · along with three friends ★ · along with the new pupils · together with the prefects · together with some teachers ★ · in addition to two other students · in addition to the class captains ★

**Singular side phrases (★ also with singular subjects):** as well as their teacher · as well as the class captain ★ · along with their coach · along with the head teacher ★ · together with their form teacher · together with the librarian ★ · in addition to the principal ★ · in addition to the vice principal ★

Side phrases that repeat or contain *their* stay opposite-number only (for example "The prefects, together with the prefects" or "Tunde, as well as their teacher" would not make sense). "as well as some parents" is new in v2.

**Verbs and predicates (present tense):**

| Singular | Plural | Never-correct fillers | Predicates |
|---|---|---|---|
| is | are | am, be | in the hall. · waiting at the school gate. · ready for the trip. |
| has | have | having, to have | finished the project. · seen the new timetable. |
| walks | walk | walking, to walk | to school every morning. |
| lives | live | living, to live | near the market. |
| arrives | arrive | arriving, to arrive | early on Mondays. |
| sits | sit | sitting, to sit | in the front row. |
| eats | eat | eating, to eat | lunch in the canteen. |

Avoided on purpose: collective nouns (team, class, choir, family, staff), because Standard British English allows "the team are"; and *his*/*her* after names, because some names are used for both genders.

**Size:** 1,560 questions: singular subjects 540 opposite + 300 same, plural subjects 480 opposite + 240 same. Three are reserved for the tutorial, leaving 1,557 for practice and proof. The full list is in `move-1-questions.txt` (`npm run content:list` regenerates it).

**Lesson example (outside the question space, matches the Figma lesson):** "Chidi, as well as his friends, ___ in the hall." → *is*. Check you are happy with *his*.

**Tutorial questions:** `amina.two-classmates.in-hall`, `students.their-teacher.at-gate`, `head-boy.three-friends.walk-school`.

## 4. Thirty random sentences (18 opposite-number, 12 same-number)

| Sentence | Answer | Pairing |
|---|---|---|
| The head boy, together with the librarian, ___ in the front row. | sits | same |
| Tunde, in addition to the principal, ___ early on Mondays. | arrives | same |
| The head boy, in addition to two other students, ___ ready for the trip. | is | opposite |
| The head girl, as well as two classmates, ___ in the hall. | is | opposite |
| The prefects, along with three friends, ___ near the market. | live | same |
| The new pupils, as well as their teacher, ___ ready for the trip. | are | opposite |
| Emeka, along with the head teacher, ___ finished the project. | has | same |
| The prefects, along with their coach, ___ finished the project. | have | opposite |
| The twins, in addition to the class captains, ___ early on Mondays. | arrive | same |
| Emeka, together with the prefects, ___ in the hall. | is | opposite |
| Amina, along with the head teacher, ___ near the market. | lives | same |
| Amina, as well as some parents, ___ in the front row. | sits | opposite |
| Amina, in addition to the principal, ___ in the front row. | sits | same |
| The players, as well as their teacher, ___ near the market. | live | opposite |
| Tunde, in addition to the principal, ___ near the market. | lives | same |
| Amina, together with the prefects, ___ waiting at the school gate. | is | opposite |
| The head girl, along with the head teacher, ___ early on Mondays. | arrives | same |
| The new pupils, along with three friends, ___ ready for the trip. | are | same |
| Ngozi, as well as the other players, ___ in the hall. | is | opposite |
| The twins, in addition to the principal, ___ in the hall. | are | opposite |
| The prefects, together with their form teacher, ___ finished the project. | have | opposite |
| Amina, in addition to two other students, ___ near the market. | lives | opposite |
| Amina, in addition to the class captains, ___ ready for the trip. | is | opposite |
| Ngozi, as well as two classmates, ___ in the hall. | is | opposite |
| Tunde, in addition to the class captains, ___ in the front row. | sits | opposite |
| The new pupils, along with the head teacher, ___ near the market. | live | opposite |
| The head boy, together with the librarian, ___ finished the project. | has | same |
| The students, as well as some parents, ___ seen the new timetable. | have | same |
| Amina, as well as some parents, ___ near the market. | lives | opposite |
| The new pupils, as well as their teacher, ___ lunch in the canteen. | eat | opposite |

## 5. Coach copy

| Key | English | Pidgin (draft, Unreviewed) |
|---|---|---|
| Rule | Cover the side phrase. Read what's left. Match the verb. | Cover the side talk. Read wetin remain. Match the verb. |
| The move sheet | As well as, along with, together with and in addition to only add extra people. They never change the subject. Cover that side phrase, read what's left, and match the verb to it. | As well as, along with, together with and in addition to just dey add extra people. Dem no dey change the subject. Cover that side talk, read wetin remain, then match the verb. |
| Nudge | Cover the side phrase and read it again. | Cover the side talk, read am again. |
| Show me 1 | Cover the side phrase: {covered}. | Cover the side talk: {covered}. |
| Show me 2 | What's left: {subject}. That's {count}. | Wetin remain: {subject}. Na {count}. |
| Show me 3 | {count} → {answer}. | {count} → {answer}. |
| Go deeper: subject | Tap the subject: who is the sentence really about? | Tap the subject: na who the sentence dey really talk about? |
| Go deeper: wrong subject | That's part of the side phrase. Cover it and look again. | Na part of the side talk be that. Cover am, look again. |
| Go deeper: count | Is that one, or more than one? | Na one, or plenty? |
| Go deeper: wrong count | Count only the subject, not the side phrase. | Count only the subject, no count the side talk. |
| Go deeper: verb | Now pick the verb that matches. | Now pick the verb wey match. |
| Go deeper: wrong verb | Does that verb match {count}? Try again. | That verb match {count}? Try again. |
| Verify | Tap the part you covered. | Tap the part wey you cover. |
| Count words | one / more than one | one / plenty |

Only the third Show me beat may name the answer; the validator enforces this.

## 6. Why same-number pairings, and how many

If every question paired opposite numbers, a learner could score 10/10 by always choosing the verb that disagrees with the side phrase, without stripping anything. That shortcut fails on real JAMB items such as "Tunde, along with his brother, ___ …".

A share of the pool is not enough, because any one run could still be mostly opposite-number. So each run has fixed counts:

- **Solo:** 5 singular + 5 plural subjects, of which 4 are same-number (2 of each). The shortcut scores 6/10; passing needs 8/10.
- **Recheck:** 3 + 2 or 2 + 3, with 2 same-number items (1 of each). The shortcut scores 3/5; passing needs 4/5.
- **Practice:** about 40% same-number, so learners meet both kinds before they are checked.

A test runs the shortcut against 50 solo runs and 100 rechecks and confirms it fails every one.

## 7. Sign-off

- [x] The rule in section 2 is correct as taught.
- [x] Every word-list line in section 3 reads sensibly in every pairing.
- [x] The 30 samples in section 4 read as natural exam-style English.
- [x] The English coach copy in section 5 is correct and does not give answers away.
- [x] The same-number pairings (★ in section 3, and the same-number samples in section 4) read sensibly.

Recorded in `src/content/strip-disguise.ts` as
`{ status: "approved", reviewer: "David", date: "2026-10-13" }`.
Approval metadata alone does not change the question space, so the pack remains
v2. Later changes to lists, pairings or copy require a version bump and renewed review.
Pidgin stays labelled Unreviewed until a named native speaker approves it the same way in `review.pcm`.
