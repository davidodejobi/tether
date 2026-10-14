// After a correct answer: How did you know, verification and free looks (spec section 6).
// Plugs into QuestionView's afterCorrect slot. Everything it shows comes from the saved attempt,
// so a reload on a pending reason or verification brings the same prompt back.
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { partsOf, type Question } from "../../content/generate.ts";
import { moveOrFirst, stripDisguiseMove } from "../../content/moves.ts";
import { asksReason, giveReason, readiness, verify, type Reason } from "../../rules/practice.ts";
import { attemptsOf, runStartsOf } from "../../storage/progress.ts";
import { Bo } from "../components/Bo";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { useProgress } from "../progress";
import type { CorrectContext } from "./QuestionView";
import { ShowMe } from "../help/ShowMe";
import "./Honesty.css";

export const HONESTY_INTRO = "Tell us the truth and nothing is lost. Dots only come from using the move. The solo check is what proves it. Sometimes we’ll ask you to show it.";

const CHOICES: { reason: Reason; label: string }[] = [
  { reason: "move", label: "I used the move" },
  { reason: "sounded", label: "It sounded right" },
  { reason: "guessed", label: "I guessed" },
];

type Chip = { word: string; part: "covered" | "other" };
/** The sentence as tappable words, each tagged by whether it belongs to a covered part. */
function chips(q: Question): Chip[] {
  const words = (text: string, part: Chip["part"]) => text.split(" ").map((word) => ({ word, part }));
  return [
    ...partsOf(q).flatMap((p) => words(p.text, p.role === "covered" ? "covered" : "other")),
    ...words(q.answer, "other"),
    ...words(q.predicate, "other"),
  ];
}

