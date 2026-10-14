// Show me: this question's own sentence in three beats (cover the side phrase, find the subject, match
// the verb). Only beat 3 shows the verb. Phone: a modal dialog (Esc and the close button also call onDone).
// Tablet and laptop (768 px up): inline, in the page's own column, not modal (docs/decisions.md).
//
// Props
//   question   the question being shown (its own sentence, never another example)
//   lang       coach language for the captions
//   coach      "character" shows Bo, "text" shows the text-only coach
//   onDone()   called when the learner leaves: "Put it in yourself" on beat 3, the close button or Esc
//   doneLabel  label of the beat 3 button. Default "Put it in yourself". Step 10 passes e.g. "Done" for free looks.
//   page       true when it takes the place of the whole question (HelpedQuestion); the keys R and Enter then work.
//   note       small chip under the sentence. Default "Counts as with help"; pass null to hide it.
// Normal motion plays the beats on a timer with Pause/Play and Replay. With reduced motion nothing plays or
// advances by itself: beats are static cards revealed by Next. It records nothing; the caller owns help marking.
import { useEffect, useRef, useState } from "preact/hooks";
import { partsOf, type Question } from "../../content/generate.ts";
import { moveOrFirst, unreviewed as isUnreviewed } from "../../content/moves.ts";
import type { Lang } from "../../content/types.ts";
import { autoLine, speak, speechOk, useCanSpeak } from "../../platform/speech.ts";
import { Button } from "../components/Button";
import { CoachBubble } from "../components/CoachBubble";
import { Icon } from "../components/Icon";
import { Key } from "../components/Key";
import { useReducedMotion } from "../onboarding/parts";
import { useProgressState } from "../progress";
import { BeatSentence, beatPlain, type Beat } from "./BeatSentence";
import { fill } from "./steps.ts";
import "../onboarding/onboarding.css";
import "./help.css";

export interface ShowMeProps {
  question: Question;
  lang: Lang;
  coach: "character" | "text";
  onDone(): void;
  page?: boolean;
  doneLabel?: string;
  note?: string | null;
}

const BEAT_MS = 2600;

const Sentence = ({ q, beat }: { q: Question; beat: Beat }) => (
  <BeatSentence parts={partsOf(q)} predicate={q.predicate} answer={q.answer} number={q.number} beat={beat} />
);

const plain = (q: Question, beat: Beat) => beatPlain(partsOf(q), q.predicate, q.answer, beat);

// Tablet and up: true from 768 px, following the viewport.
function useWide() {
  const mq = typeof matchMedia === "function" ? matchMedia("(min-width: 768px)") : null;
  const [wide, setWide] = useState(!!mq?.matches);
  useEffect(() => {
    if (!mq) return;
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

export function ShowMe({ question: q, lang, coach, onDone, page, doneLabel = "Put it in yourself", note = "Counts as with help" }: ShowMeProps) {
  const reduced = useReducedMotion();
  const wide = useWide();
  const dialog = useRef<HTMLDialogElement>(null);
  const caption = useRef<HTMLHeadingElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [beat, setBeat] = useState<Beat>(1);
  const [playing, setPlaying] = useState(!reduced);
  const [run, setRun] = useState(0);
  const move = moveOrFirst(q.moveId);
  const captions = move.coach[lang].showMe.map((t, i) => fill(move, t, q, lang, i === 2));
  const progress = useProgressState();
  const canSpeak = useCanSpeak();
  const on = canSpeak && progress.status === "ready" && progress.store.progress.learner?.readAloud === true;
  const auto = playing && !reduced && beat < 3;

  useEffect(() => {
    const d = dialog.current;
    const back = document.activeElement as HTMLElement | null;
    if (d) d.showModal();
    else title.current?.closest("section")?.querySelector<HTMLElement>(".sm-tools button")?.focus({ preventScroll: true });
    return () => back?.focus?.();
  }, [wide]);
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => setBeat((b) => (b < 3 ? ((b + 1) as Beat) : b)), BEAT_MS);
    return () => clearTimeout(t);
  }, [auto, beat, run]);
  // Reduced motion: each Next moves focus to the new card's caption.
  useEffect(() => {
    if (reduced) caption.current?.focus();
  }, [beat, reduced]);

  // Read-aloud: each beat's caption (the teaching instruction) is spoken once as the beat appears, also with reduced motion.
  const line = captions[beat - 1] ?? "";
  useEffect(() => {
    const text = autoLine(on, document.visibilityState === "hidden", line, null);
    if (text !== null) speak(text, lang);
  }, [beat, run, on]);
  useEffect(() => () => { if (speechOk()) window.speechSynthesis.cancel(); }, []);

  const next = () => setBeat((b) => (b < 3 ? ((b + 1) as Beat) : b));
  const replay = () => {
    setBeat(1);
    setPlaying(!reduced);
    setRun((r) => r + 1);
  };
  // Inline page: R replays, Enter goes on, Esc leaves. Keys on a button or field are left alone.
  const keyRef = useRef<(e: KeyboardEvent) => void>(undefined);
  keyRef.current = (e) => {
    if (!wide || !page || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target as HTMLElement;
    if (t.closest("input, textarea, select, dialog")) return;
    const k = e.key.toLowerCase();
    if (k === "escape") onDone();
    else if (k === "r") replay();
    else if (k === "enter" && !t.closest("button, a")) (e.preventDefault(), beat < 3 ? next() : onDone());
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current?.(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const pose = beat < 3 ? "thinking" : "pleased";
  const unreviewed = isUnreviewed(move, lang);

  const inner = (
    <>
      <header class="sm-top">
        <h2 id="sm-title" class="sm-title" ref={title}>Show me</h2>
        <button type="button" class="sm-close" aria-label="Close Show me" onClick={onDone}>
          <Icon name="close" size={24} />
        </button>
      </header>
      <div class="sm-body">
        <CoachBubble mode={coach} pose={pose} unreviewed={unreviewed} speaks={false}>
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
              {unreviewed && <span class="coach-tag">Unreviewed</span>}
              {n === beat ? <h3 class="sm-caption" ref={caption} tabIndex={-1}>{captions[n - 1]}</h3> : <p class="sm-caption">{captions[n - 1]}</p>}
            </section>
          ))
        ) : (
          <div class="ls-card ls-stage" key={`${beat}-${run}`}>
            <Sentence q={q} beat={beat} />
            <p class="sr-only">{plain(q, beat)}</p>
          </div>
        )}
        {!reduced && (
          <div>
            {unreviewed && <span class="coach-tag">Unreviewed</span>}
            <p class="sm-caption" role="status" aria-live="polite">{captions[beat - 1]}</p>
          </div>
        )}
        {page && <p class="qv-keys" aria-hidden="true"><Key k="R">Replay</Key><Key k="Enter">{beat < 3 ? "Next" : doneLabel}</Key><Key k="S">Show me</Key></p>}
        {note && <p class="sm-chip">{note}</p>}
        <aside class="ls-rule">
          <Icon name="lightbulb" size={20} /> <strong>{move.title}</strong>
          {unreviewed && <span class="coach-tag">Unreviewed</span>}
          <p>{move.coach[lang].rule}</p>
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
    </>
  );
  return wide ? (
    <section class={`sm sm-inline${page ? " sm-page" : ""}`} aria-labelledby="sm-title">{inner}</section>
  ) : (
    <dialog ref={dialog} class="sm" aria-labelledby="sm-title" onCancel={(e) => (e.preventDefault(), onDone())}>{inner}</dialog>
  );
}
