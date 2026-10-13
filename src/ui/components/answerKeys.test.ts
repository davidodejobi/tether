import { describe, expect, it } from "vitest";
import { targetTile } from "./answerKeys";

const struck = [false, true, false, false];

describe("targetTile", () => {
  it("maps 1-4 to tiles and ignores struck or missing ones", () => {
    expect(targetTile("3", 0, struck)).toBe(2);
    expect(targetTile("2", 0, struck)).toBeNull();
    expect(targetTile("9", 0, struck)).toBeNull();
  });
  it("arrows skip struck tiles and wrap", () => {
    expect(targetTile("ArrowRight", 0, struck)).toBe(2);
    expect(targetTile("ArrowLeft", 0, struck)).toBe(3);
    expect(targetTile("ArrowUp", 2, struck)).toBe(0);
  });
  it("space picks the focused tile unless struck", () => {
    expect(targetTile(" ", 2, struck)).toBe(2);
    expect(targetTile(" ", 1, struck)).toBeNull();
  });
  it("other keys do nothing", () => {
    expect(targetTile("Enter", 0, struck)).toBeNull();
  });
});
