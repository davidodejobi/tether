import { describe, expect, it } from "vitest";
import { autoLine } from "./speech.ts";

describe("autoLine", () => {
  it("speaks a new line once", () => {
    expect(autoLine(true, false, "Hi", null)).toBe("Hi");
    expect(autoLine(true, false, "Hi", "Hi")).toBeNull();
    expect(autoLine(true, false, "Bye", "Hi")).toBe("Bye");
  });
  it("stays quiet when off, hidden or empty", () => {
    expect(autoLine(false, false, "Hi", null)).toBeNull();
    expect(autoLine(true, true, "Hi", null)).toBeNull();
    expect(autoLine(true, false, "", null)).toBeNull();
  });
});
