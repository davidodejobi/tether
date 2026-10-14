// Home's journey map: accessible HTML nodes over decorative art, shown three at a time with Previous/Next (spec section 10).
// A list view holds every node, so the screen works with no art. Only Move 1 works; later moves and exam day are Coming soon.
import { useEffect, useRef, useState } from "preact/hooks";
import { Icon, type IconName } from "../components/Icon";
import type { NodeState } from "./view.ts";
import "./map.css";

// Lazy, so the art is fetched only when Home shows (never during the first lesson), and only the active theme's file.
const art = import.meta.glob<string>("../../assets/map/*.svg", { query: "?url", import: "default" });

/** Three node slots per page, in the art box's 360 x 400 space. The art is decorative and only cropped to fit. */
const SLOTS = [
  { x: 96, y: 320 },
  { x: 262, y: 200 },
  { x: 104, y: 80 },
];
const W = 360;
const H = 400;
/** Moves 1 to 5, then exam day, three to a page: bounded pages, not a long trail. */
const ITEMS = ["Move 1", "Move 2", "Move 3", "Move 4", "Move 5", "Exam day"];
const PAGES = ITEMS.length / SLOTS.length;

const WORD: Record<NodeState, string> = { current: "Current", proved: "Proved", held: "Held", fading: "Fading", soon: "Coming soon" };
const ICON: Record<NodeState, IconName> = { current: "target", proved: "check", held: "check", fading: "calendar", soon: "lock-open" };

const at = (p: { x: number; y: number }) => `left:${(p.x / W) * 100}%;top:${(p.y / H) * 100}%`;

export function HomeMap({ state, due }: { state: NodeState; due: boolean }) {
  const canvas = useRef<HTMLOListElement>(null);
  const [page, setPage] = useState(0);

  // Art arrives after first paint; each theme's file is fetched only if its CSS rule applies.
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    for (const [path, load] of Object.entries(art)) void load().then((url) => c.style.setProperty(path.includes("night") ? "--art-night" : "--art-day", `url("${url}")`));
  }, []);

  const shown = ITEMS.slice(page * SLOTS.length, (page + 1) * SLOTS.length);
  return (
    <section class="hm-map" aria-labelledby="hm-map-h">
      <h2 id="hm-map-h" class="hm-map-h">Your journey</h2>
      <div class="hm-box" role="region" aria-label="Journey map">
        <ol class="hm-canvas" ref={canvas} data-page={page}>
          {shown.map((name, i) => {
            const n = page * SLOTS.length + i;
            const exam = n === ITEMS.length - 1;
            return (
              <li key={name} class="hm-pos" style={at(SLOTS[i]!)}>
                {n === 0 ? (
                  <a class={`hm-node hm-${state}`} href="/practice" aria-label={`Move 1: Strip the Disguise. ${WORD[state]}${due ? ", due" : ""}. Open practice.`}>
                    <span class="hm-disc" aria-hidden="true">1</span>
                    <Tags state={state} due={due} />
                  </a>
                ) : (
                  <div class={`hm-node hm-soon${exam ? " hm-exam" : ""}`}>
                    {!exam && <span class="hm-disc" aria-hidden="true">{n + 1}</span>}
                    <span class="sr-only">{name}.</span>
                    {exam && <span class="hm-label" aria-hidden="true">Exam day</span>}
                    <Tags state="soon" due={false} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <div class="hm-pager">
        <button class="btn btn-secondary" type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
        <p class="hm-page" role="status">Page {page + 1} of {PAGES}</p>
        <button class="btn btn-secondary" type="button" disabled={page === PAGES - 1} onClick={() => setPage(page + 1)}>Next</button>
      </div>
      <details class="hm-list">
        <summary>List view</summary>
        <ol>
          <li><a href="/practice">Move 1: Strip the Disguise. {WORD[state]}{due ? ", due" : ""}.</a></li>
          {ITEMS.slice(1).map((name) => <li key={name}>{name}. Coming soon.</li>)}
        </ol>
      </details>
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
