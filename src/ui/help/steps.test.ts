import { describe, expect, it } from "vitest";
import { moves, stripDisguiseMove as pack, unreviewed } from "../../content/moves.ts";
import { buildQuestion } from "../../content/generate.ts";
import { chips, countOk, fill, verbOk } from "./steps.ts";

const q = buildQuestion(pack, pack.combos[0]!, () => 0.5);

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
  it("chips follow the question's parts", () => {
    const move = moves.find((m) => m.moveId === "nearest-subject")!;
    const q2 = buildQuestion(move, move.combos.find((c) => c.id === "nearest-subject.tunde.amina.in-the-hall")!, () => 0.5);
    const c = chips(q2);
    expect(c.before.map((x) => `${x.text}:${x.kind}`)).toEqual(["Either:side", "Tunde:side", "or:side", "Amina:subject"]);
    expect(c.after.every((x) => x.kind === "other")).toBe(true);
  });
  it("chips of a multi-part who sentence mark covered, subject and plain words", () => {
    const move = moves.find((m) => m.moveId === "one-of-the")!;
    const q5 = buildQuestion(move, move.combos.find((c) => c.id === "one-of-the.tunde.the-students.from-our-school.who.always-early")!, () => 0.5);
    expect(chips(q5).before.map((x) => `${x.text}:${x.kind}`)).toEqual([
      "Tunde:side", "is:side", "one:side", "of:side", "the:subject", "students:subject", "from:side", "our:side", "school:side", "who:other",
    ]);
  });
  it("unreviewed tags every non-approved move copy", () => {
    expect(unreviewed(pack, "en")).toBe(false);
    for (const m of moves.slice(1)) expect(unreviewed(m, "en")).toBe(true);
  });
});
