import { useState } from "preact/hooks";
import { stripDisguise as pack } from "../../content/strip-disguise.ts";
import type { Lang } from "../../content/types.ts";
import { Button } from "../components/Button";
import { CoachBubble } from "../components/CoachBubble";
import { Icon } from "../components/Icon";
import { ErrorText, StepHeading, useAction, useReducedMotion } from "./parts";

const ex = pack.lessonExample;
const verb = pack.verbs.find((v) => v.id === ex.verbId)!;
const answer = verb[ex.number];

const fill = (text: string, lang: Lang, withAnswer = false) =>
  text
    .replace("{covered}", ex.sidePhrase)
    .replace("{subject}", ex.subject)
    .replace("{count}", pack.countWords[lang][ex.number])
    .replace("{answer}", withAnswer ? answer : "{answer}");

const BUBBLES = [
  "Watch me. Some sentences hide the verb behind a side phrase.",
  "Now ask: who is this sentence about?",
  `One person gets “${verb.sg}”. More than one gets “${verb.pl}”.`,
];

/** The example sentence after `beat` beats. Only the part the current beat adds animates. */
function Sentence({ beat }: { beat: 1 | 2 | 3 }) {
  const cls = (n: number, base: string) => `${base}${beat >= n ? ` on${beat === n ? " new" : ""}` : ""}`;
  return (
    <p class="ls-sentence" aria-hidden="true">
      <span class={cls(2, "ls-subject")}>
        {ex.subject},{beat >= 2 && <span class="ls-badge">1</span>}
      </span>{" "}
      <span class={cls(1, "ls-covered")}>{ex.sidePhrase},</span>{" "}
      <span class={cls(3, "ls-blank")}>{beat >= 3 ? answer : ""}</span> {ex.predicate}
    </p>
  );
}

const plainSentence = (beat: 1 | 2 | 3) =>
  beat === 3 ? `${ex.subject}, ${ex.sidePhrase}, ${answer} ${ex.predicate}` : `${ex.subject}, (${ex.sidePhrase},) blank ${ex.predicate}`;

export function Lesson({ coach, lang, onDone }: { coach: "character" | "text"; lang: Lang; onDone: () => Promise<void> }) {
  const [beat, setBeat] = useState<1 | 2 | 3>(1);
  const [replay, setReplay] = useState(0);
  const reduced = useReducedMotion();
  const { error, busy, run } = useAction();
  const captions = pack.coach[lang].showMe.map((t, i) => fill(t, lang, i === 2));
  const next = () => setBeat((b) => (b < 3 ? ((b + 1) as 2 | 3) : b));
  const gotIt = <Button onClick={() => run(onDone)} disabled={busy}>Got it — try 3 questions</Button>;
  const bubble = (i: number) => (
    <CoachBubble mode={coach} pose={i === 2 ? "pleased" : i === 0 ? "wave" : "thinking"}>{BUBBLES[i]}</CoachBubble>
  );

  if (reduced) {
    // Static version: no movement. Each step is a card that appears when the learner taps Next.
    const cards: { title: string; body: string }[] = [
      { title: "Cover the side phrase.", body: `${ex.subject}, ${ex.sidePhrase}, ___ ${ex.predicate}` },
      { title: "Who is it about?", body: `${ex.subject}: ${pack.countWords[lang][ex.number]}.` },
      { title: `One → “${verb.sg}”. More than one → “${verb.pl}”.`, body: plainSentence(3) },
    ];
    return (
      <>
        <div class="ob-body">
          <p class="ob-kicker">Learn the move</p>
          <CoachBubble mode={coach} pose="idle">No animation. Read each step, then tap Next.</CoachBubble>
          {cards.slice(0, beat).map((c, i) => (
            <section class="ls-card" key={i} aria-labelledby={`ls-h${i}`}>
              <div class="ls-card-head">
                <span class="ls-num" aria-hidden="true">{i + 1}</span>
                {i + 1 === beat ? <StepHeading level={1}>{c.title}</StepHeading> : <h2 class="ob-heading" id={`ls-h${i}`}>{c.title}</h2>}
              </div>
              <p class="ls-card-body">{c.body}</p>
              {i + 1 === beat && beat < 3 && <Button variant="tertiary" onClick={next}>Next</Button>}
            </section>
          ))}
        </div>
        <div class="ob-actions">
          {error && <ErrorText>{error}</ErrorText>}
          {beat === 3 && gotIt}
        </div>
      </>
    );
  }

  return (
    <>
      <div class="ob-body">
        <p class="ob-kicker">Learn the move</p>
        {bubble(beat - 1)}
        <ol class="ls-steps" aria-label="Steps">
          {[1, 2, 3].map((n) => (
            <li key={n} class={n === beat ? "now" : n < beat ? "done" : ""} aria-current={n === beat ? "step" : undefined}>
              {n}
            </li>
          ))}
          <li class="ls-steps-text">Step {beat} of 3</li>
        </ol>
        <div class="ls-card ls-stage" key={`${beat}-${replay}`}>
          <Sentence beat={beat} />
          <p class="sr-only">{plainSentence(beat)}</p>
        </div>
        <StepHeading level={1} key={beat}>{captions[beat - 1]}</StepHeading>
        <aside class="ls-rule">
          <Icon name="lightbulb" size={20} /> <strong>Strip the Disguise</strong>
          <p>{pack.coach[lang].rule}</p>
        </aside>
      </div>
      <div class="ob-actions">
        {error && <ErrorText>{error}</ErrorText>}
        {beat < 3 ? <Button onClick={next}>Next</Button> : gotIt}
        <Button variant="secondary" icon="replay" onClick={() => setReplay((r) => r + 1)}>Replay</Button>
      </div>
    </>
  );
}
