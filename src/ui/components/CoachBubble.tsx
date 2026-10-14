import type { ComponentChildren } from "preact";
import { useRef } from "preact/hooks";
import { useAutoSpeak, useCanSpeak, useVoiceNote } from "../../platform/speech.ts";
import { useProgressState } from "../progress";
import { Bo, type Pose } from "./Bo";
import { Icon } from "./Icon";
import "./CoachBubble.css";

type Props = {
  /** "text" keeps the same words in a quiet card without the character. */
  mode?: "character" | "text";
  pose?: Pose;
  /** False when the screen speaks its own lines instead (Show me reads its captions): one speech owner per screen. */
  speaks?: boolean;
  children: ComponentChildren;
};

export function CoachBubble({ mode = "character", pose = "idle", speaks = true, children }: Props) {
  const progress = useProgressState();
  const learner = progress.status === "ready" ? progress.store.progress.learner : null;
  const canSpeak = useCanSpeak();
  const line = useRef<HTMLParagraphElement>(null);
  const on = learner?.readAloud === true && canSpeak;
  useAutoSpeak(line, learner?.lang ?? "en", on && speaks);
  const voiceNote = useVoiceNote(learner?.lang ?? "en"); // Pidgin read by an English voice is labelled, spec section 13
  return (
    <div class={`coach coach-${mode}`}>
      {mode === "character" ? <Bo pose={pose} size={48} /> : <Icon name="tether" size={24} />}
      <div class="coach-body">
        <p ref={line}>{children}</p>
        {on && voiceNote && <p class="coach-note">{voiceNote}</p>}
      </div>
    </div>
  );
}
