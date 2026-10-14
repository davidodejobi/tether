// Writes every move's questions to docs/content/move-N-questions.txt for human review.
// Run: npm run content:list
import { writeFileSync } from "node:fs";
import { questionListing } from "../src/content/generate.ts";
import { moves } from "../src/content/moves.ts";
import { stripDisguise } from "../src/content/strip-disguise.ts";
import { validateMove, validatePack } from "../src/content/validate.ts";

moves.forEach((move, i) => {
  const { errors, releaseBlockers } = i === 0 ? validatePack(stripDisguise) : validateMove(move);
  if (errors.length) {
    console.error(`${move.moveId}:\n${errors.join("\n")}`);
    process.exit(1);
  }
  writeFileSync(`docs/content/move-${i + 1}-questions.txt`, questionListing(move));
  console.log(`Move ${i + 1} (${move.moveId}): ${move.combos.length} questions. Release blockers: ${releaseBlockers.join("; ") || "none"}`);
});
