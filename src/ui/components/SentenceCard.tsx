import "./SentenceCard.css";

type Props = { before: string; after: string; filled?: string; correct?: boolean };

// The blank is the stage for tap-to-fill: empty slot, a chosen word, or the correct word.
export function SentenceCard({ before, after, filled, correct }: Props) {
  const state = correct ? "correct" : filled ? "filled" : "empty";
  return (
    <p class="sentence">
      {before}{" "}
      <span class={`blank blank-${state}`}>
        <span class="sr-only">{filled ? `blank, filled with ${filled}${correct ? ", correct" : ""}` : "blank, empty"}</span>
        <span aria-hidden="true">{filled ?? ""}</span>
      </span>{" "}
      {after}
    </p>
  );
}
