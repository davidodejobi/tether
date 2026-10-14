import { expect, test } from "vitest";
import { resumeStep } from "./resume.ts";

test("resume step follows saved fields", () => {
  expect(resumeStep(null)).toBe("welcome");
  expect(resumeStep({ lessonDone: false })).toBe("lesson");
  expect(resumeStep({ lessonDone: false, subjects: ["english"] })).toBe("course");
  expect(resumeStep({ lessonDone: true, subjects: ["english"] })).toBe("questions");
});
