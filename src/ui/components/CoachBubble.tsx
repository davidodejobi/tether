import type { ComponentChildren } from "preact";
import { Bo, type Pose } from "./Bo";
import { Icon } from "./Icon";
import "./CoachBubble.css";

type Props = {
  /** "text" keeps the same words in a quiet card without the character. */
  mode?: "character" | "text";
  pose?: Pose;
  unreviewed?: boolean;
  children: ComponentChildren;
};

export function CoachBubble({ mode = "character", pose = "idle", unreviewed, children }: Props) {
  return (
    <div class={`coach coach-${mode}`}>
      {mode === "character" ? <Bo pose={pose} size={48} /> : <Icon name="tether" size={24} />}
      <div class="coach-body">
        {unreviewed && <span class="coach-tag">Unreviewed</span>}
        <p>{children}</p>
      </div>
    </div>
  );
}
