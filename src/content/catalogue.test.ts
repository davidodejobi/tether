import { describe, expect, it } from "vitest";
import { availability, english, stagesIn } from "./catalogue.ts";

const section = (id: string) => english.sections.find((s) => s.id === id)!;

describe("English catalogue", () => {
  it("uses the official section question counts", () => {
    expect(english.sections.map((s) => [s.letter, s.questions])).toEqual([["A", 25], ["B", 25], ["C", 10]]);
  });
  it("counts only the one available stage", () => {
    expect(english.sections.map(stagesIn)).toEqual([0, 1, 0]);
    expect(availability(section("lexis-and-structure"))).toBe("1 stage available · more Coming soon");
    expect(availability(section("oral-forms"))).toBe("Coming soon");
  });
  it("never gives Concord a question count, and category counts add up", () => {
    const concord = section("lexis-and-structure").topics.find((t) => t.id === "concord")!;
    expect(concord.questions).toBeUndefined();
    expect(availability(concord)).toBe("1 stage available · more Coming soon");
    const sum = (id: string) => section(id).topics.reduce((n, t) => n + (t.questions ?? 0), 0);
    expect(sum("comprehension-and-summary")).toBe(25);
    expect(sum("oral-forms")).toBe(10);
  });
  it("has stable unique ids and no placeholder stages", () => {
    const ids = english.sections.flatMap((s) => [s.id, ...s.topics.map((t) => t.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(english.sections.flatMap((s) => s.topics).flatMap((t) => t.stages).map((s) => s.id)).toEqual(["strip-disguise"]);
  });
});
