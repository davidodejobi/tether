// The five-question practice round at /practice (spec section 5).
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { stripDisguise as pack } from "../../content/strip-disguise.ts";
import { nextPracticeQuestion, type Question } from "../../content/generate.ts";
import { inOrder } from "../../rules/moment.ts";
import { readiness, type PracticeAttempt } from "../../rules/practice.ts";
import { ROUND_SIZE, doneInRound, firstTry, lastRound } from "../../rules/round.ts";
import { attemptsOf, resumePoint, runStartsOf, type ProgressStore, type SavedAttempt } from "../../storage/progress.ts";
import { Bo } from "../components/Bo";
import { Button } from "../components/Button";
import { Dots } from "../components/Dots";
import { Icon } from "../components/Icon";
import { useProgress, useProgressState } from "../progress";
import { HelpedQuestion } from "../help/HelpedQuestion";
import "./Practice.css";

type Step = { kind: "question"; question: Question; resume?: SavedAttempt; n: number; key: string } | { kind: "summary" };

// An unfinished practice question comes back as it was; otherwise a fresh one, never the same as the last.
function begin(store: ProgressStore): Step {
  const p = store.progress;
  const n = doneInRound(attemptsOf(p)) + 1;
  const point = resumePoint(p);
  if (point?.kind === "question" && point.saved.attempt.origin === "practice")
    return { kind: "question", question: point.saved.question, resume: point.saved, n, key: point.saved.attempt.id };
  const last = attemptsOf(p).filter((a) => a.origin === "practice").sort((x, y) => inOrder(x.startedAt, y.startedAt)).at(-1);
  const question = nextPracticeQuestion(pack, Math.random, last?.questionId);
  return { kind: "question", question, n, key: question.id + Math.random() };
}

export function Practice() {
  const state = useProgressState();
  if (state.status === "opening") return <main class="pr-note"><p>Opening your progress…</p></main>;
  if (state.status === "couldNotOpen")
    return (
      <main class="pr-note">
        <p>Couldn't open your saved progress.</p>
        <Button onClick={state.retry}>Retry</Button>
      </main>
    );
  return <Round />;
}

function Round() {
  const { store } = useProgress();
  const { route } = useLocation();
  const hasLearner = !!store.progress.learner;
  const [step, setStep] = useState<Step | null>(() => (hasLearner ? begin(store) : null));
  useEffect(() => {
    if (!hasLearner) route("/", true);
  }, [hasLearner]);
  if (!step || !hasLearner) return null;

  if (step.kind === "summary") return <Summary onAnother={() => setStep(begin(store))} onDone={() => route("/")} />;
  return (
    <HelpedQuestion
      key={step.key}
      question={step.question}
      origin="practice"
      resume={step.resume}
      round={{ n: step.n, of: ROUND_SIZE }}
      onExit={() => route("/")}
      onDone={() => setStep(doneInRound(attemptsOf(store.progress)) === 0 ? { kind: "summary" } : begin(store))}
    />
  );
}

function Summary({ onAnother, onDone }: { onAnother(): void; onDone(): void }) {
  const { store } = useProgress();
  const round: PracticeAttempt[] = lastRound(attemptsOf(store.progress));
  const right = round.filter(firstTry).length;
  const { dots } = readiness(attemptsOf(store.progress), runStartsOf(store.progress));
  return (
    <main class="pr-summary">
      <Bo pose={right >= 3 ? "pleased" : "concerned"} size={120} />
      <h1>Round done</h1>
      <p class="pr-lead">{right} of {ROUND_SIZE} right on the first try.</p>
      <ol class="pr-marks" aria-label="Each question">
        {round.map((a, i) => (
          <li key={a.id} class={firstTry(a) ? "pr-mark pr-mark-ok" : "pr-mark pr-mark-miss"}>
            <span class="pr-badge">
              <Icon name={firstTry(a) ? "check" : "x"} size={24} label={firstTry(a) ? "Right first try" : "Needed more than one try"} />
            </span>
            <span>{i + 1}</span>
          </li>
        ))}
      </ol>
      <Dots filled={dots as 0 | 1 | 2 | 3} />
      <p class="pr-note-text">Dots come from showing you used the move. You have {dots} of 3 so far.</p>
      <div class="pr-actions">
        <Button onClick={onAnother}>Another 5</Button>
        <Button variant="secondary" onClick={onDone}>Done for today</Button>
      </div>
    </main>
  );
}
