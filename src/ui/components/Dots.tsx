import "./Dots.css";

// Readiness: three dots plus a text count, so the state never rests on colour alone.
export function Dots({ filled }: { filled: 0 | 1 | 2 | 3 }) {
  return (
    <span class="dots" role="img" aria-label={`Readiness ${filled} of 3`}>
      {[0, 1, 2].map((i) => (
        <span key={i} class={i < filled ? "dot dot-on" : "dot"} />
      ))}
      <span class="dots-label" aria-hidden="true">Readiness {filled}/3</span>
    </span>
  );
}
