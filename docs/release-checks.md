# Release checks (roadmap step 18)

## Destination preview gate

Before submission, complete roadmap step 17a against spec §14b and
`course-journey.md`. Record evidence for bounded map/list navigation, honest
planned/available counts, Coming soon controls, preserved Move 1 records,
target widths/large text and offline reopening. This is new work, not covered
by the previously passing Home suite until its journeys are added and run.

## Run these

```
npm run typecheck
npx vitest run                  # unit tests
npm run content:check           # question bank and generator rules
npm run build                   # typecheck + production build
E2E_PORT=4251 npx playwright test   # builds, serves the preview, runs every journey
```

First-load app JavaScript must stay under 100 KB gzipped (spec section 14). Measure it after `npm run build`:
`for f in dist/assets/*.js; do gzip -c $f | wc -c; done`. Last measured: 58 KB gzipped (`index-*.js`, 181 KB raw).

## Verified automatically

All e2e files run against the production preview in `e2e/`.

| Area | Files |
|---|---|
| Onboarding, lesson, tutorial | `onboarding.spec.ts` |
| Practice, help ladder, honesty, verification | `practice.spec.ts`, `help.spec.ts`, `honesty.spec.ts` |
| Solo, recheck, interruptions | `solo.spec.ts`, `rechecks.spec.ts`, `writer-lock.spec.ts`, `save-failure.spec.ts` |
| Results, gap, proof | `results.spec.ts` |
| Sharing, download, copy, cancel | `share.spec.ts`, `release.spec.ts` |
| Offline, service worker, update, calendar | `offline.spec.ts`, `release.spec.ts` |
| Pilot measures stored locally; no request leaves localhost | `release.spec.ts` |
| Home, Settings, layout | `home.spec.ts`, `settings.spec.ts`, `layout.spec.ts`, `layout-shell.spec.ts` |
| Accessibility (axe), read aloud, sounds | `a11y.spec.ts`, `readaloud.spec.ts`, `sounds.spec.ts` |
| Whole-product journeys (part A) | `journeys.spec.ts` |
| Online AI help (Still stuck?), mocked `/api/explain` | `ai.spec.ts` |

Rules, storage and content have unit tests next to the code (`src/**/*.test.ts`).

### Pilot measures (spec section 15)

`release.spec.ts` reads IndexedDB after a short journey and checks these are stored on the device:

- Attempts: help flags, `freeLook`, `moveSheetOpened`, reason (move, sounded, guessed), verification sample and outcome, start and complete moments (correct-to-next timing comes from these).
- Solo and recheck runs with score, pass and `practiceSnapshot` (for the gap); proof cycle history and schedule entries.
- `meta:calendarUses`.
- `meta:aiUses`: time and result of each AI help request (`ai.spec.ts`).
- `meta:sessions`: added in step 18 (`src/rules/session.ts`). A session ends on Done for today or 30 minutes idle; hidden time is excluded.

The same journey records every request and fails on any non-localhost origin.

## Needs real devices

- VoiceOver and TalkBack passes over the whole loop.
- A real install (Android Chrome install prompt, iOS Add to Home Screen) and launching from the icon.
- Real device voices for read aloud, in English and Pidgin.
- The real share sheet (WhatsApp and others); tests stub `navigator.share`.
- A real service worker update between two deploys; tests simulate it with a changed `sw.js`.
- Low-end phone feel on a slow connection.

## Known limitations

- AI help (roadmap 9a, Still stuck?) is built and its journeys run against a mocked endpoint. The live provider call and the 20-output human review (`docs/ai-review.md`) are pending.
- Some Chrome extensions capture single-key shortcuts (1-4, Enter, R, S). Test in a clean profile.
- Pidgin coach copy is unreviewed by a native speaker.
- Real retention needs elapsed days; the build proves the workflow only (spec section 15).

## Self-contained repo (roadmap step 19)

Checked `src`, `public`, `index.html`, `vite.config.ts` and `tools` for paths or URLs outside the repo:

- No absolute paths, no `../` escapes out of the repo, no reference to a planning repo.
- No remote fonts, scripts, styles or images. Fonts are bundled from `src/styles/fonts`.
- The only `https://` URLs are the two JAMB source links in `src/content/strip-disguise.ts` (content data shown to the learner, not loaded by the app).
- Nothing needed fixing.
