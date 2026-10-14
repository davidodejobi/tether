// Decorative art for Home's journey trail, generated from code (no image files) and loaded lazily after first paint.
// Style from the planning map: Naija Green by day, Adire Night by night; village and market, river and savanna with baobabs,
// Zuma Rock and a city skyline, then the JAMB Day hall. Colours are CSS variables (--map-*) defined in map.css,
// so the theme switches with no script. Still art lives in `ground` and `tiles`; everything that moves is `ambient`,
// small separate elements so only they animate (transforms and opacity only).
import { H, W, hall, nodes, regions, roadX } from "./trail.ts";

const f = (c: string) => `style="fill:var(--map-${c})"`;
const st = (c: string, w: number) => `fill="none" style="stroke:var(--map-${c})" stroke-width="${w}" stroke-linecap="round"`;

// Small seeded generator so the scenery is the same on every device.
let seed = 20261014;
const rnd = () => ((seed = (seed + 0x6d2b79f5) | 0), ((Math.imul(seed ^ (seed >>> 15), 1 | seed) + 0x1b873593) >>> 0) / 4294967296);
const between = (a: number, b: number) => a + rnd() * (b - a);

const leafFan = [[-58, -58, -22], [-46, -104, -14], [-4, -128, -10], [40, -108, -14], [60, -60, -22], [-30, -46, -14], [34, -48, -14]];
// Pieces drawn once in <defs> and placed with <use>; each has its base at (0,0).
const DEFS = `
<g id="m-palm"><path d="M0 0C4-30-2-60 6-88" ${st("trunk", 7)}/>${leafFan.map(([dx, dy, b], i) => { const mx = (6 + dx!) / 2, my = (-88 + dy!) / 2; return `<path d="M6-88Q${mx} ${my + b!} ${dx} ${dy}Q${mx + 3} ${my + b! + 10} 6-84Z" ${f(i % 2 ? "leaf1" : "leaf2")}/>`; }).join("")}<circle cx="2" cy="-86" r="4" ${f("trunk")}/><circle cx="9" cy="-84" r="4" ${f("trunk")}/></g>
<g id="m-hut"><ellipse cx="0" cy="2" rx="26" ry="6" style="fill:#000" opacity=".12"/><path d="M-22-30V0Q0 6 22 0V-30Z" ${f("mud")}/><path d="M-6 0V-16Q0-22 6-16V0Z" ${f("mudDark")}/><path d="M-32-28Q0-70 32-28Q0-20-32-28Z" ${f("roof")}/><path d="M-20-34L-4-60M0-32L2-62M20-34L6-60" ${st("roofDark", 2)}/><path d="M-32-28Q0-20 32-28" ${st("roofDark", 3)}/></g>
<g id="m-baobab"><ellipse cx="0" cy="4" rx="40" ry="8" style="fill:#000" opacity=".12"/><path d="M-16 2C-20-30-14-60-10-74H10C14-60 20-30 16 2Z" ${f("trunk")}/><path d="M-10-72L-30-96M-4-74L-10-104M4-74L12-106M10-72L32-94" ${st("trunk", 6)}/>${[[-32, -100, 16], [-10, -110, 15], [14, -112, 16], [34, -98, 15], [2, -96, 14]].map(([cx, cy, r], i) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${f(i % 2 ? "leaf1" : "leaf2")}/>`).join("")}<path d="M-6-60C-4-40-6-20-4 0" ${st("trunkHi", 2)} opacity=".6"/></g>
<g id="m-acacia"><path d="M0 0C-2-20 2-30 0-44" ${st("trunk", 4)}/><ellipse cx="0" cy="-48" rx="36" ry="10" ${f("leaf2")}/><ellipse cx="-8" cy="-52" rx="26" ry="7" ${f("leaf1")}/></g>
<g id="m-bush"><circle cx="-12" cy="-8" r="12" ${f("leaf2")}/><circle cx="4" cy="-14" r="15" ${f("leaf1")}/><circle cx="18" cy="-6" r="10" ${f("leaf2")}/><circle cx="8" cy="-18" r="4" ${f("flower")}/><circle cx="-10" cy="-14" r="3" ${f("flower")}/></g>
<g id="m-rock"><path d="M-18 0Q-16-18 0-20Q18-18 20 0Z" ${f("rock")}/><path d="M-10-12Q0-18 8-14" ${st("cloud", 3)} opacity=".4"/></g>
<g id="m-stall"><ellipse cx="0" cy="2" rx="30" ry="5" style="fill:#000" opacity=".12"/><path d="M0-44V0" ${st("trunk", 3)}/><rect x="-26" y="-18" width="52" height="16" rx="3" ${f("wood")}/>${[[-18, "#E53935"], [-8, "#FB8C00"], [2, "#E53935"], [12, "#43A047"], [20, "#FDD835"]].map(([cx, c]) => `<circle cx="${cx}" cy="-21" r="5" style="fill:${c}"/>`).join("")}</g>
<g id="m-pole"><path d="M0 0V-46" ${st("trunk", 3)}/><circle cx="0" cy="-47" r="3" ${f("crown")}/></g>
<g id="m-canoe"><path d="M-26 0Q0 12 26 0L22-4H-22Z" ${f("wood")}/><path d="M-2-4L6-22" ${st("trunk", 2.5)}/></g>
<g id="m-reed"><path d="M0 0l-4-18M0 0l1-22M0 0l5-16" ${st("leaf2", 2)}/></g>
<g id="m-tower"><rect x="-16" y="-80" width="32" height="80" ${f("bld1")}/><path d="M-12-70h6M2-70h6M-12-54h6M2-54h6M-12-38h6M2-38h6" ${st("win", 4)}/></g>
<g id="m-block"><rect x="-22" y="-52" width="44" height="52" ${f("bld2")}/><path d="M-14-42h8M2-42h8M-14-28h8M2-28h8M-14-14h8M2-14h8" ${st("win", 4)}/></g>
<g id="m-zuma"><path d="M-120 0C-116-60-96-150-52-220C-30-262 0-280 24-262C60-236 100-120 118 0Z" ${f("zuma")}/><path d="M-70-120C-40-96-30-60-44 0M-20-190C0-160 6-110-4-50M40-210C56-170 70-120 64-60M-100-60C-80-40-70-20-78 0" ${st("zumaLine", 5)} opacity=".55"/><path d="M-30 0C-20-26-14-40-10-60" ${st("zumaLine", 4)} opacity=".4"/></g>`;

let zumaBox: { x: number; y: number } | null = null;
/** True if a point at (x, y) would sit under a stage disc, its label, a region banner or the road itself. */
function blocked(x: number, y: number): boolean {
  if (zumaBox && x > zumaBox.x - 110 && x < zumaBox.x + 110 && y > zumaBox.y - 230 && y < zumaBox.y + 20) return true;
  if (Math.abs(x - roadX(y)) < 100) return true;
  for (const n of nodes) if (Math.abs(x - n.x) < 105 && y > n.y - 70 && y < n.y + 100) return true;
  for (const r of regions) if (Math.abs(y - r.bannerY) < 60 && Math.abs(x - W / 2) < 230) return true;
  return false;
}

interface Item { id: string; x: number; y: number; k: number }
/** Scatter `count` items between y0 and y1 on both sides of the road, never under a node, label or banner. */
function scatter(ids: string[], y0: number, y1: number, count: number, scale: [number, number], near = 250): Item[] {
  const out: Item[] = [];
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const y = between(y0, y1);
    const x = roadX(y) + (rnd() < 0.5 ? -1 : 1) * (100 + Math.pow(rnd(), 1.4) * near);
    if (x < 8 || x > W - 8 || blocked(x, y)) continue;
    if (out.some((o) => Math.abs(o.x - x) < 46 && Math.abs(o.y - y) < 26)) continue;
    out.push({ id: ids[Math.floor(rnd() * ids.length)]!, x, y, k: between(...scale) });
  }
  return out.sort((a, b) => a.y - b.y); // far items first so near ones overlap them
}
const use = (i: Item) => `<use href="#${i.id}" transform="translate(${i.x.toFixed(0)} ${i.y.toFixed(0)}) scale(${i.k.toFixed(2)})"/>`;

const wave = (y: number, amp: number, phase: number) => {
  let d = `M-20 ${y}`;
  for (let x = 0; x <= W + 40; x += 60) d += `Q${x + 15} ${y + amp * Math.sin(phase + x / 90)} ${x + 30} ${y}`;
  return d;
};

export interface Art { ground: string; tiles: string[]; ambient: string }

export function buildArt(): Art {
  seed = 20261014;
  const [village, river, city] = regions as [typeof regions[0], typeof regions[0], typeof regions[0]];
  const yOf = (n: number) => nodes[n - 1]!.y;
  const b12 = river.bannerY, b23 = city.bannerY;
  const bottom = H, riverY = (yOf(37) + yOf(38)) / 2;

  const ground = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false">
<defs><linearGradient id="m-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--map-sky1)"/><stop offset="1" style="stop-color:var(--map-sky2)"/></linearGradient>${DEFS}</defs>
<rect width="${W}" height="${H}" ${f("land1")}/>
<rect width="${W}" height="440" fill="url(#m-sky)"/>
<g class="m-stars" style="opacity:var(--map-stars)">${Array.from({ length: 46 }, () => `<circle cx="${between(10, W - 10).toFixed(0)}" cy="${between(8, 250).toFixed(0)}" r="${between(0.8, 2).toFixed(1)}" style="fill:#fff"/>`).join("")}</g>
<circle cx="${W / 2 + 190}" cy="110" r="40" ${f("sun")}/>
<path d="M0 410Q120 340 260 385T520 372T${W} 395V620H0Z" ${f("hill")}/>
${band(b23, b12, "sav1", 0.4)}
${band(400, b23, "city1", 1.4)}
${band(b12, bottom, "land1", 2.3)}
${Array.from({ length: 70 }, () => `<ellipse cx="${between(0, W).toFixed(0)}" cy="${between(560, H - 40).toFixed(0)}" rx="${between(26, 70).toFixed(0)}" ry="${between(6, 14).toFixed(0)}" ${f("land2")} opacity=".5"/>`).join("")}
<path d="M-20 ${riverY}C200 ${riverY - 60} 480 ${riverY + 60} ${W + 20} ${riverY - 10}" ${st("water2", 74)}/>
<path d="M-20 ${riverY}C200 ${riverY - 60} 480 ${riverY + 60} ${W + 20} ${riverY - 10}" ${st("water1", 58)}/>
<path d="M30 ${riverY - 10}h30M300 ${riverY + 8}h36M560 ${riverY + 26}h30" ${st("cloud", 3)} opacity=".6"/>
</svg>`;

  const zn0 = nodes.slice(43, 48).reduce((m, n) => (n.x > m.x ? n : m));
  zumaBox = { x: zn0.x - 175, y: zn0.y + 70 };
  const scene: Item[] = [
    ...scatter(["m-palm", "m-hut", "m-bush", "m-stall", "m-hut", "m-rock", "m-palm"], b12 + 30, village.bannerY - 50, 140, [0.9, 1.2]),
    ...scatter(["m-palm", "m-hut", "m-bush", "m-stall", "m-hut"], village.bannerY + 60, bottom - 10, 12, [0.9, 1.2]),
    ...scatter(["m-baobab", "m-acacia", "m-bush", "m-rock", "m-acacia"], b23 + 40, riverY - 70, 22, [0.95, 1.25]),
    ...scatter(["m-baobab", "m-acacia", "m-bush", "m-reed", "m-acacia"], riverY + 70, b12 - 30, 18, [0.95, 1.25]),
    ...scatter(["m-reed", "m-reed", "m-bush"], riverY - 50, riverY + 60, 8, [1, 1.4], 90),
    ...scatter(["m-tower", "m-block", "m-tower", "m-block", "m-palm", "m-bush"], hall.y + 110, b23 - 30, 46, [0.9, 1.5]),
  ];
  // Zuma Rock stands beside the road where it swings furthest right, so the rock stays in view on a phone.
  const zn = nodes.slice(43, 48).reduce((m, n) => (n.x > m.x ? n : m));
  const zuma = { x: zn.x - 175, y: zn.y + 70, k: 0.75 };
  const zumaY = zuma.y;
  const zumaUse = `<use href="#m-zuma" transform="translate(${zuma.x} ${zuma.y}) scale(${zuma.k})"/>`;
  const canoes = [[W / 2 - 150, riverY + 6], [W / 2 + 170, riverY + 22]].map(([x, y]) => `<use href="#m-canoe" transform="translate(${x} ${y})"/>`).join("");
  const poles = scatter(["m-pole"], village.bannerY + 100, bottom - 200, 5, [1, 1], 150);

  // The JAMB Day hall: decorative, never a working exam.
  const jamb = `<g transform="translate(${hall.x} ${hall.y}) scale(1.5)"><ellipse cx="0" cy="56" rx="96" ry="12" style="fill:#000" opacity=".15"/>
<rect x="-80" y="-4" width="160" height="60" rx="6" ${f("hall")}/><path d="M-92-4L0-52L92-4Z" ${f("hallRoof")}/><path d="M-60-10L0-40L60-10Z" ${f("hallRoofHi")}/>
${[-62, -36, -10, 16, 42].map((px) => `<rect x="${px}" y="4" width="16" height="52" rx="3" ${f("hallPillar")}/>`).join("")}
<path d="M-16 56V34Q0 16 16 34V56Z" ${f("hallDoor")}/><path d="M70-4V-70" ${st("trunk", 3)}/>
<g transform="translate(0 -78)"><path d="M-22 10L-26-12L-12 0L0-16L12 0L26-12L22 10Z" ${f("crown")} style="stroke:var(--map-crownEdge);stroke-width:3;stroke-linejoin:round;fill:var(--map-crown)"/><circle cx="0" cy="-16" r="4" ${f("accent2")}/></g>
<rect x="-46" y="-30" width="92" height="22" rx="11" ${f("bossBanner")}/><text x="0" y="-14.5" text-anchor="middle" font-family="inherit" font-weight="800" font-size="13" letter-spacing="1" ${f("bossText")}>JAMB DAY</text></g>`;

  // Cut the scenery into tiles so each is a modest SVG.
  const TILES = 6, per = H / TILES;
  const all = scene.map((i, idx) => ({ y: i.y, s: use(i), idx }));
  const tiles = Array.from({ length: TILES }, (_, t) => {
    const body = all.filter((a) => a.y >= t * per && a.y < (t + 1) * per).map((a) => a.s).join("");
    const extra = t === 0 ? jamb : "";
    const zumaHere = zumaY >= t * per && zumaY < (t + 1) * per ? zumaUse : "";
    const water = riverY >= t * per && riverY < (t + 1) * per ? canoes : "";
    const stakes = poles.filter((p) => p.y >= t * per && p.y < (t + 1) * per).map(use).join("");
    return `<svg style="top:${t * per}px" viewBox="0 ${t * per} ${W} ${per}" width="${W}" height="${per}" aria-hidden="true" focusable="false">${zumaHere}${extra}${water}${body}${stakes}</svg>`;
  });

  // Ambient: clouds, birds, waving flags and swaying market umbrellas. Each is one small element.
  const A: string[] = [];
  const amb = (cls: string, x: number, y: number, svg: string, d = rnd() * -20) => A.push(`<span class="amb ${cls}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;--d:${d.toFixed(1)}s">${svg}</span>`);
  for (let y = 60; y < H - 300; y += between(520, 760)) {
    const x = between(10, W - 130), k = between(0.8, 1.5);
    amb("cloud", x, y, `<svg width="${(90 * k).toFixed(0)}" height="${(40 * k).toFixed(0)}" viewBox="0 0 90 40" aria-hidden="true"><g ${f("cloud")}><ellipse cx="30" cy="26" rx="26" ry="12"/><ellipse cx="52" cy="20" rx="24" ry="14"/><ellipse cx="68" cy="28" rx="18" ry="10"/></g></svg>`, -between(0, 60));
  }
  for (let i = 0; i < 9; i++) {
    const y = between(120, H - 400);
    amb("bird", between(20, W - 60), y, `<svg width="26" height="14" viewBox="0 0 26 14" aria-hidden="true"><path d="M1 9Q7 0 13 8Q19 0 25 9" ${st("birdc", 2.2)}/></svg>`, -between(0, 14));
  }
  amb("flag", hall.x + 105 - 2, hall.y - 105 - 2, `<svg width="32" height="22" viewBox="0 0 30 20" aria-hidden="true"><path d="M0 0H30V16H0Z" style="fill:#008751"/><path d="M10 0H20V16H10Z" style="fill:#fff"/></svg>`, -0.4);
  for (const p of poles) {
    amb("flag", p.x + 1, p.y - 46, `<svg width="26" height="18" viewBox="0 0 30 20" aria-hidden="true"><path d="M0 0H30V16H0Z" style="fill:#008751"/><path d="M10 0H20V16H10Z" style="fill:#fff"/></svg>`);
  }
  for (const s of scene.filter((i) => i.id === "m-stall").slice(0, 12)) {
    const k = s.k;
    amb("umbrella", s.x - 34 * k, s.y - 66 * k, `<svg width="${(68 * k).toFixed(0)}" height="${(26 * k).toFixed(0)}" viewBox="0 0 68 26" aria-hidden="true"><path d="M0 26Q34-10 68 26Z" ${f(rnd() < 0.5 ? "accent2" : "accent1")}/><path d="M22 26Q34 0 46 26Z" ${f("accent1")} opacity=".7"/></svg>`);
  }
  return { ground, tiles, ambient: A.join("") };
}

/** A wavy-edged colour band between two heights, painted over the land. */
function band(y0: number, y1: number, color: string, phase: number): string {
  let d = wave(y0, 22, phase);
  d += `L${W + 40} ${y1}`;
  for (let x = W + 40; x > -20; x -= 60) d += `Q${x - 15} ${y1 + 22 * Math.sin(phase + 1.7 + x / 90)} ${x - 30} ${y1}`;
  return `<path d="${d}Z" ${f(color)}/>`;
}
