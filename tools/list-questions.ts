// Writes every Move 1 question to docs/content/move-1-questions.txt for human review.
// Run: npm run content:list
import { writeFileSync } from "node:fs";
import { allCombos, sentence } from "../src/content/generate.ts";
import { stripDisguise as pack } from "../src/content/strip-disguise.ts";
import { validatePack } from "../src/content/validate.ts";

const { errors, releaseBlockers } = validatePack(pack);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
const reserved = new Set<string>(pack.tutorialIds);
const lines = allCombos(pack).map(
  (c) => `${c.id}\t${c.number}\t${c.verb[c.number]}\t${sentence(c)}${reserved.has(c.id) ? "\t[tutorial]" : ""}`,
);
const header = [
  `# ${pack.title} (${pack.moveId}) v${pack.version}: ${lines.length} questions`,
  "# id\tnumber\tanswer\tsentence",
];
writeFileSync("docs/content/move-1-questions.txt", [...header, ...lines, ""].join("\n"));
console.log(`Wrote ${lines.length} questions. Release blockers: ${releaseBlockers.join("; ") || "none"}`);
