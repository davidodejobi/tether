import { readiness } from "../../rules/practice.ts";
import { attemptsOf, runStartsOf } from "../../storage/progress.ts";
import { Identity } from "../components/Avatar";
import { Dots } from "../components/Dots";
import { ProofCard } from "../proof/ProofCard";
import { useProgress } from "../progress";

export function Home() {
  const { store } = useProgress();
  const { dots } = readiness(attemptsOf(store.progress), runStartsOf(store.progress));
  return (
    <main class="page">
      <h1>Tether</h1>
      {store.progress.learner && <Identity learner={store.progress.learner} />}
      <p>JAMB English concord. Move 1: Strip the Disguise.</p>
      <Dots filled={dots as 0 | 1 | 2 | 3} />
      <ProofCard />
      <p>
        <a href="/practice">Practice</a> <a href="/solo-entry">Solo check</a> <a href="/settings">Settings</a>
      </p>
    </main>
  );
}
