import { defineConfig } from "@playwright/test";

// Screenshots run against the Vite dev server (the e2e config uses the production preview, where /kit does not exist).
export default defineConfig({
  testDir: "e2e-screens",
  use: { baseURL: "http://localhost:5174" },
  webServer: {
    command: "npx vite --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
