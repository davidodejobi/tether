import { Icon } from "./Icon";
import "./Dots.css";

// Readiness: three dots plus a text count, so the state never rests on colour alone.
// `hero` is the large Solo-ready version: checked dots, and a ring burst when the third one is filled.
export function Dots({ filled, hero }: { filled: 0 | 1 | 2 | 3; hero?: boolean }) {
  return (
    <span class={hero ? "dots dots-hero" : "dots"} role="img" aria-label={`Readiness ${filled} of 3`}>
      {[0, 1, 2].map((i) => (
        <span key={i} class={i < filled ? "dot dot-on" : "dot"}>
          {hero && i < filled && <Icon name="check" size={24} />}
          {hero && i === 2 && filled === 3 && <span class="dot-ring" />}
        </span>
      ))}
      <span class="dots-label" aria-hidden="true"><span class="dots-word">Readiness </span>{filled}/3</span>
    </span>
  );
}
