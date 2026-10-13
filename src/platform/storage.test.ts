import { afterEach, expect, test, vi } from "vitest";
import { claimWriter } from "./storage.ts";

afterEach(() => vi.unstubAllGlobals());

test("claims the writer lock when it is free", async () => {
  vi.stubGlobal("navigator", { locks: { request: (_n: string, _o: unknown, cb: () => Promise<void>) => (cb(), new Promise(() => {})) } });
  expect(await claimWriter("free")).toBe("owner");
});

test("a page that owns the lock keeps it: claiming again, as a retry does, returns owner without a new request", async () => {
  const request = vi.fn((_n: string, _o: unknown, cb: () => Promise<void>) => (cb(), new Promise(() => {})));
  vi.stubGlobal("navigator", { locks: { request } });
  expect(await claimWriter("retry")).toBe("owner");
  expect(await claimWriter("retry", 20)).toBe("owner");
  expect(request).toHaveBeenCalledTimes(1);
});

test("gives up and opens read-only when another tab keeps the lock past the wait", async () => {
  const request = vi.fn((_n: string, opts: { signal: AbortSignal }) => new Promise((_, reject) => opts.signal.addEventListener("abort", () => reject(opts.signal.reason))));
  vi.stubGlobal("navigator", { locks: { request } });
  expect(await claimWriter("busy", 20)).toBe("taken");
  expect(request.mock.calls[0]![1]).toHaveProperty("signal");
});

test("without the Locks API every tab may write", async () => {
  vi.stubGlobal("navigator", {});
  expect(await claimWriter("none")).toBe("unsupported");
});
