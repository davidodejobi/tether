// The danfo bus: placed on the road from script, driven along it with the Web Animations API (transforms only).
import { along, at, nodes, parkAt } from "./trail.ts";

const KEY = "tether.map.bus";
const BW = 64, BH = 38;

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

/** transform that puts the bus's wheels on the road point (x, y), flipped to face its way of travel. */
const pose = (x: number, y: number, dx = 1) => `translate(${(x - BW / 2).toFixed(1)}px,${(y - BH).toFixed(1)}px) scaleX(${dx < 0 ? -1 : 1})`;
export const parked = (stop: number) => {
  const p = at(parkAt(stop));
  return pose(p.x, p.y);
};

/** Drive along the road between two stops, bouncing a little on the way. */
export function drive(el: HTMLElement, from: number, to: number): Animation {
  const a = parkAt(from), b = parkAt(to);
  const stops = along(a, b);
  const frames = stops.map((p, i) => ({ transform: pose(p.x, p.y - (i % 2 ? 1.5 : 0), (b - a) * p.dx), offset: i / (stops.length - 1) }));
  el.dataset.driving = "";
  const anim = el.animate(frames, { duration: Math.min(3200, Math.max(1100, Math.abs(b - a) * 5)), easing: "cubic-bezier(.45,0,.35,1)" });
  const done = () => delete el.dataset.driving;
  anim.finished.then(done, done);
  return anim;
}

/** A small hop in place (the bus's inner wrapper), twice, like the Candy Crush marker. */
export function hop(el: HTMLElement): Animation {
  return el.animate(
    [{ transform: "translateY(0)" }, { transform: "translateY(-24px) rotate(-5deg)", offset: 0.35 }, { transform: "translateY(0)", offset: 0.6 }, { transform: "translateY(-8px)", offset: 0.8 }, { transform: "translateY(0)" }],
    { duration: 520, easing: "ease-out" },
  );
}

/** Jump from its resting place onto a stage's disc. */
export function hopTo(el: HTMLElement, stop: number): Animation {
  const p = at(parkAt(stop)), n = nodes[stop - 1]!;
  return el.animate(
    [{ transform: pose(p.x, p.y) }, { transform: pose((p.x + n.x) / 2, (p.y + n.y) / 2 - 34) , offset: 0.5 }, { transform: pose(n.x, n.y + 22) }],
    { duration: 420, easing: "ease-in-out", fill: "forwards" },
  );
}
