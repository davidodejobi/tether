import { Icon, type IconName } from "./Icon";
import "./Stamp.css";

export type StampState = "none" | "proved" | "held" | "fading";

// Each state differs by ring shape, icon and word, not colour alone.
const META: Record<StampState, { word: string; icon: IconName | null; say: string }> = {
  none: { word: "No stamp", icon: null, say: "No stamp yet" },
  proved: { word: "Proved", icon: "check", say: "Proved" },
  held: { word: "Held", icon: "check", say: "Held" },
  fading: { word: "Fading", icon: "calendar", say: "Fading, a recheck is needed" },
};

type Props = { state: StampState; due?: boolean; size?: number };

export function Stamp({ state, due, size = 96 }: Props) {
  const m = META[state];
  return (
    <span class="stamp-wrap" role="img" aria-label={`${m.say}${due ? ", due" : ""}`}>
      <span class={`stamp stamp-${state}`} style={`--stamp-size:${size}px`} aria-hidden="true">
        {m.icon && <Icon name={m.icon} size={size * 0.3} />}
        <span class="stamp-word">{m.word}</span>
      </span>
      {due && (
        <span class="stamp-due" aria-hidden="true">
          <Icon name="calendar" size={14} /> Due
        </span>
      )}
    </span>
  );
}