export function Honesty({ ctx, question: q }: { ctx: CorrectContext; question: Question }) {
  const { attempt, next, update, saveLearner, help, openMove, blocked } = ctx;
  const { store } = useProgress();
  const learner = store.progress.learner!;
  const move = moveOrFirst(q.moveId);
  const first = move === stripDisguiseMove;
  const bo = learner.coach === "character"; // Text only shows no Bo anywhere
  // Readiness counts this attempt as it is now, so the message never waits for the save to land.
  const attempts = attemptsOf(store.progress).filter((a) => a.id !== attempt.id).concat(attempt);
  const { dots, offerMove } = readiness(attempts, runStartsOf(store.progress));
  const [tapped, setTapped] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const phase = !asksReason(attempt)
    ? "plain"
    : !attempt.reason
      ? "reason"
      : attempt.reason === "move" && attempt.verifySampled && !attempt.verifyResult
        ? "verify"
        : "done";

  // Focus the new content whenever the step changes.
  useEffect(() => heading.current?.focus(), [phase]);

  // Show the honesty rule once. Decided at first render; the flag is saved at once so a reload never repeats it.
  // It goes through the question view's guarded save: a failure shows Retry and blocks the reason choices.
  const [intro] = useState(() => phase === "reason" && !learner.honestyIntroSeen);
  useEffect(() => {
    if (intro) saveLearner({ ...learner, honestyIntroSeen: true });
  }, []);

  // Keys 1-3 pick a reason, on equal terms with the buttons.
  const keyRef = useRef<(e: KeyboardEvent) => void>(undefined);
  keyRef.current = (e) => {
    if (phase !== "reason" || blocked || e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement).closest("input, textarea, select, dialog")) return;
    const c = CHOICES["123".indexOf(e.key)];
    if (c) (e.preventDefault(), choose(c.reason));
  };
  // Layout effect: listen as soon as the reasons are on screen, not after the next paint, so a quick key press is never lost.
  useLayoutEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current?.(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const choose = (reason: Reason) => update(giveReason(attempt, reason, Math.random, store.moment(Date.now())));
  const tap = (i: number, covered: boolean) => {
    // The tapped word is marked only once the verification is saved.
    update(verify(attempt, covered, store.moment(Date.now())), () => setTapped(i));
  };
  // A free look plays only once its mark is saved.
  const freeLook = () => (attempt.freeLook ? setPlaying(true) : help("showMe", () => setPlaying(true)));

  if (phase === "plain")
    return (
      <div class="qv-correct qv-focus">
        {bo && <Bo pose="pleased" size={96} />}
        <h2 class="qv-correct-word" tabIndex={-1} ref={heading}><Icon name="check" size={24} /> Correct</h2>
        <Button disabled={blocked} onClick={next}>Next</Button>
      </div>
    );

  const showChips = phase === "verify" || (phase === "done" && attempt.verifySampled);
  const words = showChips ? chips(q) : [];
  const moveClaim = attempt.reason === "move";
  const earned = moveClaim && (!attempt.verifySampled || attempt.verifyResult === "passed");

  return (
    <section class={`hn${showChips ? " hn-chips-mode" : ""}${phase === "reason" ? " qv-focus" : ""}`}>
      {phase === "reason" && (
        <>
          {bo && <span class="hn-bo"><Bo pose="pleased" size={200} /></span>}
          <h2 class="hn-correct"><Icon name="check" size={24} /> Correct</h2>
          {intro && (
            <p class="hn-intro">
              <Icon name="lightbulb" size={20} /> {HONESTY_INTRO}
            </p>
          )}
          <div class="hn-ask">
            {bo && <span class="hn-ask-bo"><Bo pose="idle" size={48} /></span>}
            <h3 tabIndex={-1} ref={heading}>How did you know?</h3>
          </div>
          <div class="hn-choices" role="radiogroup" aria-label="How did you know?" onKeyDown={arrowFocus}>
            {CHOICES.map((c, i) => (
              <button key={c.reason} type="button" role="radio" aria-checked="false" tabIndex={i === 0 ? 0 : -1} class="hn-choice" disabled={blocked} onClick={() => choose(c.reason)}>
                <kbd class="hn-num" aria-hidden="true">{i + 1}</kbd>{c.label}
              </button>
            ))}
          </div>
          <p class="hn-foot">Sometimes we will ask you to show it.<span class="hn-foot-keys"> Press 1, 2 or 3.</span></p>
        </>
      )}

      {showChips && (
        <>
          <div class="hn-ask">
            {bo && <Bo pose={phase === "verify" ? "thinking" : "idle"} size={48} />}
            <h3 tabIndex={-1} ref={heading}>Show us. {move.coach.en.verify}</h3>
          </div>
          <div class="hn-words" role="group" aria-label={`The sentence. ${move.coach.en.verify}`}>
            {words.map((w, i) => {
              const result = phase === "done" ? (w.part === "covered" ? "covered" : tapped === i ? "wrong" : "") : "";
              return (
                <button
                  key={i}
                  type="button"
                  class={`hn-word ${result ? `hn-word-${result}` : ""}`}
                  disabled={phase === "done" || blocked}
                  aria-label={result === "covered" ? `${w.word}, covered phrase` : result === "wrong" ? `${w.word}, not the covered phrase` : w.word}
                  onClick={() => tap(i, w.part === "covered")}
                >
                  {w.word}
                </button>
              );
            })}
          </div>
        </>
      )}

      {phase === "done" && (
        <>
          <div class="hn-result" role="status" aria-live="polite">
            {!showChips && <h3 tabIndex={-1} ref={heading}>{!moveClaim ? "Thanks for telling us." : "That's the move."}</h3>}
            <p class="hn-msg">
              <Icon name={earned ? "check" : "lightbulb"} size={20} />
              <span>
                {earned
                  ? `${attempt.verifySampled ? "You showed it. " : ""}${dots} of 3 dots now.`
                  : moveClaim
                    ? `That wasn't the ${first ? "side phrase" : "part you covered"}. No dot this time, and nothing is lost.`
                    : "Your dots stay as they are. Nothing is lost."}
              </span>
            </p>
          </div>
          {offerMove && !moveClaim && (
            <div class="hn-hint">
              <p>Try the move next time: {first ? "cover the side phrase, find the subject, match its verb." : move.coach.en.rule}</p>
              <Button variant="secondary" icon="lightbulb" disabled={blocked} onClick={openMove}>Open The move</Button>
            </div>
          )}
          {playing && <ShowMe question={q} lang={learner.lang} coach={learner.coach} doneLabel="Done" note="Free look: nothing lost" onDone={() => setPlaying(false)} />}
          <div class="hn-actions">
            <Button variant="secondary" icon="play" disabled={blocked} onClick={freeLook}>{attempt.freeLook ? "Watch again" : "Show me, free look"}</Button>
            <Button disabled={blocked} onClick={next}>{attempt.freeLook ? "Next question" : "Next"}</Button>
          </div>
        </>
      )}
    </section>
  );
}

// Arrow keys move between the three choices; nothing is chosen until Enter or Space.
function arrowFocus(e: KeyboardEvent) {
  const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
  if (!step) return;
  const all = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="radio"]')];
  const at = all.indexOf(document.activeElement as HTMLElement);
  e.preventDefault();
  all.forEach((b, i) => (b.tabIndex = i === (at + step + all.length) % all.length ? 0 : -1));
  all[(at + step + all.length) % all.length]?.focus();
}
