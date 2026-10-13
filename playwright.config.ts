import { defineConfig } from "@playwright/test";

// E2E_PORT lets parallel worktrees run without reusing each other's server.
const port = Number(process.env.E2E_PORT ?? 4173);

// Phone-first: the base layout is 360x800 (docs/spec.md section 14).
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: `http://localhost:${port}`, viewport: { width: 360, height: 800 } },
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
