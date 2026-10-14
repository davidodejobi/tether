# Tether

An installable, offline study app for JAMB English concord. Start with `AGENTS.md`, then `docs/spec.md` and `docs/roadmap.md`.

## Run it

```
npm install
npm run dev          # local dev server
npm run build        # typecheck + production build into dist/
npm run preview      # serve dist/ at http://localhost:4173
npm test             # unit tests (Vitest)
npx playwright install chromium   # once
npm run test:e2e     # browser tests against the preview build
```

Before a release, follow `docs/release-checks.md`.
