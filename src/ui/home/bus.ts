// The danfo bus: placed on the road from script, driven along it with the Web Animations API (transforms only).
import { along, at, heading, nodes, parkAt } from "./trail.ts";

const KEY = "tether.map.bus";
const BW = 30, BH = 56;

export const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The stop (0 = Start gate, else a stage number) the bus last rested at on this device. */
export function lastStop(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isInteger(v) && v >= 0 && v <= 50 ? v : 0;
  } catch {
    return 0;
  }
}
export function remember(stop: number) {
  try {
    localStorage.setItem(KEY, String(stop));
  } catch {}
}

/** transform that centres the bus on the road point (x, y), turned `a` degrees clockwise from facing up the screen. */
const pose = (x: number, y: number, a: number) => `translate(${(x - BW / 2).toFixed(1)}px,${(y - BH / 2).toFixed(1)}px) rotate(${a.toFixed(1)}deg)`;
export const parked = (stop: number) => {
  const d = parkAt(stop), p = at(d);
  return pose(p.x, p.y, heading(d));
};

/** Drive along the road between two stops, turning with it. */
export function drive(el: HTMLElement, from: number, to: number): Animation {
  const a = parkAt(from), b = parkAt(to);
  const stops = along(a, b);
  const frames = stops.map((p, i) => ({ transform: pose(p.x, p.y, p.a), offset: i / (stops.length - 1) }));
  el.dataset.driving = "";
  const anim = el.animate(frames, { duration: Math.min(3200, Math.max(1100, Math.abs(b - a) * 5)), easing: "cubic-bezier(.45,0,.35,1)" });
  const done = () => delete el.dataset.driving;
  anim.finished.then(done, done);
  return anim;
}

/** A small hop in place (the bus's inner wrapper), twice, like the Candy Crush marker. */
export function hop(el: HTMLElement): Animation {
  return el.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.16) rotate(-4deg)", offset: 0.35 }, { transform: "scale(1)", offset: 0.6 }, { transform: "scale(1.06)", offset: 0.8 }, { transform: "scale(1)" }],
    { duration: 520, easing: "ease-out" },
  );
}

/** Jump from its resting place (below stage `from`, default the stage itself) onto a stage's disc. */
export function hopTo(el: HTMLElement, stop: number, from = stop): Animation {
  const d = parkAt(from), p = at(d), n = nodes[stop - 1]!, h = heading(d);
  return el.animate(
    [{ transform: pose(p.x, p.y, h) }, { transform: pose((p.x + n.x) / 2, (p.y + n.y) / 2 - 14, h + 4), offset: 0.5 }, { transform: pose(n.x, n.y + 3, h) }],
    { duration: 420, easing: "ease-in-out", fill: "forwards" },
  );
}
