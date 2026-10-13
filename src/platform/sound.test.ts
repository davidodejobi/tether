import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const played: string[] = [];
let volume: number | undefined;
vi.mock("cuelume", () => ({ play: (n: string) => played.push(n), setVolume: (v: number) => (volume = v), setEnabled: () => {}, unlock: async () => true }));

const { cue, setProofMode, setSoundsOn } = await import("./sound.ts");
const tick = () => Promise.resolve();

beforeEach(() => {
  played.length = 0;
  setProofMode(false);
  setSoundsOn(true);
});
afterEach(() => vi.unstubAllGlobals());

describe("sound gating", () => {
  test("uses a fixed quiet volume", () => expect(volume).toBe(0.2));

  test("plays nothing while off, and mute stops a pending cue", async () => {
    setSoundsOn(false);
    cue("correct");
    await tick();
    expect(played).toEqual([]);
    setSoundsOn(true);
    cue("correct");
    setSoundsOn(false); // before the microtask
    await tick();
    expect(played).toEqual([]);
  });

  test("proof mode keeps every cue silent, including the celebration; leaving it restores sound", async () => {
    setProofMode(true);
    cue("tap");
    cue("celebrate");
    await tick();
    expect(played).toEqual([]);
    setProofMode(false);
    cue("celebrate");
    await tick();
    expect(played).toEqual(["success"]);
  });

  test("a hidden tab and read-aloud are silent", async () => {
    vi.stubGlobal("document", { visibilityState: "hidden" });
    cue("tap");
    await tick();
    expect(played).toEqual([]);
    vi.stubGlobal("document", { visibilityState: "visible" });
    vi.stubGlobal("window", { speechSynthesis: { speaking: true, pending: false } });
    cue("tap");
    await tick();
    expect(played).toEqual([]);
    vi.stubGlobal("window", { speechSynthesis: { speaking: false, pending: false } });
    cue("tap");
    await tick();
    expect(played).toEqual(["tap"]);
  });

  test("one action plays one cue: the larger of those requested together", async () => {
    cue("tap");
    cue("celebrate");
    cue("select");
    await tick();
    expect(played).toEqual(["success"]);
  });

  test("an engine that throws is harmless", async () => {
    vi.resetModules();
    vi.doMock("cuelume", () => ({ play: () => { throw new Error("no audio"); }, setEnabled: () => { throw new Error("x"); }, setVolume: () => { throw new Error("x"); }, unlock: () => { throw new Error("x"); } }));
    const s = await import("./sound.ts");
    expect(() => (s.setSoundsOn(true), s.unlockSound(), s.cue("tap"))).not.toThrow();
    await tick();
  });
});
