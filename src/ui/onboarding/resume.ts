import type { Learner } from "../../storage/progress.ts";

export type Step = "welcome" | "subjects" | "nickname" | "course" | "lesson" | "questions" | "win" | "preferences";

/**
 * Where onboarding starts, from saved fields only. Welcome, Subjects and Nickname come before the learner is saved;
 * the first-win and preferences screens are short and are reached from the questions within one visit.
 */
export function resumeStep(learner: Pick<Learner, "lessonDone" | "subjects"> | null): Step {
  if (!learner) return "welcome";
  if (learner.lessonDone) return "questions";
  // New learners save their subjects with the nickname, so one without a lesson yet is at the course map.
  // Older learners have no subjects and go straight to the lesson. Subjects are held in memory until the nickname is saved.
  return learner.subjects ? "course" : "lesson";
}
