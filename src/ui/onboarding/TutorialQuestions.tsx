import { useState } from "preact/hooks";
import { tutorialQuestions } from "../../content/generate.ts";
import { stripDisguise } from "../../content/strip-disguise.ts";
import { QuestionView } from "../practice/QuestionView";

// The three tutorial questions run through the normal question view with origin "tutorial",
// so the rules give them no scores, dots or claims (spec section 4).
export function TutorialQuestions({ onDone }: { onDone: () => void }) {
  const [questions] = useState(() => tutorialQuestions(stripDisguise, Math.random));
  const [n, setN] = useState(0);
  const q = questions[n]!;
  return (
    <QuestionView
      key={q.id}
      question={q}
      origin="tutorial"
      round={{ n: n + 1, of: questions.length }}
      onDone={() => (n + 1 < questions.length ? setN(n + 1) : onDone())}
      // ponytail: leaving restarts the three tutorial questions on return; they earn nothing, so nothing is lost.
      onExit={() => location.assign("/")}
    />
  );
}
