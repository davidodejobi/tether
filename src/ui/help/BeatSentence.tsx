// A sentence in three beats (cover the side phrase, badge the subject, drop the verb into the blank), shared by Show me
// and the Learn the move screen. Only the part the current beat adds animates (the `new` class).
import type { Part } from "../../content/generate.ts";

export type Beat = 1 | 2 | 3;

export interface BeatSentenceProps {
  parts: Part[];
  predicate: string;
  answer: string;
  number: "sg" | "pl";
  beat: Beat;
}

export function BeatSentence({ parts, predicate, answer, number, beat }: BeatSentenceProps) {
  const cls = (n: number, base: string) => `${base}${beat >= n ? ` on${beat === n ? " new" : ""}` : ""}`;
  return (
    <p class="ls-sentence" aria-hidden="true">
      {parts.map((p, i) =>
        p.role === "subject" ? (
          <>
            <span key={i} class={cls(2, "ls-subject")}>
              {p.text}{beat >= 2 && <span class="ls-badge">{number === "sg" ? "1" : "2+"}</span>}
            </span>{" "}
          </>
        ) : p.role === "covered" ? (
          <>
            <span key={i} class={cls(1, "ls-covered")}>{p.text}</span>{" "}
          </>
        ) : (
          <>{p.text}{" "}</>
        ),
      )}
      <span class={cls(3, "ls-blank")}>{beat >= 3 ? answer : ""}</span> {predicate}
    </p>
  );
}

/** The same sentence as plain text for screen readers. The covered parts are in brackets until the verb is in. */
export const beatPlain = (parts: Part[], predicate: string, answer: string, beat: Beat) =>
  `${parts.map((p) => (p.role === "covered" && beat < 3 ? `(${p.text})` : p.text)).join(" ")} ${beat === 3 ? answer : "blank"} ${predicate}`;
