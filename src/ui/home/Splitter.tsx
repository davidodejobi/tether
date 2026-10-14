import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

const KEY = "tether:panelWidth";
const DEFAULT = 368; // 23rem, the old fixed panel width
const MIN = 280;
const STEP = 16;
const bounds = (total: number) => ({ min: MIN, max: Math.max(MIN, Math.floor(total - Math.max(total * 0.45, 420))) });
const clamp = (w: number, total: number) => { const b = bounds(total); return Math.round(Math.min(b.max, Math.max(b.min, w))); };
const stored = () => { try { const n = Number(localStorage.getItem(KEY)); return n > 0 ? n : DEFAULT; } catch { return DEFAULT; } };
const save = (w: number) => { try { localStorage.setItem(KEY, String(w)); } catch { /* storage blocked: width lasts for this visit */ } };

/** Draggable divider between the Home info panel and the map. Sets --hm-panel-w on the Home grid (its parent). */
export function Splitter() {
  const ref = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(() => matchMedia("(min-width: 768px)").matches);
  const [w, setW] = useState(stored);
  const [total, setTotal] = useState(1200);
  const [drag, setDrag] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useLayoutEffect(() => {
    const grid = ref.current?.parentElement;
    if (!wide || !grid) return;
    const measure = () => setTotal(grid.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [wide]);
  const shown = clamp(w, total);
  useLayoutEffect(() => {
    const grid = ref.current?.parentElement;
    if (wide) grid?.style.setProperty("--hm-panel-w", `${shown}px`);
    return () => grid?.style.removeProperty("--hm-panel-w");
  }, [wide, shown]);
  if (!wide) return null;
  const { min, max } = bounds(total);
  const set = (n: number) => { const v = clamp(n, total); setW(v); save(v); };
  const reset = () => set(DEFAULT);
  return (
    <div
      ref={ref}
      class={`hm-split${drag ? " hm-split-on" : ""}`}
      style={{ left: `${shown}px` }}
      role="separator" aria-orientation="vertical" aria-label="Resize panel"
      aria-valuenow={shown} aria-valuemin={min} aria-valuemax={max} tabIndex={0}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); }}
      onPointerMove={(e) => { if (drag) { const g = e.currentTarget.parentElement!.getBoundingClientRect(); setW(clamp(e.clientX - g.left, total)); } }}
      onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); setDrag(false); set(w); }}
      onPointerCancel={() => { setDrag(false); set(w); }}
      onDblClick={reset}
      onKeyDown={(e) => {
        const next = e.key === "ArrowLeft" ? shown - STEP : e.key === "ArrowRight" ? shown + STEP : e.key === "Home" ? min : e.key === "End" ? max : null;
        if (e.key === "Enter") { e.preventDefault(); reset(); } else if (next !== null) { e.preventDefault(); set(next); }
      }}
    />
  );
}
