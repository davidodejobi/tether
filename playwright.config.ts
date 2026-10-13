import { defineConfig } from "@playwright/test";

// Phone-first: the base layout is 360x800 (docs/spec.md section 14).
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:4173", viewport: { width: 360, height: 800 } },
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
