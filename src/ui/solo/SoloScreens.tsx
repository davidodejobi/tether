// /solo-entry shows the entry card for the learner's real readiness; /run/solo is the check itself (src/ui/runs).
import { useLocation } from "preact-iso";
import { readiness } from "../../rules/practice.ts";
import { attemptsOf, runStartsOf } from "../../storage/progress.ts";
import { useMove, withMove } from "../move.ts";
import { useProgress } from "../progress";
import { SoloEntry } from "./SoloEntry";

export function SoloEntryScreen() {
  const { store } = useProgress();
  const { route } = useLocation();
  const pack = useMove();
  const { dots } = readiness(attemptsOf(store.progress, pack.moveId), runStartsOf(store.progress, pack.moveId));
  return <SoloEntry pack={pack} dots={dots as 0 | 1 | 2 | 3} onStart={() => route(withMove("/run/solo", pack.moveId))} onPractise={() => route(withMove("/practice", pack.moveId))} />;
}
