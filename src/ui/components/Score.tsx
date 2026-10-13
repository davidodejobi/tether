import { Icon } from "./Icon";
import "./Score.css";

type Props = {
  kind: "help" | "alone";
  /** 0 to total, or null when it does not exist yet. */
  value: number | null;
  /** Out of how many; 10 for solo and practice, 5 for a recheck. */
  total?: number;
  /** Replaces the heading ("Alone"). */
  label?: string;
  /** Replaces the alone note, e.g. for a recheck. */
  note?: string;
};

// "With help" is the latest-ten practice score; "Alone" is the latest solo score (spec 5 and 8).
export function Score({ kind, value, total = 10, label: labelOverride, note: noteOverride }: Props) {
  const help = kind === "help";
  const label = labelOverride ?? (help ? "With help" : "Alone");
  const note = noteOverride ?? (help
    ? value === null
      ? "Answer ten practice questions to see this."
      : "Your last 10 practice questions. Hints were available."
    : value === null
      ? "Take your first solo check."
      : "Your latest solo check. No help.");
  return (
    <div class={`score score-${kind}`} role="group" aria-label={`${label} score`}>
      <div class="score-head">
        <Icon name={help ? "lightbulb" : "eye-off"} size={20} />
        <span>{label}</span>
      </div>
      <div class="score-value" aria-label={value === null ? "not yet" : `${value} out of ${total}`}>
        {value === null ? <span aria-hidden="true">Not yet</span> : <><strong>{value}</strong><span aria-hidden="true">/{total}</span></>}
      </div>
      <p class="score-note">{note}</p>
    </div>
  );
}
