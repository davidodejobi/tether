// After a correct answer: How did you know, verification and free looks (spec section 6).
// Plugs into QuestionView's afterCorrect slot. Everything it shows comes from the saved attempt,
// so a reload on a pending reason or verification brings the same prompt back.
import { useEffect, useRef, useState } from "preact/hooks";
import type { Question } from "../../content/generate.ts";
import { asksReason, giveReason, readiness, verify, type Reason } from "../../rules/practice.ts";
import { attemptsOf, runStartsOf } from "../../storage/progress.ts";
import { Bo } from "../components/Bo";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { useProgress } from "../progress";
import type { CorrectContext } from "./QuestionView";
import { ShowMeSlot } from "./ShowMeSlot";
import "./Honesty.css";

export const HONESTY_INTRO = "Tell us the truth and nothing is lost. Dots only come from using the move. The solo check is what proves it. Sometimes we’ll ask you to show it.";

const CHOICES: { reason: Reason; label: string }[] = [
  { reason: "move", label: "I used the move" },
  { reason: "sounded", label: "It sounded right" },
  { reason: "guessed", label: "I guessed" },
];

type Chip = { word: string; part: "subject" | "covered" | "other" };
/** The sentence as tappable words, each tagged by whether it belongs to the covered side phrase. */
function chips(q: Question): Chip[] {
  const words = (text: string, part: Chip["part"], comma = false) =>
    text.split(" ").map((word, i, all) => ({ word: comma && i === all.length - 1 ? `${word},` : word, part }));
  return [...words(q.subject, "subject", true), ...words(q.covered, "covered", true), ...words(q.answer, "other"), ...words(q.predicate, "other")];
}

export function Honesty({ ctx, question: q }: { ctx: CorrectContext; question: Question }) {
  const { attempt, next, update, help, openMove } = ctx;
  const { store, save } = useProgress();
  const learner = store.progress.learner!;
  const { dots, offerMove } = readiness(attemptsOf(store.progress), runStartsOf(store.progress));
  const [tapped, setTapped] = useState<number | null>(null);
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
  const [intro] = useState(() => phase === "reason" && !learner.honestyIntroSeen);
  useEffect(() => {
    if (!intro) return;
    // The answer's own save may still be running (the store takes one save at a time), so try again briefly.
    const mark = (left: number) => save({ learner: { ...learner, honestyIntroSeen: true } }).catch(() => left > 0 && setTimeout(() => mark(left - 1), 250));
    void mark(4);
  }, []);

  const choose = (reason: Reason) => update(giveReason(attempt, reason, Math.random, store.moment(Date.now())));
  const tap = (i: number, covered: boolean) => {
    setTapped(i);
    update(verify(attempt, covered, store.moment(Date.now())));
  };

  if (phase === "plain")
    return (
      <div class="qv-correct">
        <Bo pose="pleased" size={96} />
        <h2 class="qv-correct-word" tabIndex={-1} ref={heading}><Icon name="check" size={24} /> Correct</h2>
        <Button onClick={next}>Next</Button>
      </div>
    );

  const showChips = phase === "verify" || (phase === "done" && attempt.verifySampled);
  const words = showChips ? chips(q) : [];
  const moveClaim = attempt.reason === "move";
  const earned = moveClaim && (!attempt.verifySampled || attempt.verifyResult === "passed");

  return (
    <section class={`hn${showChips ? " hn-chips-mode" : ""}`}>
      {phase === "reason" && (
        <>
          <h2 class="hn-correct"><Icon name="check" size={24} /> Correct</h2>
          {intro && (
            <p class="hn-intro">
              <Icon name="lightbulb" size={20} /> {HONESTY_INTRO}
            </p>
          )}
          <div class="hn-ask">
            <Bo pose="idle" size={48} />
            <h3 tabIndex={-1} ref={heading}>How did you know?</h3>
          </div>
          <div class="hn-choices" role="radiogroup" aria-label="How did you know?" onKeyDown={arrowFocus}>
            {CHOICES.map((c, i) => (
              <button key={c.reason} type="button" role="radio" aria-checked="false" tabIndex={i === 0 ? 0 : -1} class="hn-choice" onClick={() => choose(c.reason)}>
                {c.label}
              </button>
            ))}
          </div>
          <p class="hn-foot">Sometimes we will ask you to show it.</p>
        </>
      )}

      {showChips && (
        <>
          <div class="hn-ask">
            <Bo pose={phase === "verify" ? "thinking" : "idle"} size={48} />
            <h3 tabIndex={-1} ref={heading}>Show us. Tap the part you covered.</h3>
          </div>
          <div class="hn-words" role="group" aria-label="The sentence. Tap the part you covered.">
            {words.map((w, i) => {
              const result = phase === "done" ? (w.part === "covered" ? "covered" : tapped === i ? "wrong" : "") : "";
              return (
                <button
                  key={i}
                  type="button"
                  class={`hn-word ${result ? `hn-word-${result}` : ""}`}
                  disabled={phase === "done"}
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
            {!showChips && <h3 tabIndex={-1} ref={heading}>Thanks for telling us.</h3>}
            <p class="hn-msg">
              <Icon name={earned ? "check" : "lightbulb"} size={20} />
              <span>
                {earned
                  ? `${attempt.verifySampled ? "You showed it. " : ""}${dots} of 3 dots now.`
                  : moveClaim
                    ? "That wasn't the side phrase. No dot this time, and nothing is lost."
                    : "Your dots stay as they are. Nothing is lost."}
              </span>
            </p>
          </div>
          {offerMove && !moveClaim && (
            <div class="hn-hint">
              <p>Try the move next time: cover the side phrase, find the subject, match its verb.</p>
              <Button variant="secondary" icon="lightbulb" onClick={openMove}>Open The move</Button>
            </div>
          )}
          {attempt.freeLook && <ShowMeSlot />}
          <div class="hn-actions">
            {!attempt.freeLook && <Button variant="secondary" icon="play" onClick={() => help("showMe")}>Show me, free look</Button>}
            <Button onClick={next}>{attempt.freeLook ? "Next question" : "Next"}</Button>
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
