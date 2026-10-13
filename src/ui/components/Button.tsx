import type { ComponentChildren } from "preact";
import { Icon, type IconName } from "./Icon";
import "./Button.css";

type Props = {
  variant?: "primary" | "secondary" | "tertiary";
  icon?: IconName;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  children: ComponentChildren;
};

export function Button({ variant = "primary", icon, disabled, type = "button", onClick, children }: Props) {
  return (
    <button class={`btn btn-${variant}`} type={type} disabled={disabled} onClick={onClick}>
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  );
}
