import "./Bo.css";

const urls = import.meta.glob<string>("../../assets/bo/*.svg", { eager: true, query: "?url", import: "default" });

export type Pose = "idle" | "thinking" | "nudge" | "pleased" | "concerned" | "wave";

type Props = { pose?: Pose; size?: number; label?: string };

// Bo is decorative unless given a label. Never render Bo in solo, recheck or gap cards (docs/spec.md section 14).
export function Bo({ pose = "idle", size = 96, label }: Props) {
  return (
    <img
      class={`bo bo-${pose}`}
      src={urls[`../../assets/bo/bo-${pose}.svg`]}
      width={size}
      height={size}
      alt={label ?? ""}
      aria-hidden={label ? undefined : "true"}
    />
  );
}
