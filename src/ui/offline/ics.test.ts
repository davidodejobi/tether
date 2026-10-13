import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics.ts";

const base = { date: "2026-10-15", timeZone: "Africa/Lagos", summary: "Tether recheck", uid: "x@tether", now: Date.UTC(2026, 9, 12, 8, 30, 5) };

describe("buildIcs", () => {
  it("is an all-day event ending the next day, CRLF terminated", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261015\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20261016\r\n");
    expect(ics).toContain("DTSTAMP:20261012T083005Z\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("rolls over month and year ends", () => {
    expect(buildIcs({ ...base, date: "2026-12-31" })).toContain("DTEND;VALUE=DATE:20270101");
    expect(buildIcs({ ...base, date: "2028-02-28" })).toContain("DTEND;VALUE=DATE:20280229");
  });
  it("keeps the cycle's time zone", () => {
    expect(buildIcs({ ...base, timeZone: "America/New_York" })).toContain("X-WR-TIMEZONE:America/New_York");
  });
  it("escapes text", () => {
    const ics = buildIcs({ ...base, summary: "a, b; c\\d", description: "one\ntwo" });
    expect(ics).toContain("SUMMARY:a\\, b\; c\\\\d");
    expect(ics).toContain("DESCRIPTION:one\\ntwo");
  });
  it("folds long lines at 75 octets without splitting a character", () => {
    const ics = buildIcs({ ...base, description: "é".repeat(100) });
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(ics.replace(/\r\n /g, "")).toContain("DESCRIPTION:" + "é".repeat(100));
  });
});
