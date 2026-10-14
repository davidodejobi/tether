// An all-day iCalendar event for the next scheduled recheck (spec section 11). Pure, so it works offline.

const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const compact = (date: string) => date.replaceAll("-", "");
const nextDay = (date: string) => {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};
const stamp = (at: number) => new Date(at).toISOString().replace(/[-:]|\.\d{3}/g, "");

/** Lines over 75 octets continue on the next line after one space (RFC 5545). Splits on characters, not bytes. */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (bytes + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export interface IcsInput {
  /** YYYY-MM-DD, a calendar date in `timeZone`. */
  date: string;
  /** The proof cycle's saved zone. All-day events float, so it is recorded as the calendar's zone. */
  timeZone: string;
  summary: string;
  description?: string;
  /** Stable per date, so importing twice updates the same event. */
  uid: string;
  now: number;
}

export function buildIcs(e: IcsInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tether//Recheck//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-TIMEZONE:${esc(e.timeZone)}`,
    "BEGIN:VEVENT",
    `UID:${esc(e.uid)}`,
    `DTSTAMP:${stamp(e.now)}`,
    `DTSTART;VALUE=DATE:${compact(e.date)}`,
    `DTEND;VALUE=DATE:${compact(nextDay(e.date))}`,
    `SUMMARY:${esc(e.summary)}`,
    ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
