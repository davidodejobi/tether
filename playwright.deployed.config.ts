import { defineConfig } from "@playwright/test";

// Step 19: repeat the release checks against a deployed HTTPS build. DEPLOY_URL=https://… npx playwright test -c playwright.deployed.config.ts
// No webServer: it tests what is live. Only specs that need no local-only hooks run here; e2e-deployed/ holds the live AI check.
const url = process.env.DEPLOY_URL;
if (!url) throw new Error("Set DEPLOY_URL to the deployed site, e.g. https://tether-4cg.pages.dev");

export default defineConfig({
  testDir: ".",
  testMatch: ["e2e/offline.spec.ts", "e2e/release.spec.ts", "e2e/journeys.spec.ts", "e2e/course.spec.ts", "e2e/sounds.spec.ts", "e2e-deployed/*.spec.ts"],
  use: { baseURL: url, viewport: { width: 360, height: 800 } },
  workers: 4,
});
