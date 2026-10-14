// "English · 1 of 50 stages available · 0 completed" with a slim bar. The text carries the meaning; the bar is decoration.
import { allStages, english } from "../../content/catalogue.ts";
import { countStages, progressLine } from "../../rules/course-counts.ts";
import { useProgress } from "../progress";
import "./course.css";

export function useCounts(stages: readonly { moveId?: string }[]) {
  const { store } = useProgress();
  return countStages(stages, { cycles: store.progress.cycles.values(), runs: store.progress.runs.values() });
}

export function CourseProgress({ link = true }: { link?: boolean }) {
  const c = useCounts(allStages(english));
  return (
    <div class="cp">
      <p class="cp-text">{progressLine(c)}</p>
      <div class="cp-bar" aria-hidden="true">
        <span class="cp-avail" style={{ width: `${(c.available / c.planned) * 100}%` }} />
        <span class="cp-done" style={{ width: `${(c.completed / c.planned) * 100}%` }} />
      </div>
      {link && <a class="cp-link" href="/course">View the English course</a>}
    </div>
  );
}
