import { describe, expect, it } from "vitest";
import { blueprint } from "./blueprint.ts";
import { allStages, availableIn, english, plannedIn } from "./catalogue.ts";

const section = (id: string) => english.sections.find((s) => s.id === id)!;
const topic = (s: string, t: string) => section(s).topics.find((x) => x.id === t)!;

describe("English catalogue", () => {
  it("uses the official section question counts", () => {
    expect(english.sections.map((s) => [s.letter, s.questions])).toEqual([["A", 25], ["B", 25], ["C", 10]]);
  });
  it("lists every blueprint stage once, in journey order within each section", () => {
    expect(allStages(english).map((s) => s.id).sort()).toEqual(blueprint.map((s) => s.id).sort());
    for (const s of english.sections) {
      const ns = allStages(s).map((g) => g.n);
      expect(ns).toEqual([...ns].sort((a, b) => a - b));
    }
  });
  it("counts planned and available stages", () => {
    expect(english.sections.map(plannedIn)).toEqual([9, 33, 8]);
    expect(english.sections.map(availableIn)).toEqual([0, 1, 0]);
    expect(allStages(section("lexis-and-structure")).filter((g) => g.moveId).map((g) => g.id)).toEqual(["strip-disguise"]);
  });
  it("numbers stages by position in the section", () => {
    const first = topic("lexis-and-structure", "concord").stages[0]!;
    expect([first.position, first.of]).toEqual([1, 33]);
    expect(allStages(section("oral-forms")).at(-1)).toMatchObject({ position: 8, of: 8 });
  });
  it("gives question counts only to official categories, never to Tether teaching groups", () => {
    const b = section("lexis-and-structure").topics;
    expect(b.filter((t) => t.questions !== undefined).map((t) => [t.id, t.questions])).toEqual([["synonyms", 5], ["antonyms", 5], ["sentence-interpretation", 5]]);
    for (const id of ["concord", "tense-and-mood", "question-tags"]) expect(topic("lexis-and-structure", id).questions).toBeUndefined();
    const sum = (id: string) => section(id).topics.reduce((n, t) => n + (t.questions ?? 0), 0);
    expect(sum("comprehension-and-summary")).toBe(25);
    expect(sum("oral-forms")).toBe(10);
  });
  it("has stable unique ids", () => {
    const ids = english.sections.flatMap((s) => [s.id, ...s.topics.map((t) => t.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
