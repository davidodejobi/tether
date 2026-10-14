// Go deeper (third miss): tap the subject, pick one or many, pick the verb. A wrong step gets the pack's
// hint, which never states the answer. Answer tiles stay hidden by the caller until onFinish(), so
// elimination cannot reveal the answer. onFinish() is where the caller records help("goDeeper"); onAi(then) records help("ai").
import { useEffect, useRef, useState } from "preact/hooks";
import type { Question } from "../../content/generate.ts";
import type { Lang } from "../../content/types.ts";
import { Button } from "../components/Button";
import { CoachBubble } from "../components/CoachBubble";
import { chips, countOk, fill, pack, verbOk } from "./steps.ts";
import { StillStuck } from "./StillStuck";
import "../onboarding/onboarding.css";
import "./help.css";

const NOT_SUBJECT: Record<Lang, string> = {
  en: "That's not the subject. Cover the side phrase and look again.",
  pcm: "Na no be the subject. Cover the side talk, look again.",
};

export function GoDeeper({ question: q, lang, coach, blocked, onFinish, onAi }: { question: Question; lang: Lang; coach: "character" | "text"; blocked: boolean; onFinish(): void; onAi(then: () => void): void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [hint, setHint] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const c = pack.coach[lang].goDeeper;
  const unreviewed = lang === "pcm" && pack.review.pcm.status !== "approved";
  useEffect(() => heading.current?.focus({ preventScroll: true }), [step]);

  const go = (ok: boolean, wrong: string, to: 2 | 3 | 4) => (ok ? (setHint(""), setStep(to)) : setHint(wrong));
  const { before, after } = chips(q);
  const chip = (x: { text: string; kind: string }, i: number) => (
    <button key={i} type="button" class="hp-chip" onClick={() => go(x.kind === "subject", x.kind === "side" ? c.subjectHint : NOT_SUBJECT[lang], 2)}>
      {x.text}
    </button>
  );

  if (step === 4)
    return (
      <div class="hp" aria-live="off">
        <CoachBubble mode={coach} pose="pleased">You rebuilt it yourself. That still counts as with help.</CoachBubble>
        <h2 class="hp-prompt" ref={heading} tabIndex={-1}>{q.subject}, {q.covered}, {q.answer} {q.predicate}</h2>
        <Button disabled={blocked} onClick={onFinish}>Back to the question</Button>
      </div>
    );

  return (
    <div class="hp" aria-live="off">
      <ol class="ls-steps" aria-label="Go deeper steps">
        {[1, 2, 3].map((n) => (
          <li key={n} class={n === step ? "now" : n < step ? "done" : ""} aria-current={n === step ? "step" : undefined}>{n}</li>
        ))}
        <li class="ls-steps-text">Step {step} of 3</li>
      </ol>
      {unreviewed && <span class="coach-tag">Unreviewed</span>}
      <h2 class="hp-prompt" ref={heading} tabIndex={-1} key={step}>{step === 1 ? c.subject : step === 2 ? c.count : c.verb}</h2>
      {step === 1 && (
        <div class="hp-chips" role="group" aria-label="Words in the sentence">
          {before.map(chip)}
          <span class="hp-blank" role="img" aria-label="blank" />
          {after.map((x, i) => chip(x, before.length + i))}
        </div>
      )}
      {step === 2 && (
        <div class="hp-two">
          <Button variant="secondary" onClick={() => go(countOk(q, "one"), c.countHint, 3)}>One</Button>
          <Button variant="secondary" onClick={() => go(countOk(q, "many"), c.countHint, 3)}>Many</Button>
        </div>
      )}
      {step === 3 && (
        <div class="hp-two">
          {q.options.map((o) => (
            <Button key={o} variant="secondary" onClick={() => go(verbOk(q, o), fill(pack, c.verbHint, q, lang), 4)}>{o}</Button>
          ))}
        </div>
      )}
      <div role="status" aria-live="polite">
        {hint && <CoachBubble mode={coach} pose="concerned" unreviewed={unreviewed}>{hint}</CoachBubble>}
      </div>
      <StillStuck question={q} lang={lang} blocked={blocked} onAccepted={onAi} />
    </div>
  );
}
