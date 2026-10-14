# Concord stages 2–5: review sheet

Written 14 October 2026 at the owner's request ("make at least five stages work").
The rule in each move file generates every question and its answer. No AI writes or
grades them. The moves are **Unreviewed** until a named reviewer signs them off here.
Until then learners see an Unreviewed tag on their coach copy, results page and share
card. Online AI help is off for them, because the AI function only serves approved
packs.

Owner-delegated decision (14 October 2026): these moves can still earn a real
Proved stamp, so the five stages work like stage 1. The Unreviewed label stays on
that proof until sign-off.

Each move uses the same JAMB syllabus line as Move 1: Section B (Lexis and
Structure), (e) agreement/concord. Full question lists are in
`docs/content/move-2-questions.txt` to `move-5-questions.txt`; regenerate them with
`npm run content:list`. `src/content/moves.test.ts` spot-checks every rule on fixed
sentences. It also shows that neither following the covered words nor doing the
opposite can pass a solo check or recheck.

## How the moves fit the app

Every question is a sentence with one blank before its predicate. The words before
the blank are split into parts:

- **subject**: the part that decides the verb.
- **covered**: the part the move teaches you to cover.
- **plain**: any other words, such as "who".

Show me, Go deeper and the "Tap the part you covered" check all use these parts.
Options are always the singular form, the plural form and two forms that never fit
(for example is / are / am / be).

## Move 2: Either…or, neither…nor: the nearest subject (`src/content/nearest-subject.ts`)

- Rule: the verb matches the subject nearer to it.
- Example (lesson): "Neither Chidi nor his friends ___ in the hall." → are.
- Questions: 270. Every ordered pair of 10 people (5 singular, 5 plural), with
  either…or and neither…nor alternating, and 3 predicates each.
- Not tested: pronoun pairs such as "either you or I", where person agreement also
  changes the verb.

## Move 3: Collective nouns (`src/content/collective-nouns.ts`)

- Rule: a group word (team, choir, committee, band, club) names one group acting as
  one, so the verb is singular, even when "of + many people" follows. A plural
  group word ("the two teams") takes a plural verb.
- Example: "A bunch of keys ___ on the table." → is.
- Questions: 200. Every predicate describes the group acting as one unit (meets
  every Friday, has arrived at the hall).
- Not tested: the members-acting-separately sense ("The jury were divided").
- British usage sometimes allows a plural verb even in the unit sense ("The team
  are ready"). This move follows the examination convention that a group acting as
  one takes a singular verb. **Reviewer, please check this choice.**

## Move 4: Each, everyone, none (`src/content/indefinite-pronouns.ts`)

- Rule: each, every one, either, neither, everyone, everybody, no one and nobody take
  a singular verb, even with "of + plural" after them. Both, many, several and few
  take a plural verb.
- Example: "Each of the girls ___ a new bag." → has.
- Questions: 237. "Either/neither/both of" are used only with pairs (the twins, the
  captains). Several and few take only "of" phrases; "many in the class" keeps a
  singular place phrase next to a plural pronoun.
- "None" is tested only with uncountable words ("None of the water ___ clean." → is).
  With plural nouns, standard English accepts both "none of the boys is" and "none
  of the boys are", so a rule cannot mark either one wrong.

## Move 5: One of the … who/that (`src/content/one-of-the.ts`)

- Rule: in "One of the students is late" the verb belongs to "one", so it is
  singular. In "Tunde is one of the students who are late", "who" points back to
  "the students", so the verb is plural. "That" works the same way for things.
- Example: "Bola is one of the girls who ___ in the choir." → are.
- Questions: 296. There is also a decoy: a singular noun next to the blank ("One of
  the players from our school ___", "one of the players from our school who ___").
  For this move the run shapes are balanced against "agree with the noun next to the
  blank". "One means singular" and "always plural" score 5 of 10 by construction.
- Not tested: "the only one of the … who" (singular), a later refinement.
- **Reviewer, please confirm the plural after "one of the … who".** It is the
  standard examination answer, but everyday usage often has the singular.

## Pidgin

Each move has Pidgin coach copy in the same voice as Move 1's. Like Move 1's Pidgin,
it is Unreviewed. Exam sentences stay in English.

## Sign-off

To approve a move:

1. Set `review.en` in its file to
   `{ status: "approved", reviewer: "<name>", date: "<YYYY-MM-DD>" }`.
2. Bump nothing else.
3. Run `npm run content:list` and `npx vitest run src/content`.

To offer AI help for an approved move, `server/explain-core.ts` must also load that
move; today it serves Move 1 only.

| Move | Reviewer | Date | Verdict and changes asked for |
| --- | --- | --- | --- |
| 2 Nearest subject | | | |
| 3 Collective nouns | | | |
| 4 Each, everyone, none | | | |
| 5 One of the … who/that | | | |
