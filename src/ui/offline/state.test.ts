import { expect, test } from "vitest";
import { offlineState } from "./state.ts";

test("Ready offline needs the worker's report of zero missing entries", () => {
  expect(offlineState({ supported: true, online: true, missing: 0 })).toBe("ready");
  expect(offlineState({ supported: true, online: false, missing: 0 })).toBe("ready");
  expect(offlineState({ supported: true, online: true, missing: null })).toBe("preparing");
});
test("a partial cache is partial whether or not the network is up", () => {
  expect(offlineState({ supported: true, online: true, missing: 2 })).toBe("partial");
  expect(offlineState({ supported: true, online: false, missing: 2 })).toBe("partial");
});
test("offline with no cache report explains the one initial download", () => {
  expect(offlineState({ supported: true, online: false, missing: null })).toBe("needsDownload");
});
test("no service worker support shows nothing", () => {
  expect(offlineState({ supported: false, online: true, missing: 0 })).toBe("unsupported");
});
