import { expect, test } from "vitest";
import { systemClock } from "./clock";

test("systemClock reports the current time in milliseconds", () => {
  const before = Date.now();
  const now = systemClock.now();
  expect(now).toBeGreaterThanOrEqual(before);
  expect(now).toBeLessThanOrEqual(Date.now());
});
