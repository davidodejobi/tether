// /solo-entry shows the entry card for the learner's real readiness; /run/solo is the check itself (src/ui/runs).
import { useLocation } from "preact-iso";
import { readiness } from "../../rules/practice.ts";
import { attemptsOf, runStartsOf } from "../../storage/progress.ts";
import { useProgress } from "../progress";
import { SoloEntry } from "./SoloEntry";

export function SoloEntryScreen() {
  const { store } = useProgress();
  const { route } = useLocation();
  const { dots } = readiness(attemptsOf(store.progress), runStartsOf(store.progress));
  return <SoloEntry dots={dots as 0 | 1 | 2 | 3} onStart={() => route("/run/solo")} onPractise={() => route("/practice")} />;
}
