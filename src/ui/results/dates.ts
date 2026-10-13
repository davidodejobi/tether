// "16 Oct 2026": the one date style learners see (result page, Home).
const FORMAT = { day: "numeric", month: "short", year: "numeric" } as const;
/** A YYYY-MM-DD civil date. */
export const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { ...FORMAT, timeZone: "UTC" });
/** An instant, in the device's zone. */
export const when = (at: number) => new Date(at).toLocaleDateString("en-GB", FORMAT);
