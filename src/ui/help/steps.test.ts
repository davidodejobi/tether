import { describe, expect, it } from "vitest";
import { stripDisguise as pack } from "../../content/strip-disguise.ts";
import { buildQuestion, allCombos } from "../../content/generate.ts";
import { chips, countOk, fill, verbOk } from "./steps.ts";

const q = buildQuestion(pack, allCombos(pack)[0]!, () => 0.5);

describe("help steps", () => {
  it("fills beats and only beat 3 may carry the answer", () => {
    for (const lang of ["en", "pcm"] as const) {
      const beats = pack.coach[lang].showMe.map((t, i) => fill(pack, t, q, lang, i === 2));
      expect(beats[0]).not.toContain(q.answer);
      expect(beats[1]).not.toContain("{");
      expect(beats[2]).toContain(q.answer);
      expect(fill(pack, "{answer}", q, lang)).toBe("{answer}");
    }
  });
  it("nudge and Go deeper copy has no answer placeholder", () => {
    for (const lang of ["en", "pcm"] as const) {
      const c = pack.coach[lang];
      for (const t of [c.nudge, ...Object.values(c.goDeeper)]) expect(t).not.toContain("{answer}");
    }
  });
  it("checks steps", () => {
    expect(countOk(q, q.number === "sg" ? "one" : "many")).toBe(true);
    expect(countOk(q, q.number === "sg" ? "many" : "one")).toBe(false);
    expect(verbOk(q, q.answer)).toBe(true);
    expect(verbOk(q, q.options.find((o) => o !== q.answer)!)).toBe(false);
  });
  it("chips mark subject and side phrase words", () => {
    const c = chips(q);
    expect(c.before.filter((x) => x.kind === "subject").map((x) => x.text).join(" ")).toBe(`${q.subject},`);
    expect(c.before.some((x) => x.kind === "side")).toBe(true);
  });
});
