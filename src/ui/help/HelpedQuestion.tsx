// The question view with the help ladder plugged into its slots (spec section 5). Practice and the tutorial both
// render this, so tutorials get the same ladder. Any QuestionView prop (such as afterCorrect) passes straight through.
//   1 miss: nudge + Try again.  2 misses: Show me offered prominently.  3 misses: tiles hidden, Go deeper.
//   Show me (button or S): records help("showMe"), plays ShowMe, then "Put it in yourself" returns to the question.
import { useEffect, useRef, useState } from "preact/hooks";
import type { Question } from "../../content/generate.ts";
import { pack } from "./steps.ts";
import type { PracticeAttempt } from "../../rules/practice.ts";
import { Button } from "../components/Button";
import { CoachBubble } from "../components/CoachBubble";
import { useProgress } from "../progress";
import { QuestionView, type MissContext, type QuestionViewProps, type ShowMeContext } from "../practice/QuestionView";
import { GoDeeper } from "./GoDeeper";
import { ShowMe } from "./ShowMe";
import "./help.css";

const helped = (a: PracticeAttempt) => a.help.includes("showMe") || a.help.includes("goDeeper");
// Tiles stay hidden from the third miss until the answer has been revealed or rebuilt, so elimination can't expose it.
const hideTiles = (a: PracticeAttempt, misses: number) => misses >= 3 && !helped(a);

export function HelpedQuestion(props: QuestionViewProps) {
  const { store } = useProgress();
  const learner = store.progress.learner!;
  const [playing, setPlaying] = useState(false);
  const question = props.question;

  // Show me plays only once its help mark is saved; if the save fails, the question stays and Retry appears.
  const open = ({ attempt, help }: ShowMeContext) => {
    if (attempt.completedAt !== undefined) return; // free looks after a correct answer belong to step 10
    if (attempt.help.includes("showMe")) setPlaying(true);
    else help("showMe", () => setPlaying(true));
  };
  const close = () => {
    setPlaying(false);
    setTimeout(() => document.querySelector<HTMLElement>('.qv [role="radio"]:not([aria-disabled])')?.focus(), 0);
  };

  const afterMiss = (ctx: MissContext) => (
    <Block ctx={ctx} question={question} coach={learner.coach} lang={learner.lang} onShowMe={() => open(ctx)} />
  );

  return (
    <>
      <QuestionView {...props} afterMiss={afterMiss} hideTiles={hideTiles} onShowMe={open} />
      {playing && <ShowMe question={question} lang={learner.lang} coach={learner.coach} onDone={close} />}
    </>
  );
}

function Block({ ctx, question, coach, lang, onShowMe }: { ctx: MissContext; question: Question; coach: "character" | "text"; lang: "en" | "pcm"; onShowMe(): void }) {
  const { attempt, misses, retry, help, blocked } = ctx;
  const copy = pack.coach[lang];
  const unreviewed = lang === "pcm" && pack.review.pcm.status !== "approved";
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus({ preventScroll: true }), [helped(attempt), misses >= 3]);

  if (misses >= 3 && !helped(attempt))
    return (
      <GoDeeper
        question={question}
        lang={lang}
        coach={coach}
        blocked={blocked}
        onFinish={() => help("goDeeper", () => setTimeout(retry, 0))}
      />
    );
  if (helped(attempt))
    return (
      <div class="hp">
        <CoachBubble mode={coach} pose={misses > 1 ? "concerned" : "nudge"}>
          {misses > 0 ? "Not quite. Pick again. " : "Now put it in yourself. "}
          Help counts as with help, so this one won't fill a dot.
        </CoachBubble>
        {misses > 0 && <button ref={first} type="button" class="btn btn-primary" disabled={blocked} onClick={retry}>Try again</button>}
      </div>
    );
  return (
    <div class="hp">
      <CoachBubble mode={coach} pose={misses === 1 ? "nudge" : "concerned"} unreviewed={unreviewed}>{copy.nudge}</CoachBubble>
      <div class="hp-actions">
        {misses >= 2 ? (
          <>
            <button ref={first} type="button" class="btn btn-primary" disabled={blocked} onClick={onShowMe}>Show me</button>
            <Button variant="secondary" disabled={blocked} onClick={retry}>Try again</Button>
          </>
        ) : (
          <button ref={first} type="button" class="btn btn-primary" disabled={blocked} onClick={retry}>Try again</button>
        )}
      </div>
    </div>
  );
}
