import type { ComponentChildren } from "preact";
import { useRef } from "preact/hooks";
import { useAutoSpeak, useCanSpeak } from "../../platform/speech.ts";
import { useProgressState } from "../progress";
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
  const progress = useProgressState();
  const learner = progress.status === "ready" ? progress.store.progress.learner : null;
  const canSpeak = useCanSpeak();
  const line = useRef<HTMLParagraphElement>(null);
  useAutoSpeak(line, learner?.lang ?? "en", learner?.readAloud === true && canSpeak);
  return (
    <div class={`coach coach-${mode}`}>
      {mode === "character" ? <Bo pose={pose} size={48} /> : <Icon name="tether" size={24} />}
      <div class="coach-body">
        {unreviewed && <span class="coach-tag">Unreviewed</span>}
        <p ref={line}>{children}</p>
      </div>
    </div>
  );
}
