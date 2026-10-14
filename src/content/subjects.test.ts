import { expect, test } from "vitest";
import { extrasOf, SUBJECTS, subjectsOf } from "./subjects.ts";

test("subject list has unique ids; absent subjects means English only", () => {
  expect(SUBJECTS).toHaveLength(24); // the names the owner gave number 24, not 23
  expect(new Set(SUBJECTS.map((s) => s.id)).size).toBe(24);
  expect(subjectsOf({})).toEqual(["english"]);
  expect(extrasOf({ subjects: ["english", "biology"] })).toEqual(["biology"]);
});
