// Geometry of Home's journey trail, in design units (720 wide, a tall stage that the map scales to the screen).
// One source for the node positions, the road and the bus: the screen works and the bus drives even if the art never loads.
import { blueprint, positionInSection, stagesInSection, type SectionId } from "../../content/blueprint.ts";

export const W = 720;
export const CX = W / 2;
const SP = 120; // vertical space between stages
const EXTRA = 90; // extra space where a region changes (it holds the banner)
const AMP = 95; // how far the road swings from the middle
const TOP = 560; // y of stage 50; the JAMB Day hall sits above it
/** The road passes this far below a stage before the bus rests on it. */
export const PARK = 72;

export interface Region { id: SectionId; name: string; first: number; last: number; bannerY: number; scene: "village" | "river" | "city" }
const REGIONS: [SectionId, string, Region["scene"]][] = [
  ["lexis-and-structure", "Lexis and Structure", "village"],
  ["comprehension-and-summary", "Comprehension and Summary", "river"],
  ["oral-forms", "Oral Forms", "city"],
];

/** y of stage n (1..50). Each region boundary below a stage adds EXTRA. */
const stageY = (n: number) => TOP + (50 - n) * SP + EXTRA * ((n <= 42 ? 1 : 0) + (n <= 33 ? 1 : 0));
const stageX = (n: number) => Math.round(CX + AMP * (0.78 * Math.sin(n * 1.05) + 0.22 * Math.sin(n * 0.37 + 1)));

export const nodes = blueprint.map((s) => ({ n: s.n, x: stageX(s.n), y: stageY(s.n) }));
export const gate = { x: CX, y: stageY(1) + 290 };
export const hall = { x: CX, y: stageY(50) - 260 };
export const H = gate.y + 120;

export const regions: Region[] = REGIONS.map(([id, name, scene]) => {
  const list = stagesInSection(id);
  const first = list[0]!.n;
  return { id, name, scene, first, last: list.at(-1)!.n, bannerY: stageY(first) + (first === 1 ? 130 : 100) };
});
export const regionOf = (n: number) => regions.find((r) => n >= r.first && n <= r.last)!;
export const countLabel = (n: number) => `Stage ${positionInSection(blueprint[n - 1]!)} of ${regionOf(n).last - regionOf(n).first + 1}`;

type P = { x: number; y: number };
/** Road waypoints: the gate (index 0), stages 1..50, then the hall door. */
const pts: P[] = [gate, ...nodes, { x: hall.x, y: hall.y + 80 }];

// Catmull-Rom through the waypoints, as cubic Bezier segments, so the road is smooth and the bus can sample it directly.
const segs = pts.slice(0, -1).map((p1, i) => {
  const p0 = pts[i - 1] ?? p1, p2 = pts[i + 1]!, p3 = pts[i + 2] ?? p2;
  return [p1, { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }, { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }, p2] as const;
});
export const roadD = `M${gate.x} ${gate.y}` + segs.map(([, a, b, c]) => `C${a.x.toFixed(1)} ${a.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)} ${c.x} ${c.y}`).join("");

const bez = ([a, b, c, d]: (typeof segs)[number], t: number): P => {
  const u = 1 - t;
  return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y };
};

const PER = 24;
interface Dense { p: P[]; len: number[] }
let dense: Dense | null = null;
/** The whole road as a dense polyline with cumulative length; waypoint k is at index k * PER. */
function road(): Dense {
  if (dense) return dense;
  const p: P[] = [pts[0]!], len = [0];
  for (const s of segs) for (let i = 1; i <= PER; i++) {
    const q = bez(s, i / PER), o = p.at(-1)!;
    p.push(q);
    len.push(len.at(-1)! + Math.hypot(q.x - o.x, q.y - o.y));
  }
  return (dense = { p, len });
}

/** Distance along the road where the bus rests for waypoint k (0 = the Start gate, 1..50 = stages): just below the stage. */
export const parkAt = (k: number) => Math.max(0, road().len[k * PER]! - (k === 0 ? 0 : PARK));

/** Position at a distance along the road. */
export function at(d: number): P & { dx: number } {
  const { p, len } = road();
  let lo = 0, hi = len.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (len[m]! <= d) lo = m; else hi = m; }
  const f = len[hi]! === len[lo]! ? 0 : Math.min(1, Math.max(0, (d - len[lo]!) / (len[hi]! - len[lo]!)));
  const a = p[lo]!, b = p[hi]!;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dx: b.x - a.x };
}

/** Degrees clockwise from "up the screen" for a vehicle on the road at distance d facing towards higher stages. */
export function heading(d: number): number {
  const a = at(d - 4), b = at(d + 4);
  return (Math.atan2(b.x - a.x, a.y - b.y) * 180) / Math.PI;
}

/** Evenly spaced stops (with the facing angle, unwrapped so it never spins the long way) between two distances, for a drive. */
export const along = (from: number, to: number, step = 14) => {
  const n = Math.max(2, Math.ceil(Math.abs(to - from) / step));
  let prev = 0;
  return Array.from({ length: n + 1 }, (_, i) => {
    const d = from + ((to - from) * i) / n;
    let a = heading(d) + (to < from ? 180 : 0);
    if (i) a += Math.round((prev - a) / 360) * 360;
    prev = a;
    return { ...at(d), a };
  });
};

/** x of the road at height y (the road only ever climbs, so y is unique). */
export function roadX(y: number): number {
  const { p } = road();
  let lo = 0, hi = p.length - 1; // y decreases with index
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m]!.y >= y) lo = m; else hi = m; }
  return p[lo]!.x;
}

/** Soon-label box: 104 wide, up to 4 lines (about 84 high), 8 beyond the disc. */
const LAB = { gap: 36, w: 104, h: 42 };
/** Smallest distance from the road's edge to a label box beside stage n on side "l" or "r" (negative when it touches the road). */
export function labelClearance(n: number, side: "l" | "r"): number {
  const { x, y } = nodes[n - 1]!;
  const x0 = side === "r" ? x + LAB.gap : x - LAB.gap - LAB.w, x1 = x0 + LAB.w;
  let best = Infinity;
  for (const q of road().p) {
    if (Math.abs(q.y - y) > LAB.h + 60) continue;
    const dx = Math.max(x0 - q.x, 0, q.x - x1), dy = Math.max(y - LAB.h - q.y, 0, q.y - (y + LAB.h));
    best = Math.min(best, Math.hypot(dx, dy) - 25); // 25 = half the road's edge width
  }
  return best;
}
/** Side of the node for its label, away from the road's curve: the outer side, unless the road bends there. */
export function labelSide(n: number): "l" | "r" {
  const outer = nodes[n - 1]!.x >= CX ? "r" : "l";
  const inner = outer === "r" ? "l" : "r";
  return labelClearance(n, outer) >= 4 || labelClearance(n, outer) >= labelClearance(n, inner) ? outer : inner;
}
