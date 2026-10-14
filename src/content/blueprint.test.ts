import { describe, expect, it } from "vitest";
import { availableStages, blueprint, plannedTotal, positionInSection, stagesInSection } from "./blueprint.ts";

describe("English stage blueprint", () => {
  it("has the approved 50 stages with unique ids, numbered in journey order", () => {
    expect(plannedTotal).toBe(50);
    expect(new Set(blueprint.map((s) => s.id)).size).toBe(50);
    expect(blueprint.map((s) => s.n)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });
  it("splits 33 / 9 / 8 across the official sections", () => {
    expect([stagesInSection("lexis-and-structure").length, stagesInSection("comprehension-and-summary").length, stagesInSection("oral-forms").length]).toEqual([33, 9, 8]);
  });
  it("the first five concord stages are available, as stages 1 to 5 of Lexis and Structure", () => {
    expect(availableStages.map((s) => s.id)).toEqual(["strip-disguise", "nearest-subject", "collective-nouns", "indefinite-pronouns", "one-of-the"]);
    expect(availableStages.map(positionInSection)).toEqual([1, 2, 3, 4, 5]);
  });
});
