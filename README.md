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

Live: https://tether-4cg.pages.dev (Cloudflare Pages, project `tether`).

## Online AI help (optional)

Still stuck? calls `functions/api/explain.ts`, which uses OpenRouter with a server-side key. The app works fully without it.

```
cp .dev.vars.example .dev.vars      # gitignored; set OPENROUTER_API_KEY (and optionally AI_MODEL)
npm run build
npx wrangler@4.150.0 pages dev dist # app + /api/explain locally
node tools/ai-sample.ts             # 20 live samples into docs/ai-review.md for human review
```

## Deploy

```
npx wrangler@4.150.0 login
npx wrangler@4.150.0 pages secret put OPENROUTER_API_KEY --project-name tether   # once
npm run build
npx wrangler@4.150.0 pages deploy dist --project-name tether --branch main
DEPLOY_URL=https://tether-4cg.pages.dev npx playwright test -c playwright.deployed.config.ts
```

Before a release, follow `docs/release-checks.md`.
