import "./Icon.css";

const urls = import.meta.glob<string>("../../assets/icons/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

export const ICON_NAMES = [
  "back", "calendar", "chat", "check", "chevron-right", "close", "eye-off", "globe",
  "lightbulb", "lock-open", "map", "play", "replay", "settings", "share", "sparkle",
  "speaker", "target", "tether", "timer", "warning", "wifi-off", "x",
] as const;
export type IconName = (typeof ICON_NAMES)[number];

type Props = { name: IconName; size?: number; label?: string };

// A mask lets the 24 px stroke icons take the surrounding text colour (currentColor).
export function Icon({ name, size = 24, label }: Props) {
  const url = `url("${urls[`../../assets/icons/${name}.svg`]}")`;
  return (
    <span
      class="icon"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
      style={`width:${size}px;height:${size}px;mask-image:${url};-webkit-mask-image:${url}`}
    />
  );
}
