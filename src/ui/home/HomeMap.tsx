// Home's journey map: accessible HTML nodes over decorative art (spec section 10). The nodes are a plain ordered
// list, so the screen works with no art. Only Move 1 works; later moves and exam day are labelled Coming soon.
import { useEffect, useRef } from "preact/hooks";
import { Icon, type IconName } from "../components/Icon";
import type { NodeState } from "./view.ts";
import "./map.css";

// Lazy, so the art is fetched only when Home shows (never during the first lesson), and only the active theme's file.
const art = import.meta.glob<string>("../../assets/map/*.svg", { query: "?url", import: "default" });

/** Node centres in the art's 360 x 1100 space (design/map/map-svg.js). */
const NODES = [
  { x: 96, y: 1010 },
  { x: 262, y: 880 },
  { x: 104, y: 742 },
  { x: 258, y: 596 },
  { x: 98, y: 448 },
];
const EXAM = { x: 184, y: 170 };
const W = 360;
const H = 1100;

const WORD: Record<NodeState, string> = { current: "Current", proved: "Proved", held: "Held", fading: "Fading", soon: "Coming soon" };
const ICON: Record<NodeState, IconName> = { current: "target", proved: "check", held: "check", fading: "calendar", soon: "lock-open" };

const at = (p: { x: number; y: number }) => `left:${(p.x / W) * 100}%;top:${(p.y / H) * 100}%`;

export function HomeMap({ state, due }: { state: NodeState; due: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLOListElement>(null);

  // Start centred on Move 1.
  useEffect(() => {
    const s = scroller.current;
    const c = canvas.current;
    if (s && c) s.scrollTop = (NODES[0]!.y / H) * c.offsetHeight - s.clientHeight / 2;
  }, []);

  // Art arrives after first paint; each theme's file is fetched only if its CSS rule applies.
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    for (const [path, load] of Object.entries(art)) void load().then((url) => c.style.setProperty(path.includes("night") ? "--art-night" : "--art-day", `url("${url}")`));
  }, []);

  return (
    <section class="hm-map" aria-labelledby="hm-map-h">
      <h2 id="hm-map-h" class="hm-map-h">Your journey</h2>
      <div class="hm-scroll" ref={scroller} tabIndex={0} role="region" aria-label="Journey map, scrollable">
        <ol class="hm-canvas" ref={canvas}>
          {NODES.map((p, i) => (
            <li key={i} class="hm-pos" style={at(p)}>
              {i === 0 ? (
                <a class={`hm-node hm-${state}`} href="/practice" aria-label={`Move 1: Strip the Disguise. ${WORD[state]}${due ? ", due" : ""}. Open practice.`}>
                  <span class="hm-disc" aria-hidden="true">1</span>
                  <Tags state={state} due={due} />
                </a>
              ) : (
                <div class="hm-node hm-soon">
                  <span class="hm-disc" aria-hidden="true">{i + 1}</span>
                  <span class="sr-only">Move {i + 1}.</span>
                  <Tags state="soon" due={false} />
                </div>
              )}
            </li>
          ))}
          <li class="hm-pos" style={at(EXAM)}>
            <div class="hm-node hm-soon hm-exam">
              <span class="sr-only">Exam day.</span>
              <Tags state="soon" due={false} />
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}

function Tags({ state, due }: { state: NodeState; due: boolean }) {
  return (
    <span class="hm-tags">
      <span class="hm-tag"><Icon name={ICON[state]} size={16} /> {WORD[state]}</span>
      {due && <span class="hm-tag hm-due"><Icon name="calendar" size={16} /> Due</span>}
    </span>
  );
}
