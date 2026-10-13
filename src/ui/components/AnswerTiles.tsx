import { useRef } from "preact/hooks";
import { Icon } from "./Icon";
import { targetTile } from "./answerKeys";
import "./AnswerTiles.css";

export type Tile = { label: string; struck?: boolean };
type Props = {
  tiles: Tile[];
  value: number | null;
  /** Index of the tile checked as correct; locks the group. */
  correct?: number | null;
  /** A save is running or waiting for Retry: tiles cannot be changed. */
  disabled?: boolean;
  onSelect: (index: number) => void;
};

const LETTERS = "ABCD";

// Single-choice radio group. Selecting only fills the blank; checking is a separate step.
export function AnswerTiles({ tiles, value, correct = null, disabled = false, onSelect }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const struck = tiles.map((t) => !!t.struck);
  const locked = correct !== null || disabled;
  const stop = value !== null && !struck[value] ? value : struck.findIndex((s) => !s);

  const pick = (i: number) => {
    onSelect(i);
    refs.current[i]?.focus();
  };

  return (
    <div
      class="tiles"
      role="radiogroup"
      aria-label="Choose the word for the blank"
      onKeyDown={(e) => {
        if (locked || e.altKey || e.ctrlKey || e.metaKey) return;
        const from = refs.current.findIndex((b) => b === document.activeElement);
        const to = targetTile(e.key, from < 0 ? (value ?? 0) : from, struck);
        if (to !== null) {
          e.preventDefault();
          pick(to);
        }
      }}
    >
      {tiles.map((t, i) => {
        const state = correct === i ? "correct" : t.struck ? "struck" : value === i ? "selected" : "idle";
        return (
          <button
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            class={`tile tile-${state}`}
            aria-checked={value === i}
            aria-disabled={t.struck || locked ? "true" : undefined}
            aria-label={`Option ${LETTERS[i]}: ${t.label}${t.struck ? ", wrong, struck out" : ""}${correct === i ? ", correct" : ""}`}
            tabIndex={i === stop ? 0 : -1}
            onClick={() => !t.struck && !locked && pick(i)}
          >
            <kbd class="tile-num" aria-hidden="true">{i + 1}</kbd>
            {state === "struck" && <Icon name="x" size={20} />}
            {state === "correct" && <Icon name="check" size={20} />}
            <span class="tile-word">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
