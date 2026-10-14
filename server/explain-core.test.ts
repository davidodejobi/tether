import { describe, expect, it } from "vitest";
import { stripDisguise as pack } from "../src/content/strip-disguise.ts";
import { buildPrompt, checkOutput, parseRequest } from "./explain-core.ts";
import { limited } from "../functions/api/explain.ts";

const good = { moveId: pack.moveId, contentVersion: pack.version, style: "plain" };

describe("parseRequest", () => {
  it("accepts exactly the three fields", () => {
    expect(parseRequest(good)).toEqual(good);
    expect(parseRequest({ ...good, style: "analogy" })?.style).toBe("analogy");
  });
  it.each([
    ["extra field", { ...good, text: "hi" }],
    ["missing field", { moveId: good.moveId, style: "plain" }],
    ["bad style", { ...good, style: "chat" }],
    ["unknown move", { ...good, moveId: "other" }],
    ["unapproved version", { ...good, contentVersion: pack.version + 1 }],
    ["string version", { ...good, contentVersion: String(pack.version) }],
    ["array", []],
    ["null", null],
    ["string", "x"],
  ])("rejects %s", (_, body) => expect(parseRequest(body)).toBeNull());
  it("rejects a pack whose English review is not approved", () => {
    const p = { ...pack, review: { ...pack.review, en: { status: "pending" as const } } };
    expect(parseRequest(good, p)).toBeNull();
  });
});

describe("buildPrompt", () => {
  const { system, user } = buildPrompt("plain");
  it("contains the reviewed rule and constraints", () => {
    expect(system).toContain(pack.coach.en.rule);
    expect(system).toContain(pack.coach.en.explanation);
    expect(system).toMatch(/90 words/);
    expect(system).toMatch(/Never give or choose an answer/);
  });
  it("differs by style and carries no question data", () => {
    expect(buildPrompt("analogy").user).not.toBe(user);
    expect(buildPrompt("analogy").user).toMatch(/analogy/);
    for (const s of pack.subjects) expect(system + user).not.toContain(s.text);
  });
});

describe("checkOutput", () => {
  const ok = "Side phrases like along with only add extra people. Cover them and read what is left. The verb then matches that part.";
  it("accepts a short plain explanation", () => expect(checkOutput(ok)).toBeNull());
  it("rejects non-text, empty, markdown and lists", () => {
    expect(checkOutput(undefined)).not.toBeNull();
    expect(checkOutput("  ")).not.toBeNull();
    expect(checkOutput("**Cover** the phrase.")).not.toBeNull();
    expect(checkOutput("First.\nSecond.")).not.toBeNull();
    expect(checkOutput("- cover it")).not.toBeNull();
  });
  it("enforces three sentences and 90 words", () => {
    expect(checkOutput("One. Two. Three. Four.")).toBe("too many sentences");
    expect(checkOutput(Array(91).fill("word").join(" ") + ".")).toBe("too many words");
    expect(checkOutput(Array(90).fill("word").join(" ") + ".")).toBeNull();
  });
  it("rejects option verbs used as an instruction", () => {
    for (const v of ["is", "are", "has", "walks", "having"]) expect(checkOutput(`Now use ${v} here.`)).toBe("instructs a verb");
    expect(checkOutput("Then pick the verb 'are'.")).toBe("instructs a verb");
  });
  it("allows verbs that are not instructed", () => expect(checkOutput("A singular subject takes a singular verb such as is or has.")).toBeNull());
  it("rejects answer-giving and grading phrases", () => {
    for (const t of ["The answer is clear.", "Choose carefully.", "That is the correct option.", "Well done, you got it.", "You should pick the first one."])
      expect(checkOutput(t)).not.toBeNull();
  });
});

describe("limited", () => {
  it("allows ten per minute per client, then recovers", () => {
    for (let i = 0; i < 10; i++) expect(limited("a", 1000 + i)).toBe(false);
    expect(limited("a", 1100)).toBe(true);
    expect(limited("b", 1100)).toBe(false);
    expect(limited("a", 62_000)).toBe(false);
  });
});
