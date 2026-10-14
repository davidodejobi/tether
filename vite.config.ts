import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";
import preact from "@preact/preset-vite";

// Writes dist/sw.js with the precache list: every emitted file (JS, CSS, font, icons, assets, manifest, index.html).
// The version is a hash of their contents, so a changed build is a new cache and a new waiting worker.
function serviceWorker(): Plugin {
  let outDir = "dist";
  return {
    name: "tether-sw",
    apply: "build",
    configResolved: (c) => void (outDir = c.build.outDir),
    closeBundle() {
      const files = readdirSync(outDir, { recursive: true, withFileTypes: true })
        .filter((d) => d.isFile() && d.name !== "sw.js")
        .map((d) => join(d.parentPath, d.name))
        .sort();
      const hash = createHash("sha256");
      for (const f of files) hash.update(f).update(readFileSync(f));
      const urls = files.map((f) => "/" + f.slice(outDir.length + 1));
      const sw = readFileSync("src/sw.js", "utf8").replace("__VERSION__", hash.digest("hex").slice(0, 12)).replace("__FILES__", JSON.stringify(urls));
      writeFileSync(join(outDir, "sw.js"), sw);
    },
  };
}

export default defineConfig({
  plugins: [preact(), serviceWorker()],
  test: { include: ["src/**/*.test.ts", "server/**/*.test.ts"] },
});
