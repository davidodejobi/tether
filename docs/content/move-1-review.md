# Move 1 content review: Strip the Disguise (v1)

Status: **English pending review. Pidgin unreviewed.** Nothing here is approved until a named person signs below.

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

- Every question pairs a subject with a side phrase of the **opposite** number, so the side phrase is always the trap.
- Options are the singular form, the plural form, and two forms that are never correct in the blank (for example *am*/*be*, *having*/*to have*, *walking*/*to walk*). Exactly one option is correct.
- Note for the pilot: learners will rarely pick the two filler forms, so the real guess rate is nearer 1 in 2 than 1 in 4. Keep that in mind when reading "8/10 alone".

## 3. Word lists (the review unit)

Review rule: **every subject must read sensibly with every opposite-number side phrase and every predicate.** If one line fails that, change or remove the line.

**Singular subjects (paired with the plural side phrases):** Tunde · Amina · Emeka · Ngozi · The head boy · The head girl

**Plural subjects (paired with the singular side phrases):** The students · The prefects · The players · The twins · My classmates · The new pupils

**Plural side phrases:** as well as two classmates · as well as the other players · along with three friends · along with the new pupils · together with the prefects · together with some teachers · in addition to two other students · in addition to the class captains

**Singular side phrases:** as well as their teacher · as well as the class captain · along with their coach · along with the head teacher · together with their form teacher · together with the librarian · in addition to the principal · in addition to the vice principal

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

**Size:** 960 questions (480 singular, 480 plural). Three are reserved for the tutorial, leaving 957 for practice and proof. The full list is in `move-1-questions.txt` (`npm run content:list` regenerates it).

**Lesson example (outside the question space, matches the Figma lesson):** "Chidi, as well as his friends, ___ in the hall." → *is*. Check you are happy with *his*.

**Tutorial questions:** `amina.two-classmates.in-hall`, `students.their-teacher.at-gate`, `head-boy.three-friends.walk-school`.

## 4. Thirty random sentences

| Sentence | Answer | Options |
|---|---|---|
| The twins, as well as the class captain, ___ to school every morning. | walk | walks, walk, walking, to walk |
| The head boy, as well as two classmates, ___ lunch in the canteen. | eats | eats, eat, eating, to eat |
| Ngozi, as well as two classmates, ___ in the hall. | is | is, are, am, be |
| The head boy, as well as two classmates, ___ ready for the trip. | is | is, are, am, be |
| The prefects, as well as the class captain, ___ in the front row. | sit | sits, sit, sitting, to sit |
| Amina, as well as the other players, ___ finished the project. | has | has, have, having, to have |
| The twins, in addition to the principal, ___ in the hall. | are | is, are, am, be |
| My classmates, in addition to the principal, ___ lunch in the canteen. | eat | eats, eat, eating, to eat |
| The players, in addition to the principal, ___ near the market. | live | lives, live, living, to live |
| The players, together with their form teacher, ___ finished the project. | have | has, have, having, to have |
| The prefects, along with their coach, ___ waiting at the school gate. | are | is, are, am, be |
| Amina, in addition to two other students, ___ seen the new timetable. | has | has, have, having, to have |
| The head boy, in addition to the class captains, ___ to school every morning. | walks | walks, walk, walking, to walk |
| Tunde, in addition to two other students, ___ in the hall. | is | is, are, am, be |
| My classmates, in addition to the vice principal, ___ waiting at the school gate. | are | is, are, am, be |
| The new pupils, together with their form teacher, ___ to school every morning. | walk | walks, walk, walking, to walk |
| Amina, along with three friends, ___ near the market. | lives | lives, live, living, to live |
| The prefects, together with the librarian, ___ near the market. | live | lives, live, living, to live |
| The prefects, together with the librarian, ___ ready for the trip. | are | is, are, am, be |
| Tunde, along with the new pupils, ___ near the market. | lives | lives, live, living, to live |
| Ngozi, along with three friends, ___ seen the new timetable. | has | has, have, having, to have |
| The students, as well as the class captain, ___ early on Mondays. | arrive | arrives, arrive, arriving, to arrive |
| My classmates, in addition to the vice principal, ___ finished the project. | have | has, have, having, to have |
| The players, as well as the class captain, ___ in the front row. | sit | sits, sit, sitting, to sit |
| Tunde, in addition to the class captains, ___ to school every morning. | walks | walks, walk, walking, to walk |
| Ngozi, as well as the other players, ___ to school every morning. | walks | walks, walk, walking, to walk |
| Tunde, along with three friends, ___ seen the new timetable. | has | has, have, having, to have |
| The twins, in addition to the vice principal, ___ ready for the trip. | are | is, are, am, be |
| The head boy, in addition to two other students, ___ early on Mondays. | arrives | arrives, arrive, arriving, to arrive |
| The head boy, along with the new pupils, ___ early on Mondays. | arrives | arrives, arrive, arriving, to arrive |

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

## 6. Decision needed: the "disagree with the nearest noun" shortcut

Today every question pairs a subject with a side phrase of the opposite number. That means a learner can score 10/10 without the move by always picking the verb that disagrees with the noun just before the blank. On a real JAMB item where the side phrase has the same number as the subject ("Tunde, along with his brother, ___ …"), that shortcut gives the wrong answer. Solo has no "tap what you covered" check, so 8/10 alone cannot tell the move from the shortcut.

**Recommendation:** make about 1 in 5 questions same-number pairings (singular subject with a singular side phrase, plural with plural). The shortcut then fails, while the move still works and the Show me copy stays true. It is a small change to the generator and draw rules, plus new same-number side phrases to review. It changes what proof means, so it is your call.

## 7. Sign-off

- [ ] The rule in section 2 is correct as taught.
- [ ] Every word-list line in section 3 reads sensibly in every pairing.
- [ ] The 30 samples in section 4 read as natural exam-style English.
- [ ] The English coach copy in section 5 is correct and does not give answers away.
- [ ] Decide section 6: keep opposite-number pairings only, or add same-number pairings (recommended).

When all five are ticked, set `review.en` in `src/content/strip-disguise.ts` to
`{ status: "approved", reviewer: "<name>", date: "<YYYY-MM-DD>" }` and bump `version` if anything changed.
Pidgin stays labelled Unreviewed until a named native speaker approves it the same way in `review.pcm`.
