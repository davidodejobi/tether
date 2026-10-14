import { defineConfig } from "@playwright/test";

// Production-preview QA captures (tools/qa-capture.sh). SCREENS_PORT keeps parallel worktrees apart.
const port = Number(process.env.SCREENS_PORT ?? 5174);

export default defineConfig({
  testDir: "e2e-screens",
  testMatch: "qa.spec.ts",
  workers: 1,
  timeout: 90_000,
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
