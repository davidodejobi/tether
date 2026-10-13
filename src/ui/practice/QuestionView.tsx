// One question with its blank, four tiles, Check, move sheet, Show me and read-aloud (spec section 5).
// Reused by practice and, later, the onboarding tutorial (origin "tutorial"); it assumes no round.
//
// Extension slots (steps 9 and 10 plug in here instead of changing the state machine):
//   afterMiss({ attempt, misses, retry, help, finish })  shown after any wrong check, inside a live region.
//       retry()  clears the selection and focuses the first usable tile.
//       help(kind)  records useHelp(kind) (Show me, Go deeper, AI) and saves it. `then` runs only once it is saved (also after a Retry).
//       blocked  a save is running or waiting for Retry: disable every control that mutates or advances.
//       finish()  leaves this question unfinished (saved) and calls onExit.
//       Default: "Not quite. Try again."
//   hideTiles(attempt, misses)  true hides the answer tiles (step 9: third miss). Default: never.
//   onShowMe({ attempt, help })  runs on the Show me button or S. Default: no-op, button stays visible.
//   afterCorrect({ attempt, next, update, help, openMove })  shown once the answer is correct; next() calls onDone(attempt).
//       update(attempt, then?) saves a changed attempt (reason, verification); `then` as for help. blocked as above.
//       saveLearner(learner) saves a learner change through the same guard. Default: the correct moment plus Next.
//       Step 10 (src/ui/practice/Honesty.tsx) inserts How did you know before next().
// Every checked answer is saved before the slots run. Selecting or changing a tile is never an attempt.
// Save rule (spec section 13): the screen changes only after save() resolves. While a save runs, or a failed one waits
// for Retry (the same batch), every mutating or advancing control is disabled. Close stays enabled.
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { cue } from "../../platform/sound.ts";
import { speak, speechOk, useVoiceNote } from "../../platform/speech.ts";
import { stripDisguise } from "../../content/strip-disguise.ts";
import type { Pack } from "../../content/types.ts";
import { sentence, type Question } from "../../content/generate.ts";
import { check, openMoveSheet, startAttempt, useHelp, readiness, type AnswerHelp, type Origin, type PracticeAttempt } from "../../rules/practice.ts";
import { attemptsOf, runStartsOf, type Batch, type Learner, type SavedAttempt } from "../../storage/progress.ts";
import { Bo } from "../components/Bo";
import { Button } from "../components/Button";
import { CoachBubble } from "../components/CoachBubble";
import { Dots } from "../components/Dots";
import { Icon } from "../components/Icon";
import { Key } from "../components/Key";
import { AnswerTiles } from "../components/AnswerTiles";
import { SentenceCard } from "../components/SentenceCard";
import { targetTile } from "../components/answerKeys";
import { useProgress } from "../progress";
import "./QuestionView.css";

export type HelpKind = Exclude<AnswerHelp, "nudge">;
export interface MissContext {
  attempt: PracticeAttempt;
  misses: number;
  retry(): void;
  help(kind: HelpKind, then?: () => void): void;
  /** A save is running or waiting for Retry: disable controls that mutate or advance. */
  blocked: boolean;
  finish(): void;
}
export interface ShowMeContext {
  attempt: PracticeAttempt;
  help(kind: HelpKind, then?: () => void): void;
}
export interface CorrectContext {
  attempt: PracticeAttempt;
  next(): void;
  /** Replaces this attempt with a changed copy (a reason, a verification) and saves it. */
  update(next: PracticeAttempt, then?: () => void): void;
  /** Saves a learner change (the honesty-intro flag) through the same guard. */
  saveLearner(next: Learner): void;
  /** Free look: help("showMe") after the answer is correct sets freeLook only. */
  help(kind: HelpKind, then?: () => void): void;
  /** A save is running or waiting for Retry: disable controls that mutate or advance. */
  blocked: boolean;
  /** Opens The move sheet. */
  openMove(): void;
}

export interface QuestionViewProps {
  question: Question;
  origin: Origin;
  /** A saved, unfinished attempt to continue (same question, same struck tiles). */
  resume?: SavedAttempt;
  /** Round progress for the top bar; omitted outside a round. */
  round?: { n: number; of: number };
  onDone(attempt: PracticeAttempt): void;
  onExit(): void;
  afterMiss?(ctx: MissContext): ComponentChildren;
  afterCorrect?(ctx: CorrectContext): ComponentChildren;
  onShowMe?(ctx: ShowMeContext): void;
  hideTiles?(attempt: PracticeAttempt, misses: number): boolean;
  /** Tablet/laptop Show me: takes the place of the question (the grid areas main and bar). Ignored by CSS on phone. */
  overlay?: ComponentChildren;
  /** True while the overlay plays: this view ignores the keyboard (Enter must not check under it). */
  suspended?: boolean;
}

