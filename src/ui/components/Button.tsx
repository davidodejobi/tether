import type { ComponentChildren } from "preact";
import { cue } from "../../platform/sound.ts";
import { Icon, type IconName } from "./Icon";
import "./Button.css";

type Props = {
  variant?: "primary" | "secondary" | "tertiary";
  icon?: IconName;
  disabled?: boolean;
  /** No tap cue: the action plays its own outcome cue (Check). */
  silent?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  children: ComponentChildren;
};

export function Button({ variant = "primary", icon, disabled, silent, type = "button", onClick, children }: Props) {
  return (
    <button class={`btn btn-${variant}`} type={type} disabled={disabled} onClick={() => (silent || cue("tap"), onClick?.())}>
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  );
}
