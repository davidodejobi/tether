// Live provider check (roadmap 9a): 10 "plain" and 10 "analogy" outputs from the same prompt builder and output checker
// the Pages Function uses, written to docs/ai-review.md for HUMAN review. AI never grades: the verdict column stays blank.
// Usage: node tools/ai-sample.ts   (reads OPENROUTER_API_KEY and optional AI_MODEL from .dev.vars; the key is never printed)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { buildPrompt, checkOutput, parseCompletion, type Style } from "../server/explain-core.ts";

if (!existsSync(".dev.vars")) {
  console.error("No .dev.vars found. Copy .dev.vars.example to .dev.vars and add the owner's key, then run again.");
  process.exit(1);
}
const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8")
    .split("\n")
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => [m[1]!, m[2]!.replace(/^["']|["']$/g, "")]),
);
const apiKey = vars.OPENROUTER_API_KEY;
if (!apiKey || apiKey.startsWith("replace-with")) {
  console.error("OPENROUTER_API_KEY in .dev.vars is empty or still the placeholder.");
  process.exit(1);
}
const model = vars.AI_MODEL || "google/gemini-3.5-flash-lite";

const rows: string[] = [];
let n = 0;
for (const style of ["plain", "analogy"] as Style[])
  for (let i = 0; i < 10; i++) {
    const { system, user } = buildPrompt(style);
    let text = "";
    let verdict: string;
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(15_000),
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}`, "X-Title": "Tether" },
        body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: 220, temperature: 0.4 }),
      });
      if (!res.ok) throw new Error("http");
      text = parseCompletion(await res.json()) ?? "";
      verdict = !text ? "rejected: empty or not finished" : (checkOutput(text) ?? "").replace(/^(.+)$/, "rejected: $1") || "accepted";
    } catch {
      verdict = "request failed";
    }
    n++;
    rows.push(`| ${n} | ${style} | ${text.replaceAll("|", "\\|").replaceAll("\n", " ")} | ${verdict} | |`);
    console.log(`${n}/20 ${style}: ${verdict}`);
  }

const md = `# AI explanation review (roadmap 9a)

Model: \`${model}\`. Generated ${new Date().toISOString().slice(0, 10)} with \`node tools/ai-sample.ts\`, using the same prompt builder and output checker as \`functions/api/explain.ts\`.

The checker verdict is automatic and only filters; it is not a review. A human fills the last column for each row: does the text
(1) restate only the reviewed Move 1 rule (no new grammar rules), (2) give no answer, option choice or grading, and (3) read simply in at most three sentences?

| # | Style | Output | Checker | Reviewer verdict |
|---|---|---|---|---|
${rows.join("\n")}

## Observed limitations

To be written by the reviewer after reading the rows.
`;
writeFileSync("docs/ai-review.md", md);
console.log("Wrote docs/ai-review.md");
