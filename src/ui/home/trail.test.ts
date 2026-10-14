import { describe, expect, it } from "vitest";
import { CX, H, W, along, at, countLabel, gate, nodes, parkAt, regions, roadX } from "./trail.ts";

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
    expect(Math.hypot(park.x - nodes[0]!.x, park.y - nodes[0]!.y)).toBeGreaterThan(30);
    expect(Math.hypot(park.x - nodes[0]!.x, park.y - nodes[0]!.y)).toBeLessThan(50);
    const drive = along(parkAt(0), parkAt(1));
    expect(drive[0]).toMatchObject({ x: gate.x, y: gate.y });
    expect(drive.length).toBeGreaterThan(10);
    for (const p of drive) expect(Math.abs(p.x - roadX(p.y))).toBeLessThan(15);
  });
});
