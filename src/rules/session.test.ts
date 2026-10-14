import { expect, test } from "vitest";
import { endSession, IDLE_MS, touch } from "./session.ts";

test("touches within 30 minutes extend one session and hidden time is excluded", () => {
  let s = touch([], 1000);
  s = touch(s, 6000);
  s = touch(s, 16000, 4000);
  expect(s).toEqual([{ start: 1000, last: 16000, activeMs: 11000 }]);
});

test("30 minutes of inactivity closes the session and starts another", () => {
  const s = touch(touch([], 0), IDLE_MS);
  expect(s).toEqual([{ start: 0, last: 0, activeMs: 0, end: "idle" }, { start: IDLE_MS, last: IDLE_MS, activeMs: 0 }]);
});

test("Done for today ends the session; the next touch starts a new one", () => {
  const done = endSession(touch([], 0));
  expect(done[0]?.end).toBe("done");
  expect(touch(done, 5)).toHaveLength(2);
  expect(endSession(done)).toEqual(done);
});

test("time before the page loaded (app closed) is not active time", () => {
  const s = touch(touch([], 0), 20 * 60_000, 0, 19 * 60_000);
  expect(s).toEqual([{ start: 0, last: 20 * 60_000, activeMs: 60_000 }]);
});
