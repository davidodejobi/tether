// /learn?move=<id>: the lesson again, as a focus screen. It reads and writes nothing; Practise this move goes to practice.
import { useLocation } from "preact-iso";
import { Button } from "../components/Button";
import { LockedMove, useMove, useMoveGate, withMove } from "../move.ts";
import { useProgressState } from "../progress";
import { Learn } from "./Learn";

export function LearnScreen() {
  return useMoveGate().locked ? <LockedMove /> : <LearnInner />;
}

function LearnInner() {
  const state = useProgressState();
  const { route } = useLocation();
  const move = useMove();
  if (state.status === "opening") return <main><p>Opening your progress…</p></main>;
  if (state.status === "couldNotOpen")
    return (
      <main>
        <p>Couldn't open your saved progress.</p>
        <Button onClick={state.retry}>Retry</Button>
      </main>
    );
  const learner = state.store.progress.learner;
  if (!learner) return <main />;
  // Back to where the learner came from; with no history (a link opened fresh), Home.
  const close = () => (history.length > 1 ? history.back() : route("/"));
  return (
    <main>
      <Learn
        move={move}
        lang={learner.lang}
        coach={learner.coach}
        doneLabel="Practise this move"
        skippableBasics
        onDone={() => route(withMove("/practice", move.moveId))}
        onClose={close}
      />
    </main>
  );
}
