# Release checks (roadmap step 18)

## Deployed release (step 19), 14 Oct 2026

Builder-reported latest deploy (`1f53264`: subject-first onboarding, 50-stage progress, living map): deployed checks 51/51,
including one genuine Still stuck? call. First-load JS 67.5 KB gzipped; map art is a separate 3.8 KB chunk.

First deploy:

- URL: https://tether-4cg.pages.dev, deployed from `chore/initial-setup` with `wrangler pages deploy`.
- `DEPLOY_URL=https://tether-4cg.pages.dev npx playwright test -c playwright.deployed.config.ts`: 48/48 passed
  (offline install/reopen, update rejection, release journeys, course preview, sounds, and one genuine
  Still stuck? call through the deployed function: labelled AI help shown and recorded).
- `/api/explain` on the deployed site: 200 with a genuine explanation (about 1 s), 400 for an extra field,
  405 for GET. The key is a Pages secret; `dist/` contains no key or key name.
- Found only on the real host: Cloudflare answers `/index.html` with 308 to `/`. The service worker cached the
  redirected response and every later navigation failed. Fixed in `src/sw.js` (store a clean copy) with a
  regression test in `offline.spec.ts` that simulates the redirect.
- First-load JS: 61.7 KB gzipped (`index-*.js`, 191 KB raw).

## Destination preview gate

The deployed shell includes steps 17a and 22 plus the Home portion of 23:
subject selection, browsable course/section/topic destinations, 50 planned stages,
five available stages (2–5 Unreviewed), first-solo completion counts and the scrolling trail/list.
Review evidence and open findings are in `reviews/course-release-2026-10-14.md`.
Learn pages remain future work (move-scoped records are done); the pilot is unchanged.

## Run these

```
npm run typecheck
npx vitest run                  # unit tests
npm run content:check           # question bank and generator rules
npm run build                   # typecheck + production build
E2E_PORT=4251 npx playwright test   # builds, serves the preview, runs every journey
```

First-load app JavaScript must stay under 100 KB gzipped (spec section 14). Measure it after `npm run build`:
`for f in dist/assets/*.js; do gzip -c $f | wc -c; done`. Last measured: 67.5 KB gzipped (`index-*.js`, 208 KB raw), plus the lazy `mapArt` chunk (3.8 KB gzipped).

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

## Real-device evidence

Headless tests cannot prove these. Each row is for the owner to fill in on a real device; "Result" stays "not yet run (needs device)" until someone does.

| Check | Result | Steps (human) |
|---|---|---|
| VoiceOver (iPhone, Safari) | not yet run (needs device) | Settings > Accessibility > VoiceOver on. Open the deployed URL. Swipe through onboarding, one practice question (tiles announce as radio buttons with their word, Check, reason choices), Show me, a solo run, Result and Settings. Note anything unlabelled, read in the wrong order, or a focus jump that lands nowhere. |
| TalkBack (Android, Chrome) | not yet run (needs device) | Settings > Accessibility > TalkBack on. Repeat the VoiceOver route above, including the timer announcement in a solo run ("Time is almost up"). Note the same kinds of problems. |
| Install | not yet run (needs device) | Android Chrome: open the URL, accept the install prompt (or menu > Install app), launch from the icon, check it opens standalone with the Tether icon. iOS Safari: Share > Add to Home Screen, launch from the icon. Turn on airplane mode and relaunch: Home and practice must open. |
| Share sheet | not yet run (needs device) | Finish a solo run (or use a saved proof), open Share, tap Share proof. Choose WhatsApp: the card image and message arrive. Also try Cancel (no error shown) and Download card / Copy text. |
| Voices (read aloud) | not yet run (needs device) | Settings > Read-aloud on. Open a practice question and tap Read aloud in English, then switch to Pidgin. Note which voice each phone used and whether pronunciation is understandable. Note the phone model and OS. |
| Service worker update between deploys | not yet run (needs device) | Install and open deploy A, go offline once to confirm it works. Deploy B (any visible change). Open the app online: the update prompt appears, Update applies it, the new version shows, and saved progress is still there. Also try Not now and reopen later. |

Also on the integrated build, rerun `node tools/compat-check.ts` (saved-learner compatibility against the previous release) and `tools/qa-capture.sh` (screens at 360, 768 and 1366 in light and dark).

## Needs real devices

- VoiceOver and TalkBack passes over the whole loop.
- A real install (Android Chrome install prompt, iOS Add to Home Screen) and launching from the icon.
- Real device voices for read aloud, in English and Pidgin.
- The real share sheet (WhatsApp and others); tests stub `navigator.share`.
- A real service worker update between two deploys; tests simulate it with a changed `sw.js`.
- Low-end phone feel on a slow connection.

## Known limitations

- AI help has mocked journey coverage and a verified deployed provider call. The 20-output human review (`docs/ai-review.md`) is still unsigned; roadmap 9a remains open. The accepted-reply/save race from the course release review is fixed, with regressions.
- Some Chrome extensions capture single-key shortcuts (1-4, Enter, R, S). Test in a clean profile.
- Pidgin coach copy is unreviewed by a native speaker.
- Real retention needs elapsed days; the build proves the workflow only (spec section 15).

## Self-contained repo (roadmap step 19)

Checked `src`, `public`, `index.html`, `vite.config.ts` and `tools` for paths or URLs outside the repo:

- No absolute paths, no `../` escapes out of the repo, no reference to a planning repo.
- No remote fonts, scripts, styles or images. Fonts are bundled from `src/styles/fonts`.
- JAMB source metadata is bundled locally. Runtime AI uses the same-origin `/api/explain`; the server contacts the provider. Core study assets remain local and usable offline.
- Nothing needed fixing.
