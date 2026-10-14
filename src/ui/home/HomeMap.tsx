// Home's journey map (owner decision 14 Oct 2026): a long scrollable trail of all 50 English stages, game-style.
// Real HTML nodes sit over decorative art that loads after first paint. Only available stages are links; planned
// stages are Coming soon markers. A danfo bus drives to the current stage; reduced motion places it instead.
import { useLayoutEffect, useEffect, useRef, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { blueprint } from "../../content/blueprint.ts";
import type { Move } from "../../content/generate.ts";
import { moveNumber } from "../../content/moves.ts";
import { Bo } from "../components/Bo";
import { Icon, type IconName } from "../components/Icon";
import { withMove } from "../move.ts";
import type { NodeState } from "./view.ts";
import { drive, hop, hopTo, lastStop, parked, reduced, remember } from "./bus.ts";
import { CX, H, W, countLabel, gate, labelSide, nodes, regionOf, regions, roadD } from "./trail.ts";
import "../components/Button.css";
import "./map.css";

const WORD: Record<NodeState, string> = { current: "Current", proved: "Proved", held: "Held", fading: "Fading", available: "Available", locked: "Locked", soon: "Coming soon" };
const ICON: Record<NodeState, IconName> = { current: "target", proved: "check", held: "check", fading: "calendar", available: "play", locked: "lock", soon: "lock" };
type Status = { state: NodeState; due: boolean };

/** Every available stage is a link to its own practice; the focus move is the one the learner is on (Home picks it). */
export function HomeMap({ focus, states, coach }: { focus: Move; states: Record<string, Status>; coach: "character" | "text" }) {
  const CURRENT = moveNumber(focus);
  const hrefOf = (moveId: string) => withMove("/practice", moveId);
  const { route } = useLocation();
  const scroll = useRef<HTMLDivElement>(null);
  const bus = useRef<HTMLDivElement>(null);
  const busIn = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const amb = useRef<HTMLDivElement>(null);
  const here = useRef<HTMLLIElement>(null);
  const anim = useRef<Animation | null>(null);
  const scale = useRef(1);
  const [s, setS] = useState(1);
  const [list, setList] = useState(false);
  const [away, setAway] = useState(false);
  const cur = nodes[CURRENT - 1]!;

  // The stage is 720 design units wide; scale it to the column (never below 1, so labels stay readable).
  useLayoutEffect(() => {
    const el = scroll.current!;
    const fit = () => setS((scale.current = Math.min(1.5, Math.max(1, el.clientWidth / 360))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Resizing the panel changes the scale: keep whatever sat at the middle of the view (the current stage, usually) there.
  const shown = useRef(1);
  useLayoutEffect(() => {
    const el = scroll.current!;
    if (shown.current !== s) el.scrollTop = (el.scrollTop + el.clientHeight / 2) * (s / shown.current) - el.clientHeight / 2;
    shown.current = s;
  }, [s]);

  const centre = (smooth = false) => {
    const el = scroll.current;
    if (el) el.scrollTo({ top: Math.max(0, cur.y * scale.current - el.clientHeight / 2), behavior: smooth && !reduced() ? "smooth" : "auto" });
  };

  // On load (and on returning from the list), centre the current stage, then drive the bus there from where it last rested.
  useEffect(() => {
    if (list) return;
    const id = requestAnimationFrame(() => {
      centre();
      const el = bus.current;
      if (!el) return;
      const from = lastStop();
      remember(CURRENT);
      if (from !== CURRENT && !reduced()) {
        anim.current = drive(el, from, CURRENT);
        anim.current.finished.then(() => busIn.current && hop(busIn.current), () => {});
      }
    });
    return () => (cancelAnimationFrame(id), anim.current?.cancel());
  }, [list, CURRENT]);

  // "Jump to my stage" shows while the current stage is off screen.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setAway(!e!.isIntersecting), { root: scroll.current });
    io.observe(here.current!);
    return () => io.disconnect();
  }, [CURRENT]);

  // The art is generated in its own chunk, after first paint; the plain colour and the road show until then.
  useEffect(() => {
    let io: IntersectionObserver | undefined;
    const t = setTimeout(() => {
      void import("./mapArt.ts").then(({ buildArt }) => {
        if (!art.current || !amb.current) return;
        const a = buildArt();
        art.current.innerHTML = a.ground + a.tiles.join("");
        amb.current.innerHTML = a.ambient;
        // Items scrolled out of view stop animating.
        io = new IntersectionObserver((es) => es.forEach((e) => e.target.toggleAttribute("data-off", !e.isIntersecting)), { root: scroll.current, rootMargin: "120px" });
        amb.current.querySelectorAll(".amb").forEach((n) => io!.observe(n));
      }).catch(() => {});
    }, 0);
    return () => (clearTimeout(t), io?.disconnect());
  }, []);

  // Tapping an available stage: the bus hops onto it, then we go to its practice. The link works on its own without script.
  const go = (e: MouseEvent, stage: number, href: string) => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduced() || !bus.current) return;
    e.preventDefault();
    anim.current?.cancel();
    const a = hopTo(bus.current, stage, CURRENT);
    let gone = false;
    const leave = () => gone || ((gone = true), route(href));
    a.finished.then(leave, leave);
    setTimeout(leave, 700);
  };

  const label = (st: (typeof blueprint)[number], { state, due }: Status) => `Stage ${st.n}, Move ${st.n}: ${st.title}. ${WORD[state]}${due ? ", due" : ""}. Open practice.`;
  const towardsMiddle = cur.x > CX ? "l" : "r";

  return (
    <div class="hm-mapwrap" style={`--s:${s};--h:${H}`}>
      <h2 class="sr-only">Your journey</h2>
      <div class="hm-scroll" ref={scroll} role="region" aria-label="Journey map" tabIndex={0}>
        {list && <StageList states={states} hrefOf={hrefOf} />}
        <div class="hm-sizer" hidden={list}>
          <div class="hm-trail">
            <div class="hm-art" ref={art} aria-hidden="true" />
            <svg class="hm-road" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
              <path class="edge" d={roadD} /><path class="surf" d={roadD} /><path class="line" d={roadD} />
            </svg>
            <div class="hm-amb" ref={amb} aria-hidden="true" />
            <div class="hm-gate" aria-hidden="true" style={`top:${gate.y}px`}>START</div>
            {regions.map((r) => (
              <div key={r.id} class="hm-banner" style={`top:${r.bannerY - 30}px`}>
                <h3>{r.name}</h3>
                <p>{CURRENT >= r.first && CURRENT <= r.last ? countLabel(CURRENT) : `${r.last - r.first + 1} stages`}</p>
              </div>
            ))}
            <ol class="hm-nodes">
              {blueprint.map((st) => {
                const n = nodes[st.n - 1]!;
                const pos = `--x:${n.x};--y:${n.y}`;
                if (!st.moveId)
                  return (
                    <li key={st.id} class="hm-pos hm-soon" style={pos}>
                      <span class="sr-only">Stage {st.n}: {st.title}. Coming soon</span>
                      <span class="hm-node hm-soon" aria-hidden="true">
                        <span class="hm-disc">{st.n}</span>
                        <span class="hm-lock"><Icon name="lock" size={14} /></span>
                        <span class={`hm-lab hm-lab-${labelSide(st.n)}`}>{st.title}</span>
                      </span>
                    </li>
                  );
                const { state, due } = states[st.moveId]!;
                const href = hrefOf(st.moveId);
                if (state === "locked")
                  return (
                    <li key={st.id} class="hm-pos" style={pos}>
                      <span class="sr-only">Stage {st.n}, Move {st.n}: {st.title}. Locked. Pass Move {st.n - 1} first.</span>
                      <span class="hm-node hm-locked" aria-hidden="true">
                        <span class="hm-disc">{st.n}</span>
                        <span class="hm-lock"><Icon name="lock" size={14} /></span>
                        <span class={`hm-side-${n.x > CX ? "l" : "r"}`}>
                          <span class="hm-lab">{st.title}</span>
                          <span class="hm-tags"><span class="hm-tag"><Icon name="lock" size={16} /> Locked</span></span>
                        </span>
                      </span>
                    </li>
                  );
                return (
                  <li key={st.id} class="hm-pos" style={pos} ref={st.n === CURRENT ? here : undefined}>
                    <a class={`hm-node hm-${state}`} href={href} aria-label={label(st, { state, due })} onClick={(e) => go(e, st.n, href)}>
                      <span class="hm-disc" aria-hidden="true">{st.n}</span>
                      <span class={`hm-side-${nodes[st.n - 1]!.x > CX ? "l" : "r"}`} aria-hidden="true">
                        <span class="hm-lab">{st.title}</span>
                        <span class="hm-tags">
                          <span class="hm-tag"><Icon name={ICON[state]} size={16} /> {WORD[state]}</span>
                          {due && <span class="hm-tag hm-due"><Icon name="calendar" size={16} /> Due</span>}
                        </span>
                      </span>
                    </a>
                    {coach === "character" && st.n === CURRENT && <span class={`hm-bo hm-bo-${towardsMiddle === "l" ? "r" : "l"}`} aria-hidden="true"><Bo pose="wave" size={52} /></span>}
                  </li>
                );
              })}
            </ol>
            <div class="hm-bus" ref={bus} aria-hidden="true" style={`transform:${parked(CURRENT)}`} data-stop={CURRENT}>
              <div class="hm-bus-in" ref={busIn}><Danfo /></div>
            </div>
          </div>
        </div>
      </div>
      <button class="btn btn-secondary hm-ctl hm-ctl-list" type="button" onClick={() => setList(!list)}>{list ? <>Map<span class="hm-ctl-more"> view</span></> : <>List<span class="hm-ctl-more"> view</span></>}</button>
      {away && !list && <button class="btn btn-primary hm-ctl hm-ctl-jump" type="button" title="Jump to my stage" onClick={() => centre(true)}><Icon name="target" size={20} /><span class="hm-ctl-txt">Jump to my stage</span></button>}
    </div>
  );
}

/** Every stage as an ordered list, one list per region. The only place the 50 stages are plain text. */
function StageList({ states, hrefOf }: { states: Record<string, Status>; hrefOf(moveId: string): string }) {
  return (
    <div class="hm-listview">
      {regions.map((r) => (
        <section key={r.id}>
          <h3>{r.name}</h3>
          <p>{r.last - r.first + 1} stages</p>
          <ol start={r.first}>
            {blueprint.filter((st) => regionOf(st.n) === r).map((st) => (
              <li key={st.id}>
                {st.moveId && states[st.moveId]!.state === "locked"
                  ? <>Stage {st.n}, Move {st.n}: {st.title}. Locked.</>
                  : st.moveId
                  ? <a href={hrefOf(st.moveId)}>Stage {st.n}, Move {st.n}: {st.title}. {WORD[states[st.moveId]!.state]}{states[st.moveId]!.due ? ", due" : ""}.</a>
                  : <>Stage {st.n}: {st.title}. Coming soon.</>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** A small yellow danfo minibus seen from above, nose up; the map turns it to follow the road. */
function Danfo() {
  return (
    <svg width="30" height="56" viewBox="0 0 30 56" aria-hidden="true" focusable="false">
      <rect x="1" y="4" width="28" height="54" rx="9" fill="#000" opacity=".18" />
      {[10, 42].map((y) => [0, 26].map((x) => <rect key={`${x}${y}`} x={x} y={y} width="4" height="10" rx="1.5" fill="#1B1D26" />))}
      <rect x="-1" y="21" width="3" height="4" rx="1.5" fill="#FFC107" stroke="#1B1D26" stroke-width=".8" />
      <rect x="28" y="21" width="3" height="4" rx="1.5" fill="#FFC107" stroke="#1B1D26" stroke-width=".8" />
      <rect x="2" y="1" width="26" height="52" rx="8" fill="#FFC107" />
      <rect x="4.5" y="27" width="21" height="2.4" fill="#1B1D26" />
      <rect x="4.5" y="33" width="21" height="1.2" fill="#1B1D26" />
      <path d="M6 14Q15 9 24 14L25 21H5Z" fill="#BFE6FF" />
      <rect x="7" y="45" width="16" height="4" rx="1.5" fill="#BFE6FF" />
      <rect x="6" y="22.5" width="18" height="21" rx="4" fill="#FFD54F" />
      <rect x="8" y="24.5" width="9" height="6" rx="3" fill="#fff" opacity=".35" />
      <circle cx="6" cy="3.6" r="1.8" fill="#FFF3C4" />
      <circle cx="24" cy="3.6" r="1.8" fill="#FFF3C4" />
      <rect x="6" y="51" width="3" height="1.6" rx=".8" fill="#E53935" />
      <rect x="21" y="51" width="3" height="1.6" rx=".8" fill="#E53935" />
    </svg>
  );
}
