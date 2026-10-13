// Writes every Move 1 question to docs/content/move-1-questions.txt for human review.
// Run: npm run content:list
import { writeFileSync } from "node:fs";
import { questionListing } from "../src/content/generate.ts";
import { stripDisguise as pack } from "../src/content/strip-disguise.ts";
import { validatePack } from "../src/content/validate.ts";

const { errors, releaseBlockers } = validatePack(pack);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
writeFileSync("docs/content/move-1-questions.txt", questionListing(pack));
console.log(`Wrote the question list. Release blockers: ${releaseBlockers.join("; ") || "none"}`);
