// One question with its blank, four tiles, Check, move sheet, Show me and read-aloud (spec section 5).
// Reused by practice and, later, the onboarding tutorial (origin "tutorial"); it assumes no round.
//
// Extension slots (steps 9 and 10 plug in here instead of changing the state machine):
//   afterMiss({ attempt, misses, retry, help, finish })  shown after any wrong check, inside a live region.
//       retry()  clears the selection and focuses the first usable tile.
//       help(kind)  records useHelp(kind) (Show me, Go deeper, AI) and saves it.
//       finish()  leaves this question unfinished (saved) and calls onExit.
//       Default: "Not quite. Try again."
//   hideTiles(attempt, misses)  true hides the answer tiles (step 9: third miss). Default: never.
//   onShowMe({ attempt, help })  runs on the Show me button or S. Default: no-op, button stays visible.
//   afterCorrect({ attempt, next, update, help, openMove })  shown once the answer is correct; next() calls onDone(attempt).
//       update(attempt) saves a changed attempt (reason, verification). Default: the correct moment plus Next.
//       Step 10 (src/ui/practice/Honesty.tsx) inserts How did you know before next().
// Every checked answer is saved before the slots run. Selecting or changing a tile is never an attempt.
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { stripDisguise } from "../../content/strip-disguise.ts";
import type { Pack } from "../../content/types.ts";
import { sentence, type Question } from "../../content/generate.ts";
import { check, openMoveSheet, startAttempt, useHelp, readiness, type AnswerHelp, type Origin, type PracticeAttempt } from "../../rules/practice.ts";
import { attemptsOf, runStartsOf, type SavedAttempt } from "../../storage/progress.ts";
import { Bo } from "../components/Bo";
import { Button } from "../components/Button";
import { CoachBubble } from "../components/CoachBubble";
import { Dots } from "../components/Dots";
import { Icon } from "../components/Icon";
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
  help(kind: HelpKind): void;
  finish(): void;
}
export interface ShowMeContext {
  attempt: PracticeAttempt;
  help(kind: HelpKind): void;
}
export interface CorrectContext {
  attempt: PracticeAttempt;
  next(): void;
  /** Replaces this attempt with a changed copy (a reason, a verification) and saves it. */
  update(next: PracticeAttempt): void;
  /** Free look: help("showMe") after the answer is correct sets freeLook only. */
  help(kind: HelpKind): void;
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
}

const pack: Pack = stripDisguise;
// Not crypto.randomUUID: it needs a secure context, and plain-http LAN testing must work.
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const speechOk = () => typeof window !== "undefined" && "speechSynthesis" in window;

