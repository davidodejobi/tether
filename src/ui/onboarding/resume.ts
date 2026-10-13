import type { Learner } from "../../storage/progress.ts";

export type Step = "welcome" | "nickname" | "lesson" | "questions" | "win" | "preferences";

/**
 * Where onboarding starts, from saved fields only. Welcome and Nickname come before the learner is saved;
 * the first-win and preferences screens are short and are reached from the questions within one visit.
 */
export function resumeStep(learner: Pick<Learner, "lessonDone"> | null): Step {
  if (!learner) return "welcome";
  return learner.lessonDone ? "questions" : "lesson";
}
