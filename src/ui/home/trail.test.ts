import { describe, expect, it } from "vitest";
import { CX, H, W, along, at, countLabel, gate, heading, labelClearance, labelSide, nodes, parkAt, regions, roadX } from "./trail.ts";

describe("trail geometry", () => {
  it("has 50 stages climbing from the Start gate, inside the screen", () => {
    expect(nodes).toHaveLength(50);
    for (const [i, n] of nodes.entries()) {
      expect(n.x).toBeGreaterThan(CX - 110);
      expect(n.x).toBeLessThan(CX + 110);
      if (i) expect(n.y).toBeLessThan(nodes[i - 1]!.y - 100);
    }
    expect(gate.y).toBeGreaterThan(nodes[0]!.y + 200);
    expect(nodes[49]!.y).toBeGreaterThan(300);
    expect(H).toBeGreaterThan(gate.y);
    expect(W).toBe(720);
  });

  it("counts regions from the blueprint", () => {
    expect(regions.map((r) => [r.first, r.last])).toEqual([[1, 33], [34, 42], [43, 50]]);
    expect(countLabel(1)).toBe("Stage 1 of 33");
    expect(countLabel(34)).toBe("Stage 1 of 9");
    expect(countLabel(50)).toBe("Stage 8 of 8");
  });

  it("parks the bus on the road just below a stage, and the Start gate drive follows the road", () => {
    const park = at(parkAt(1));
    expect(Math.hypot(park.x - nodes[0]!.x, park.y - nodes[0]!.y)).toBeGreaterThan(55);
    expect(Math.hypot(park.x - nodes[0]!.x, park.y - nodes[0]!.y)).toBeLessThan(80);
    const drive = along(parkAt(0), parkAt(1));
    expect(drive[0]).toMatchObject({ x: gate.x, y: gate.y });
    expect(drive.length).toBeGreaterThan(10);
    for (const p of drive) expect(Math.abs(p.x - roadX(p.y))).toBeLessThan(15);
  });

  it("puts every Coming soon label on the side where the road crowds it least, inside the 720-wide stage", () => {
    for (const n of nodes) {
      const side = labelSide(n.n);
      expect(labelClearance(n.n, side), `stage ${n.n}`).toBeGreaterThanOrEqual(Math.min(labelClearance(n.n, side === "r" ? "l" : "r"), 4));
      expect(side === "r" ? n.x + 36 + 104 : n.x - 36 - 104).toBeGreaterThan(0);
      expect(side === "r" ? n.x + 36 + 104 : n.x - 36 - 104).toBeLessThan(W);
    }
  });

  it("turns the bus with the road: up on a straight climb, smoothly through curves, the other way going down", () => {
    const wrap = (a: number) => ((a + 540) % 360) - 180;
    const up = along(parkAt(1), parkAt(50));
    for (let i = 1; i < up.length; i++) expect(Math.abs(up[i]!.a - up[i - 1]!.a)).toBeLessThan(30);
    expect(Math.max(...up.map((p) => Math.abs(wrap(p.a))))).toBeLessThan(80); // always pointing up the screen
    expect(Math.abs(heading(parkAt(0)))).toBeLessThan(45);
    const down = along(parkAt(50), parkAt(1));
    for (let i = 1; i < down.length; i++) expect(Math.abs(down[i]!.a - down[i - 1]!.a)).toBeLessThan(30);
    expect(Math.min(...down.map((p) => Math.abs(wrap(p.a))))).toBeGreaterThan(100); // pointing down the screen
    expect(Math.abs(wrap(down[0]!.a - up.at(-1)!.a))).toBeCloseTo(180, 0);
  });
});