function speak(text: string) {
  if (!speechOk()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const v = voices.find((x) => x.lang.replace("_", "-").toLowerCase() === "en-ng") ?? voices.find((x) => x.lang.toLowerCase().startsWith("en"));
  if (v) u.voice = v;
  u.lang = v?.lang ?? "en-NG";
  synth.speak(u);
}

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
  const [failed, setFailed] = useState<(() => void) | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null);

  const done = attempt.completedAt !== undefined;
  const misses = attempt.checks - (attempt.correctOnCheck ? 1 : 0);
  const tiles = q.options.map((label) => ({ label, struck: struck.includes(label) }));
  const hidden = !done && (props.hideTiles?.(attempt, misses) ?? false);

  // Saves the attempt with the exact question shown. One save at a time (store refuses overlapping saves).
  const persist = async (next: PracticeAttempt, nextStruck: string[]) => {
    const go = async () => {
      setBusy(true);
      try {
        await save({ attempts: [{ attempt: next, question: q, struck: nextStruck }] });
        setFailed(null);
      } catch {
        setFailed(() => go);
      } finally {
        setBusy(false);
      }
    };
    await go();
  };

  // A started question is saved at once so a reload or exit brings it back.
  useEffect(() => {
    if (!store.progress.attempts.has(attempt.id)) void persist(attempt, struck);
  }, []);

  const doCheck = () => {
    if (selected === null || done || busy) return;
    const word = q.options[selected]!;
    const ok = word === q.answer;
    const next = check(attempt, ok, store.moment(Date.now()));
    const nextStruck = ok ? struck : [...struck, word];
    setAttempt(next);
    setStruck(nextStruck);
    if (!ok) setSelected(null);
    void persist(next, nextStruck);
  };

  const help = (kind: HelpKind) => {
    const next = useHelp(attempt, kind, store.moment(Date.now()));
    setAttempt(next);
    void persist(next, struck);
  };
  const update = (next: PracticeAttempt) => {
    setAttempt(next);
    void persist(next, struck);
  };
  const showMe = () => props.onShowMe?.({ attempt, help });
  const retry = () => {
    setSelected(null);
    root.current?.querySelector<HTMLElement>('[role="radio"]:not([aria-disabled])')?.focus();
  };

  const openSheet = () => {
    const next = openMoveSheet(attempt);
    if (next !== attempt) {
      setAttempt(next);
      void persist(next, struck);
    }
    dialog.current?.showModal();
  };
  const closeSheet = () => dialog.current?.close();

  const setLang = (lang: "en" | "pcm") => {
    if (lang !== learner.lang) void save({ learner: { ...learner, lang } }).catch(() => {});
  };

  // Keyboard: 1-4, arrows and Space select; Enter checks; R reads; S is Show me.
  const onKey = (e: KeyboardEvent) => {
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
    if (k === "r") speak(sentence(q, "blank"));
    else if (k === "s" && origin === "practice") showMe();
    else if (!onTile && !done && !hidden) {
      const to = targetTile(e.key, selected ?? 0, tiles.map((x) => !!x.struck));
      if (to !== null) {
        e.preventDefault();
        setSelected(to);
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

  return (
    <div class="qv" ref={root}>
      <header class="qv-top">
        <button type="button" class="qv-close" aria-label="Close and come back later" onClick={props.onExit}>
          <Icon name="close" size={24} />
        </button>
        {round && (
          <div class="qv-progress" role="progressbar" aria-valuemin={1} aria-valuemax={round.of} aria-valuenow={round.n} aria-label={`Question ${round.n} of ${round.of}`}>
            <span style={`width:${(round.n / round.of) * 100}%`} />
          </div>
        )}
        <div class="qv-lang" role="group" aria-label="Coach language">
          {(["en", "pcm"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l === "en" ? "EN" : "PCM"}
            </button>
          ))}
        </div>
        {round && <span class="qv-count">{round.n} of {round.of}</span>}
        {origin === "practice" && <div class="qv-dots"><Dots filled={dots} /></div>}
      </header>

      <main class="qv-main">
        <button type="button" class="qv-move" onClick={openSheet}>
          <Icon name="lightbulb" size={20} />
          <span>The move: {pack.title}</span>
          <Icon name="chevron-right" size={20} />
        </button>
        <h1 class="qv-prompt">Pick the verb that fits.</h1>
        <SentenceCard before={`${q.subject}, ${q.covered},`} after={q.predicate} filled={filled} correct={done} />
        {speechOk() && (
          <button type="button" class="qv-read" onClick={() => speak(sentence(q, "blank"))}>
            <Icon name="speaker" size={20} /> Read aloud
          </button>
        )}

        <div class="qv-status" role="status" aria-live="polite">
          {done ? <span class="sr-only">Correct.</span> : misses > 0 && (props.afterMiss ?? defaultMiss)({ attempt, misses, retry, help, finish: props.onExit })}
        </div>

        {failed && (
          <div class="qv-fail" role="alert">
            <span>Couldn't save this answer. Your progress may not be kept.</span>
            <Button variant="secondary" onClick={failed}>Retry</Button>
          </div>
        )}

        {!hidden && (
          <AnswerTiles tiles={tiles} value={done ? q.options.indexOf(q.answer) : selected} correct={done ? q.options.indexOf(q.answer) : null} onSelect={setSelected} />
        )}
        <p class="qv-keys" aria-hidden="true">1-4 pick · Enter check · R read · S show me</p>

        {done && (
          props.afterCorrect ? props.afterCorrect({ attempt, next: () => props.onDone(attempt), update, help, openMove: openSheet }) : (
            <div class="qv-correct">
              <Bo pose="pleased" size={96} />
              <p class="qv-correct-word"><Icon name="check" size={24} /> Correct</p>
              <Button onClick={() => props.onDone(attempt)}>Next</Button>
            </div>
          )
        )}
      </main>

      {!done && (
        <footer class="qv-bar">
          {learner.coach === "character" && <Bo pose={misses > 1 ? "concerned" : "idle"} size={48} />}
          <Button variant="secondary" onClick={showMe}>Show me</Button>
          <Button disabled={selected === null || busy} onClick={doCheck}>Check</Button>
        </footer>
      )}

      <dialog ref={dialog} class="qv-sheet" aria-labelledby="qv-sheet-title">
        <Icon name="lightbulb" size={32} />
        <h2 id="qv-sheet-title">The move: {pack.title}</h2>
        <CoachBubble mode={learner.coach} pose="idle" unreviewed={lang === "pcm" && pack.review.pcm.status !== "approved"}>
          {coach.rule}
        </CoachBubble>
        <p>{coach.explanation} Opening this is not help.</p>
        <p class="qv-source">Rule source: {pack.source.line}</p>
        <Button onClick={closeSheet}>Got it</Button>
        {speechOk() && <Button variant="secondary" onClick={() => speak(`${coach.rule} ${coach.explanation}`)}>Read it to me</Button>}
      </dialog>
    </div>
  );
}
