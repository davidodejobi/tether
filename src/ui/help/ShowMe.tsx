// Show me: this question's own sentence in three beats (cover the side phrase, find the subject, match
// the verb). Only beat 3 shows the verb. Shown as a modal dialog; Esc and the close button also call onDone.
//
// Props
//   question   the question being shown (its own sentence, never another example)
//   lang       coach language for the captions
//   coach      "character" shows Bo, "text" shows the text-only coach
//   onDone()   called when the learner leaves: "Put it in yourself" on beat 3, the close button or Esc
//   doneLabel  label of the beat 3 button. Default "Put it in yourself". Step 10 passes e.g. "Done" for free looks.
//   note       small chip under the sentence. Default "Counts as with help"; pass null to hide it.
// Normal motion plays the beats on a timer with Pause/Play and Replay. With reduced motion nothing plays or
// advances by itself: beats are static cards revealed by Next. It records nothing; the caller owns help marking.
import { useEffect, useRef, useState } from "preact/hooks";
import type { Question } from "../../content/generate.ts";
import type { Lang } from "../../content/types.ts";
import { Button } from "../components/Button";
import { CoachBubble } from "../components/CoachBubble";
import { Icon } from "../components/Icon";
import { useReducedMotion } from "../onboarding/parts";
import { fill, pack } from "./steps.ts";
import "../onboarding/onboarding.css";
import "./help.css";

export interface ShowMeProps {
  question: Question;
  lang: Lang;
  coach: "character" | "text";
  onDone(): void;
  doneLabel?: string;
  note?: string | null;
}

const BEAT_MS = 2600;
type Beat = 1 | 2 | 3;

function Sentence({ q, beat }: { q: Question; beat: Beat }) {
  const cls = (n: number, base: string) => `${base}${beat >= n ? ` on${beat === n ? " new" : ""}` : ""}`;
  return (
    <p class="ls-sentence" aria-hidden="true">
      <span class={cls(2, "ls-subject")}>
        {q.subject},{beat >= 2 && <span class="ls-badge">{q.number === "sg" ? "1" : "2+"}</span>}
      </span>{" "}
      <span class={cls(1, "ls-covered")}>{q.covered},</span>{" "}
      <span class={cls(3, "ls-blank")}>{beat >= 3 ? q.answer : ""}</span> {q.predicate}
    </p>
  );
}

const plain = (q: Question, beat: Beat) =>
  beat === 3 ? `${q.subject}, ${q.covered}, ${q.answer} ${q.predicate}` : `${q.subject}, (${q.covered},) blank ${q.predicate}`;

export function ShowMe({ question: q, lang, coach, onDone, doneLabel = "Put it in yourself", note = "Counts as with help" }: ShowMeProps) {
  const reduced = useReducedMotion();
  const dialog = useRef<HTMLDialogElement>(null);
  const caption = useRef<HTMLHeadingElement>(null);
  const [beat, setBeat] = useState<Beat>(1);
  const [playing, setPlaying] = useState(!reduced);
  const [run, setRun] = useState(0);
  const captions = pack.coach[lang].showMe.map((t, i) => fill(pack, t, q, lang, i === 2));
  const auto = playing && !reduced && beat < 3;

  useEffect(() => {
    const d = dialog.current!;
    const back = document.activeElement as HTMLElement | null;
    d.showModal();
    return () => back?.focus?.();
  }, []);
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => setBeat((b) => (b < 3 ? ((b + 1) as Beat) : b)), BEAT_MS);
    return () => clearTimeout(t);
  }, [auto, beat, run]);
  // Reduced motion: each Next moves focus to the new card's caption.
  useEffect(() => {
    if (reduced) caption.current?.focus({ preventScroll: true });
  }, [beat, reduced]);

  const next = () => setBeat((b) => (b < 3 ? ((b + 1) as Beat) : b));
  const replay = () => {
    setBeat(1);
    setPlaying(!reduced);
    setRun((r) => r + 1);
  };
  const pose = beat < 3 ? "thinking" : "pleased";
  const unreviewed = lang === "pcm" && pack.review.pcm.status !== "approved";

  return (
    <dialog ref={dialog} class="sm" aria-labelledby="sm-title" onCancel={(e) => (e.preventDefault(), onDone())}>
      <header class="sm-top">
        <h2 id="sm-title" class="sm-title">Show me</h2>
        <button type="button" class="sm-close" aria-label="Close Show me" onClick={onDone}>
          <Icon name="close" size={24} />
        </button>
      </header>
      <div class="sm-body">
        <CoachBubble mode={coach} pose={pose} unreviewed={unreviewed}>
          {beat < 3 ? "Watch your own sentence." : "That is the verb."}
        </CoachBubble>
        <ol class="ls-steps" aria-label="Steps">
          {[1, 2, 3].map((n) => (
            <li key={n} class={n === beat ? "now" : n < beat ? "done" : ""} aria-current={n === beat ? "step" : undefined}>{n}</li>
          ))}
          <li class="ls-steps-text">Step {beat} of 3</li>
        </ol>
        {reduced ? (
          [1, 2, 3].slice(0, beat).map((n) => (
            <section class="ls-card sm-card" key={n}>
              <Sentence q={q} beat={n as Beat} />
              <p class="sr-only">{plain(q, n as Beat)}</p>
              {n === beat ? <h3 class="sm-caption" ref={caption} tabIndex={-1}>{captions[n - 1]}</h3> : <p class="sm-caption">{captions[n - 1]}</p>}
            </section>
          ))
        ) : (
          <div class="ls-card ls-stage" key={`${beat}-${run}`}>
            <Sentence q={q} beat={beat} />
            <p class="sr-only">{plain(q, beat)}</p>
          </div>
        )}
        {!reduced && <p class="sm-caption" role="status" aria-live="polite">{captions[beat - 1]}</p>}
        {note && <p class="sm-chip">{note}</p>}
        <aside class="ls-rule">
          <Icon name="lightbulb" size={20} /> <strong>{pack.title}</strong>
          <p>{pack.coach[lang].rule}</p>
        </aside>
      </div>
      <footer class="sm-bar">
        <div class="sm-tools">
          <Button variant="secondary" icon="replay" onClick={replay}>Replay</Button>
          {!reduced && beat < 3 && (
            <Button variant="secondary" icon={playing ? undefined : "play"} onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</Button>
          )}
        </div>
        {beat < 3 ? <Button onClick={next}>Next</Button> : <Button onClick={onDone}>{doneLabel}</Button>}
      </footer>
    </dialog>
  );
}