const pack: Pack = stripDisguise;
// The move sheet's own example (spec section 5). Its sentence is outside the question space (validatePack rejects a repeat),
// so it is never the current sentence. Its verb is hidden when this question uses the same verb, so it cannot hint at the answer.
const ex = pack.lessonExample;
const exVerb = pack.verbs.find((v) => v.id === ex.verbId)!;
// Not crypto.randomUUID: it needs a secure context, and plain-http LAN testing must work.
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const LADDER = [
  ["Nudge", "A small hint. Then try again."],
  ["Show me", "Watch the move on a sample, then try a new one."],
  ["Go deeper", "Step through it: subject, number, verb."],
] as const;
const defaultMiss = () => <p class="qv-miss">Not quite. Try again.</p>;

export function QuestionView(props: QuestionViewProps) {
  const { question: q, origin, round } = props;
  const { store, save } = useProgress();
  const learner = store.progress.learner!;
  const [attempt, setAttempt] = useState<PracticeAttempt>(
    () => props.resume?.attempt ?? startAttempt(newId(), q.id, origin, store.moment(Date.now())),
  );
  const [struck, setStruck] = useState<string[]>(props.resume?.struck ?? []);
  const [selected, setSelected] = useState<number | null>(null);
  const [failed, setFailed] = useState<(() => Promise<boolean>) | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null);
  // A save that lands after the learner left this screen plays no cue; the restored question is silent too.
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);
  // Leaving counts at once: the route changes now but this screen unmounts on the next render, and a save
  // landing in between must stay silent too.
  const exit = () => {
    mounted.current = false;
    props.onExit();
  };

  const done = attempt.completedAt !== undefined;
  const misses = attempt.checks - (attempt.correctOnCheck ? 1 : 0);
  const tiles = q.options.map((label) => ({ label, struck: struck.includes(label) }));
  const hidden = !done && (props.hideTiles?.(attempt, misses) ?? false);

  const blocked = busy || !!failed;

  // Saves one batch, then (and only then) runs onSaved, which changes the screen. One save at a time (the store refuses
  // overlapping saves). On failure the screen stays and Retry runs the same batch again.
  const commit = (batch: Batch, onSaved?: () => void): Promise<boolean> => {
    const go = async (): Promise<boolean> => {
      setBusy(true);
      try {
        await save(batch);
        onSaved?.();
        setFailed(null);
        return true;
      } catch {
        setFailed(() => go);
        return false;
      } finally {
        setBusy(false);
      }
    };
    return go();
  };
  // The attempt is saved with the exact question shown.
  const attemptBatch = (next: PracticeAttempt, nextStruck: string[]): Batch => ({ attempts: [{ attempt: next, question: q, struck: nextStruck }] });

  // A started question is saved at once so a reload or exit brings it back.
  useEffect(() => {
    if (!store.progress.attempts.has(attempt.id)) void commit(attemptBatch(attempt, struck));
  }, []);

  // Choosing a tile only fills the blank: a quiet selection cue, no grading.
  const choose = (i: number) => {
    if (i !== selected) cue("select");
    setSelected(i);
  };

  const doCheck = () => {
    if (selected === null || done || blocked) return;
    const word = q.options[selected]!;
    const ok = word === q.answer;
    const next = check(attempt, ok, store.moment(Date.now()));
    const nextStruck = ok ? struck : [...struck, word];
    void commit(attemptBatch(next, nextStruck), () => {
      setAttempt(next);
      setStruck(nextStruck);
      if (!ok) setSelected(null);
      if (mounted.current) cue(ok ? "correct" : "tryAgain"); // only after the save landed; Retry runs this once on success
    });
  };

  const update = (next: PracticeAttempt, then?: () => void) => {
    if (!blocked) void commit(attemptBatch(next, struck), () => (setAttempt(next), then?.()));
  };
  const help = (kind: HelpKind, then?: () => void) => update(useHelp(attempt, kind, store.moment(Date.now())), then);
  const saveLearner = (next: Learner) => {
    if (!blocked) void commit({ learner: next });
  };
  const showMe = () => {
    if (!blocked) props.onShowMe?.({ attempt, help });
  };
  const retry = () => {
    setSelected(null);
    root.current?.querySelector<HTMLElement>('[role="radio"]:not([aria-disabled])')?.focus();
  };

  const openSheet = () => {
    if (blocked) return;
    const next = openMoveSheet(attempt);
    if (next === attempt) dialog.current?.showModal();
    else void commit(attemptBatch(next, struck), () => (setAttempt(next), dialog.current?.showModal()));
  };
  const closeSheet = () => dialog.current?.close();

  const setLang = (lang: "en" | "pcm") => {
    if (lang !== learner.lang && !blocked) void commit({ learner: { ...learner, lang } });
  };

  // Keyboard: 1-4, arrows and Space select; Enter checks; R reads; S is Show me.
  const onKey = (e: KeyboardEvent) => {
    if (props.suspended) return;
    const t = e.target as HTMLElement;
    if (e.altKey || e.ctrlKey || e.metaKey || t.closest("input, textarea, select, dialog")) return;
    const onTile = !!t.closest(".tiles");
    const onControl = !onTile && !!t.closest("button, a");
    if (e.key === "Enter" && !onControl) {
      e.preventDefault();
      doCheck();
      return;
    }
    if (onControl && e.key === " ") return; // Space presses the focused button
    const k = e.key.toLowerCase();
    if (k === "r") speak(sentence(q, "blank"), "en");
    else if (k === "s" && origin === "practice") showMe();
    else if (!onTile && !done && !hidden && !blocked) {
      const to = targetTile(e.key, selected ?? 0, tiles.map((x) => !!x.struck));
      if (to !== null) {
        e.preventDefault();
        choose(to);
        root.current?.querySelectorAll<HTMLElement>('[role="radio"]')[to]?.focus(); // so Enter then checks
      }
    }
  };
  // The handler is kept in a ref and updated during render, so a key pressed right after a state change never sees old state.
  const keyRef = useRef(onKey);
  keyRef.current = onKey;
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const dots = readiness(attemptsOf(store.progress), runStartsOf(store.progress)).dots as 0 | 1 | 2 | 3;
  const filled = done ? q.answer : selected === null ? undefined : q.options[selected];
  const lang = learner.lang;
  const coach = pack.coach[lang];
  const voiceNote = useVoiceNote(lang); // set when Pidgin would be read by an English voice

  const bo = learner.coach === "character"; // Text only shows no Bo anywhere
  const rung = attempt.help.includes("goDeeper") ? 3 : attempt.help.includes("showMe") ? 2 : misses > 0 || attempt.help.length > 0 ? 1 : 0;
  const panel = origin === "practice";

  return (
    <div class={`qv${panel ? " qv-has-panel" : ""}${props.suspended ? " qv-suspended" : ""}`} ref={root}>
      <header class="qv-top">
        <button type="button" class="qv-close" aria-label="Close and come back later" onClick={exit}>
          <Icon name="close" size={24} />
        </button>
        {round && (
          <div class="qv-progress" role="progressbar" aria-valuemin={1} aria-valuemax={round.of} aria-valuenow={round.n} aria-label={`Question ${round.n} of ${round.of}`}>
            <span style={`width:${(round.n / round.of) * 100}%`} />
          </div>
        )}
        <div class="qv-lang" role="group" aria-label="Coach language">
          {(["en", "pcm"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} disabled={blocked} onClick={() => setLang(l)}>
              {l === "en" ? "EN" : "PCM"}
            </button>
          ))}
        </div>
        {round && <span class="qv-count">{round.n} of {round.of}</span>}
        {origin === "practice" && <div class="qv-dots"><Dots filled={dots} /></div>}
      </header>

      <main class="qv-main">
        <button type="button" class="qv-move" disabled={blocked} onClick={openSheet}>
          <Icon name="lightbulb" size={20} />
          <span>The move: {pack.title}</span>
          <Icon name="chevron-right" size={20} />
        </button>
        <h1 class="qv-prompt">Pick the verb that fits.</h1>
        <div class="qv-sentence">
          <SentenceCard before={`${q.subject}, ${q.covered},`} after={q.predicate} filled={filled} correct={done} />
          {bo && <span class="qv-bo-side"><Bo pose={done ? "pleased" : misses > 1 ? "concerned" : "idle"} size={72} /></span>}
        </div>
        {speechOk() && (
          <button type="button" class="qv-read" onClick={() => speak(sentence(q, "blank"), "en")}>
            <Icon name="speaker" size={20} /> Read aloud
          </button>
        )}

        <div class="qv-status" role="status" aria-live="polite">
          {done ? <span class="sr-only">Correct.</span> : (misses > 0 || (props.afterMiss && attempt.help.length > 0)) && (props.afterMiss ?? defaultMiss)({ attempt, misses, retry, help, blocked, finish: exit })}
        </div>

        {failed && (
          <div class="qv-fail" role="alert">
            <span>Couldn't save this answer. Your progress may not be kept.</span>
            <Button variant="secondary" silent disabled={busy} onClick={failed}>Retry</Button>
          </div>
        )}

        {!hidden && (
          <AnswerTiles tiles={tiles} value={done ? q.options.indexOf(q.answer) : selected} correct={done ? q.options.indexOf(q.answer) : null} disabled={blocked} onSelect={choose} />
        )}
        <p class="qv-keys" aria-hidden="true">
          <Key k="1–4">Pick</Key><Key k="Enter">Check</Key><Key k="R">Read aloud</Key>{origin === "practice" && <Key k="S">Show me</Key>}
        </p>

        {done && (
          props.afterCorrect ? props.afterCorrect({ attempt, next: () => props.onDone(attempt), update, saveLearner, help, blocked, openMove: openSheet }) : (
            <div class="qv-correct">
              {learner.coach === "character" && <Bo pose="pleased" size={96} />}
              <p class="qv-correct-word"><Icon name="check" size={24} /> Correct</p>
              <Button disabled={blocked} onClick={() => props.onDone(attempt)}>Next</Button>
            </div>
          )
        )}
      </main>

      {!done && (
        <footer class="qv-bar">
          {learner.coach === "character" && <Bo pose={misses > 1 ? "concerned" : "idle"} size={48} />}
          <Button variant="secondary" disabled={blocked} onClick={showMe}>Show me</Button>
          <Button silent disabled={selected === null || blocked} onClick={doCheck}>Check</Button>
        </footer>
      )}

      {panel && (
        <aside class="qv-panel" aria-label="Coach and help">
          {bo ? <Bo pose={done ? "pleased" : rung >= 2 ? "thinking" : misses > 0 ? "nudge" : "idle"} size={120} /> : null}
          <div class="qv-panel-note">
            {bo ? <p>Open The move any time. Opening it is not help.</p> : <CoachBubble mode="text">Open The move any time. Opening it is not help.</CoachBubble>}
          </div>
          {rung > 0 && <p class="qv-panel-help">Help used. Your streak starts again. That's fine.</p>}
          {rung > 0 && (
            <section class="qv-panel-move" aria-label="The move">
              <h2><Icon name="lightbulb" size={20} /> {pack.title}</h2>
              <p>{coach.rule}</p>
            </section>
          )}
          <h2 class="qv-panel-h">Help ladder</h2>
          <p class="qv-panel-sub">Help is fine. It counts as with help.</p>
          <ol class="qv-ladder">
            {LADDER.map(([name, text], i) => (
              <li key={name} class={rung === i + 1 ? "qv-rung qv-rung-now" : "qv-rung"} aria-current={rung === i + 1 ? "step" : undefined}>
                <span class="qv-rung-n">{i + 1}</span>
                <span><strong>{name}</strong><br />{text}</span>
              </li>
            ))}
          </ol>
        </aside>
      )}

      {props.overlay}

      <dialog ref={dialog} class="qv-sheet" aria-labelledby="qv-sheet-title">
        <Icon name="lightbulb" size={32} />
        <h2 id="qv-sheet-title">The move: {pack.title}</h2>
        <CoachBubble mode={learner.coach} pose="idle" unreviewed={lang === "pcm" && pack.review.pcm.status !== "approved"}>
          {coach.rule}
        </CoachBubble>
        <p>{coach.explanation} Opening this is not help.</p>
        <p class="qv-example">
          <strong>Example:</strong> {ex.subject}, {ex.sidePhrase}, {q.options.some((o) => o === exVerb.sg || o === exVerb.pl) ? "___" : exVerb[ex.number]} {ex.predicate}
        </p>
        <p class="qv-source">Rule source: {pack.source.line}</p>
        <Button onClick={closeSheet}>Got it</Button>
        {speechOk() && <Button variant="secondary" onClick={() => speak(`${coach.rule} ${coach.explanation}`, lang)}>Read it to me</Button>}
        {speechOk() && voiceNote && <p class="qv-source">{voiceNote}</p>}
      </dialog>
    </div>
  );
}
