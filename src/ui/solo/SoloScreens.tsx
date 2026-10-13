// /solo-entry shows the entry card for the learner's real readiness; /solo is the check itself (step 11).
import { useLocation } from "preact-iso";
import { readiness } from "../../rules/practice.ts";
import { attemptsOf, runStartsOf } from "../../storage/progress.ts";
import { Button } from "../components/Button";
import { useProgress } from "../progress";
import { SoloEntry } from "./SoloEntry";

export function SoloEntryScreen() {
  const { store } = useProgress();
  const { route } = useLocation();
  const { dots } = readiness(attemptsOf(store.progress), runStartsOf(store.progress));
  return <SoloEntry dots={dots as 0 | 1 | 2 | 3} onStart={() => route("/solo")} onPractise={() => route("/practice")} />;
}

// ponytail: placeholder until roadmap step 11 builds the solo check here.
export function Solo() {
  const { route } = useLocation();
  return (
    <main class="so so-soon">
      <h1>Solo check is coming</h1>
      <p>Ten questions, no help, ten minutes. It is not built yet.</p>
      <div class="so-actions">
        <Button onClick={() => route("/")}>Back to Home</Button>
      </div>
    </main>
  );
}
