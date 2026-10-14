// The five-question practice round at /practice (spec section 5).
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { cue } from "../../platform/sound.ts";
import { moves, stripDisguiseMove } from "../../content/moves.ts";
import { nextPracticeQuestion, type Move, type Question } from "../../content/generate.ts";
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
import { Learn } from "../learn/Learn";
import { LockedMove, useMove, useMoveGate, withMove } from "../move.ts";
import { Honesty } from "./Honesty";
import { SoloEntry } from "../solo/SoloEntry";
import "./Practice.css";

type Step = { kind: "intro" } | { kind: "question"; question: Question; resume?: SavedAttempt; n: number; key: string } | { kind: "summary" } | { kind: "ready" };

// An unfinished practice question comes back as it was; otherwise a fresh one, never the same as the last.
function begin(store: ProgressStore, pack: Move): Step {
  const p = store.progress;
  const n = doneInRound(attemptsOf(p, pack.moveId)) + 1;
  const point = resumePoint(p, pack.moveId);
  if (point?.kind === "question" && point.saved.attempt.origin === "practice")
    return { kind: "question", question: point.saved.question, resume: point.saved, n, key: point.saved.attempt.id };
  // A pending How did you know or verification: the question is already scored, so it is the one just finished.
  if (point && point.kind !== "question")
    return { kind: "question", question: point.saved.question, resume: point.saved, n: n === 1 ? ROUND_SIZE : n - 1, key: point.saved.attempt.id };
  const last = attemptsOf(p, pack.moveId).filter((a) => a.origin === "practice").sort((x, y) => inOrder(x.startedAt, y.startedAt)).at(-1);
  const question = nextPracticeQuestion(pack, Math.random, last?.questionId);
  return { kind: "question", question, n, key: question.id + Math.random() };
}

export function Practice() {
  return useMoveGate().locked ? <LockedMove /> : <PracticeInner />;
}

function PracticeInner() {
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
  const { store, idle } = useProgress();
  const { route } = useLocation();
  const pack = useMove();
  const hasLearner = !!store.progress.learner;
  const [step, setStep] = useState<Step | null>(null);
  useEffect(() => {
    if (!hasLearner) return route("/", true);
    // A save from the screen the learner just closed may still be landing; resume from what it saved.
    let live = true;
    idle().then(() => {
      if (!live) return;
      // First visit to a later move: Learn the move before the first question. Nothing is saved; any attempt skips it.
      const first = pack !== stripDisguiseMove && attemptsOf(store.progress, pack.moveId).length === 0;
      setStep(first ? { kind: "intro" } : begin(store, pack));
    });
    return () => void (live = false);
  }, [hasLearner, pack.moveId]);
  if (!step || !hasLearner) return null;

  // The round's last answer is already saved when this runs from Next; the celebration belongs to that action.
  const after = () => {
    const roundDone = doneInRound(attemptsOf(store.progress, pack.moveId)) === 0;
    if (roundDone) cue("celebrate");
    setStep(roundDone ? { kind: "summary" } : begin(store, pack));
  };
  // The third dot earned by this answer shows the Solo-ready card before the next step; "Keep practising" carries on.
  const earnedThird = (a: PracticeAttempt) => {
    const dotsNow = (all: readonly PracticeAttempt[]) => readiness(all, runStartsOf(store.progress, pack.moveId)).dots;
    const others = attemptsOf(store.progress, pack.moveId).filter((x) => x.id !== a.id);
    return dotsNow([...others, a]) === 3 && dotsNow(others) < 3;
  };

  const learner = store.progress.learner!;
  if (step.kind === "intro")
    return (
      <Learn
        move={pack}
        lang={learner.lang}
        coach={learner.coach}
        doneLabel="Start practising"
        skippableBasics={moves.some((m) => attemptsOf(store.progress, m.moveId).length > 0)}
        onDone={() => setStep(begin(store, pack))}
        onClose={() => setStep(begin(store, pack))}
      />
    );
  if (step.kind === "summary") return <Summary pack={pack} onAnother={() => setStep(begin(store, pack))} onDone={() => (store.endSession().catch(() => {}), route("/"))} />;
  if (step.kind === "ready") return <SoloEntry pack={pack} dots={3} onStart={() => route(withMove("/run/solo", pack.moveId))} onPractise={after} />;
  return (
    <HelpedQuestion
      key={step.key}
      question={step.question}
      origin="practice"
      resume={step.resume}
      round={{ n: step.n, of: ROUND_SIZE }}
      onExit={() => route("/")}
      afterCorrect={(ctx) => <Honesty ctx={ctx} question={step.question} />}
      onDone={(a) => (earnedThird(a) ? setStep({ kind: "ready" }) : after())}
    />
  );
}

function Summary({ pack, onAnother, onDone }: { pack: Move; onAnother(): void; onDone(): void }) {
  const { store } = useProgress();
  const round: PracticeAttempt[] = lastRound(attemptsOf(store.progress, pack.moveId));
  const right = round.filter(firstTry).length;
  const { dots } = readiness(attemptsOf(store.progress, pack.moveId), runStartsOf(store.progress, pack.moveId));
  return (
    <main class="pr-summary">
      <div class="pr-hero">
        {store.progress.learner?.coach === "character" && <Bo pose={right >= 3 ? "pleased" : "concerned"} size={120} />}
        <h1>Round done</h1>
        <p class="pr-lead">{right} of {ROUND_SIZE} right on the first try.</p>
      </div>
      <div class="pr-detail">
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
          <a class="pr-solo" href={withMove("/solo-entry", pack.moveId)}>Solo check</a>
        </div>
      </div>
    </main>
  );
}
