import { defineConfig } from "@playwright/test";

// SCREENS_PORT lets parallel worktrees run without reusing each other's server.
const port = Number(process.env.SCREENS_PORT ?? 5174);

// Screenshots run against the Vite dev server (the e2e config uses the production preview, where /kit does not exist).
export default defineConfig({
  testDir: "e2e-screens",
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
