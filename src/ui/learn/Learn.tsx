// "Learn the move": a short, animated concept lesson before practice (one idea per card, Brilliant-style).
// Intro → basics (skippable for a returning learner) → the move's cards → a summary with the rule.
// Nothing here is scored or saved; `onDone` belongs to the caller. Content: src/content/learn.ts (English only).
//
// Props
//   move             the move to teach
//   lang, coach      coach language (the lesson text stays English) and "character" (Bo) or "text"
//   doneLabel        label of the last button; it calls onDone (a rejected promise shows an error and keeps the button)
//   onClose          when given, shows a close button and Esc leaves
//   skippableBasics  the first basics card offers "I know the basics"
// With reduced motion nothing moves: cards show their final state and the beat cards are steps revealed with Next.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Part, Move } from "../../content/generate.ts";
import { answerOf, BASICS, lessons, type LessonCard, type LessonSentence } from "../../content/learn.ts";
import type { Lang } from "../../content/types.ts";
import { cue } from "../../platform/sound.ts";
import { AnswerTiles } from "../components/AnswerTiles";
import { Bo } from "../components/Bo";
import { Button } from "../components/Button";
import { CoachBubble } from "../components/CoachBubble";
import { Icon } from "../components/Icon";
import { BeatSentence, beatPlain, type Beat } from "../help/BeatSentence";
import { ErrorText, useAction, useReducedMotion } from "../onboarding/parts";
import "../onboarding/onboarding.css";
import "./learn.css";

export interface LearnProps {
  move: Move;
  lang: Lang;
  coach: "character" | "text";
  doneLabel: string;
  onDone(): void | Promise<void>;
  onClose?(): void;
  skippableBasics?: boolean;
}

type Item = { k: "intro" } | { k: "card"; card: LessonCard; basics: boolean } | { k: "summary" };

const BEAT_MS = 2600;
const sub = (s: LessonSentence) => s.parts.filter((p) => p.role === "subject").map((p) => p.text).join(" ").replace(/,$/, "");
const plainOf = (s: LessonSentence, answer = answerOf(s)) => `${s.parts.map((p) => p.text).join(" ")} ${answer} ${s.predicate}`;
const one = (s: LessonSentence) => (s.number === "sg" ? "one" : "more than one");

/** Keeps one window keydown listener whose handler is always the latest. */
function useKeys(fn: (e: KeyboardEvent) => void) {
  const r = useRef(fn);
  r.current = fn;
  useEffect(() => {
    const h = (e: KeyboardEvent) => r.current(e);
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, []);
}

/** 1 to 4 pick the nth option, unless focus is already inside an answer group or on a field. */
const useDigits = (n: number, pick: (i: number) => void) =>
  useKeys((e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !/^[1-9]$/.test(e.key)) return;
    const t = e.target as HTMLElement;
    if (t.closest?.("input, textarea, select, [role=radiogroup]")) return;
    if (Number(e.key) <= n) pick(Number(e.key) - 1);
  });

function Heading({ children }: { children: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return <h1 class="ln-h" id="ln-h" ref={ref} tabIndex={-1}>{children}</h1>;
}

/** Feedback, announced politely and scrolled into view above the Continue bar. */
function Live({ msg }: { msg: { ok: boolean; text: string } | null }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => ref.current?.scrollIntoView?.({ block: "nearest" }), [msg]);
  return (
    <div class="ln-live" aria-live="polite">
      {msg && <p ref={ref} class={`ln-fb ${msg.ok ? "ln-fb-ok" : "ln-fb-bad"}`}>{msg.text}</p>}
    </div>
  );
}

type CardProps = { reduced: boolean; solved(): void };

/* ---------- define ---------- */
function Define({ card }: { card: Extract<LessonCard, { kind: "define" }> }) {
  return (
    <>
      <p class="ln-text">{card.text}</p>
      <div class="ln-stage">
        <p class="ln-sent ln-define" aria-hidden="true">
          {card.words.map((w, i) => (
            <>
              <span key={i} class={`ln-w${w.mark ? ` ln-mark ln-mark-${w.mark}` : ""}`} style={`--i:${i}`}>
                {w.mark && <span class="ln-label">{w.mark}</span>}
                <span class="ln-t">{w.text}</span>
              </span>{" "}
            </>
          ))}
        </p>
        <p class="sr-only">{card.words.map((w) => (w.mark ? `${w.text} (the ${w.mark})` : w.text)).join(" ")}</p>
      </div>
    </>
  );
}

/* ---------- agree: the -s hops from the verb to the noun ---------- */
function AgreeLine({ moved, sref }: { moved: boolean; sref?: (el: HTMLElement | null) => void }) {
  const S = <span class="ln-s" ref={sref}>s</span>;
  return (
    <p class="ln-sent" aria-hidden="true">
      The{" "}
      <span class="ls-subject on ln-agree-subj">
        girl{moved && S}
        <span class="ls-badge" key={String(moved)}>{moved ? "2+" : "1"}</span>
      </span>{" "}
      <span class="ln-agree-verb">sing{!moved && S}</span> in the choir.
    </p>
  );
}

function Agree({ reduced }: CardProps) {
  const [moved, setMoved] = useState(reduced);
  const [run, setRun] = useState(0);
  const el = useRef<HTMLElement | null>(null);
  const from = useRef<DOMRect | null>(null);
  useEffect(() => {
    if (reduced) return;
    setMoved(false);
    const t = setTimeout(() => {
      from.current = el.current?.getBoundingClientRect() ?? null;
      setMoved(true);
    }, 1700);
    return () => clearTimeout(t);
  }, [run, reduced]);
  // The "s" is one element that moves: measure it before and after, then play the arc from the old spot to the new.
  useLayoutEffect(() => {
    const a = from.current;
    from.current = null;
    const e = el.current;
    if (!a || !e) return;
    const b = e.getBoundingClientRect();
    const dx = a.left - b.left;
    const dy = a.top - b.top;
    e.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(1)` },
        { transform: `translate(${dx / 2}px, ${dy / 2 - 64}px) scale(1.7)`, offset: 0.5 },
        { transform: "translate(0, 0) scale(1)" },
      ],
      { duration: 900, easing: "cubic-bezier(.3,.6,.3,1)" },
    );
  }, [moved]);
  const set = (x: HTMLElement | null) => void (el.current = x);
  return (
    <>
      <div class="ln-stage">
        {reduced ? (
          <>
            <AgreeLine moved={false} />
            <AgreeLine moved />
          </>
        ) : (
          <AgreeLine moved={moved} sref={set} />
        )}
        <p class="sr-only">The girl sings in the choir. With more than one girl: the girls sing in the choir.</p>
      </div>
      {!reduced && <Button variant="secondary" icon="replay" onClick={() => setRun((r) => r + 1)}>Replay</Button>}
      <p class="ln-text">
        One subject takes the -s form: the girl sings, she is, he has. More than one takes the plain form: the girls sing, they are, they have.
      </p>
    </>
  );
}

/* ---------- pair ---------- */
function Row({ s, n }: { s: LessonSentence; n: 1 | 2 }) {
  const a = answerOf(s);
  return (
    <div class={`ln-row ln-row${n}`}>
      <BeatSentence parts={s.parts} predicate={s.predicate} answer={a} number={s.number} beat={3} />
      <p class="sr-only">{plainOf(s)}</p>
    </div>
  );
}

function Pair({ card, reduced }: { card: Extract<LessonCard, { kind: "pair" }> } & CardProps) {
  const [run, setRun] = useState(0);
  return (
    <>
      <div class="ln-stage ln-pair" key={run}>
        <Row s={card.first} n={1} />
        <Row s={card.second} n={2} />
      </div>
      {!reduced && <Button variant="secondary" icon="replay" onClick={() => setRun((r) => r + 1)}>Replay</Button>}
      <p class="ln-text">{card.text}</p>
    </>
  );
}

/* ---------- worked: three beats, as in Show me ---------- */
function Worked({ card, reduced, solved }: { card: Extract<LessonCard, { kind: "worked" }> } & CardProps) {
  const s = card.sentence;
  const [beat, setBeat] = useState<Beat>(1);
  const [playing, setPlaying] = useState(!reduced);
  const [run, setRun] = useState(0);
  const a = answerOf(s);
  const auto = playing && !reduced && beat < 3;
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => setBeat((b) => (b < 3 ? ((b + 1) as Beat) : b)), BEAT_MS);
    return () => clearTimeout(t);
  }, [auto, beat, run]);
  useEffect(() => {
    if (reduced && beat === 3) solved();
  }, [reduced, beat]);
  const next = () => setBeat((b) => (b < 3 ? ((b + 1) as Beat) : b));
  const steps = (
    <ol class="ls-steps" aria-label="Steps">
      {[1, 2, 3].map((n) => (
        <li key={n} class={n === beat ? "now" : n < beat ? "done" : ""} aria-current={n === beat ? "step" : undefined}>{n}</li>
      ))}
      <li class="ls-steps-text">Step {beat} of 3</li>
    </ol>
  );
  const sent = (b: Beat) => (
    <>
      <BeatSentence parts={s.parts} predicate={s.predicate} answer={a} number={s.number} beat={b} />
      <p class="sr-only">{beatPlain(s.parts, s.predicate, a, b)}</p>
    </>
  );
  return (
    <>
      {steps}
      <div class="ln-stage" key={`${beat}-${run}`}>{sent(beat)}</div>
      <p class="ln-text" aria-live="polite">{card.why}</p>
      <div class="ln-tools">
        {reduced ? (
          beat < 3 && <Button variant="secondary" onClick={next}>Next step</Button>
        ) : (
          <>
            <Button variant="secondary" icon="replay" onClick={() => (setBeat(1), setPlaying(true), setRun((r) => r + 1))}>Replay</Button>
            {beat < 3 && <Button variant="secondary" icon={playing ? undefined : "play"} onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</Button>}
          </>
        )}
      </div>
    </>
  );
}

/* ---------- why: explain it ---------- */
function Why({ card, solved }: { card: Extract<LessonCard, { kind: "why" }> } & CardProps) {
  const s = card.sentence;
  const right = card.options.findIndex((o) => o.correct);
  const [wrong, setWrong] = useState<number[]>([]);
  const [done, setDone] = useState<null | "right" | "shown">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const pick = (i: number) => {
    if (done || wrong.includes(i)) return;
    const o = card.options[i]!;
    if (o.correct) {
      cue("correct");
      setDone("right");
      setMsg({ ok: true, text: o.feedback });
      solved();
      return;
    }
    const w = [...wrong, i];
    setWrong(w);
    if (w.length >= 2) {
      setDone("shown");
      setMsg({ ok: false, text: `${o.feedback} Here is the reason: ${card.options[right]!.text} ${card.options[right]!.feedback}` });
      solved();
    } else {
      cue("tryAgain");
      setMsg({ ok: false, text: o.feedback });
    }
  };
  useDigits(card.options.length, pick);
  return (
    <>
      <div class="ln-stage">
        <BeatSentence parts={s.parts} predicate={s.predicate} answer={answerOf(s)} number={s.number} beat={3} />
        <p class="sr-only">{plainOf(s)}</p>
      </div>
      <div class="ln-opts" role="group" aria-label="Pick the reason">
        {card.options.map((o, i) => {
          const state = done && i === right ? "ok" : wrong.includes(i) ? "bad" : "idle";
          return (
            <button key={i} type="button" class={`ln-opt ln-opt-${state}`} aria-disabled={done || wrong.includes(i) ? "true" : undefined} onClick={() => pick(i)}>
              <kbd class="ln-num" aria-hidden="true">{i + 1}</kbd>
              <span>{o.text}</span>
              {state === "ok" && <Icon name="check" size={24} label="Right" />}
              {state === "bad" && <Icon name="x" size={24} label="Not this one" />}
            </button>
          );
        })}
      </div>
      <Live msg={msg} />
    </>
  );
}

/* ---------- try: tap the subject, then pick the verb ---------- */
type Word = { text: string; kind: "subject" | "covered" | "other" };
const wordsOf = (parts: Part[]): Word[] =>
  parts.flatMap((p) => p.text.split(" ").map((text) => ({ text, kind: (p.role === "plain" ? "other" : p.role) as Word["kind"] })));

function Try({ card, reduced, solved }: { card: Extract<LessonCard, { kind: "try" }> } & CardProps) {
  const s = card.sentence;
  const a = answerOf(s);
  const before = useMemo(() => wordsOf(s.parts), [s]);
  const after = useMemo(() => s.predicate.split(" "), [s]);
  const labels = useMemo(() => [s.sg, s.pl, ...s.distractors].map((x) => ({ x, r: Math.random() })).sort((p, q) => p.r - q.r).map((o) => o.x), [s]);
  const [stage, setStage] = useState<"subject" | "verb">("subject");
  const [chipMiss, setChipMiss] = useState(0);
  const [struck, setStruck] = useState<number[]>([]);
  const [correct, setCorrect] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const tiles = useRef<HTMLDivElement>(null);
  const name = sub(s);

  const toVerb = (text: string) => {
    setStage("verb");
    setMsg({ ok: true, text });
  };
  const tap = (w: Word) => {
    if (stage !== "subject") return;
    if (w.kind === "subject") {
      cue("select");
      toVerb(`Yes: ${name} is the subject. It counts as ${one(s)}.`);
      return;
    }
    const n = chipMiss + 1;
    setChipMiss(n);
    if (n >= 2) {
      toVerb(`The subject is ${name}. It counts as ${one(s)}.`);
      return;
    }
    cue("tryAgain");
    setMsg({ ok: false, text: w.kind === "covered" ? "That's the part to cover. Look again." : "Look for who or what the sentence is about." });
  };
  const choose = (i: number) => {
    if (stage !== "verb" || correct !== null || struck.includes(i)) return;
    if (labels[i] === a) {
      cue("correct");
      setCorrect(i);
      setMsg({ ok: true, text: `Yes. ${name}: ${one(s)}, so ${a}.` });
      solved();
      return;
    }
    const st = [...struck, i];
    setStruck(st);
    if (st.length >= 2) {
      setCorrect(labels.indexOf(a));
      setMsg({ ok: false, text: `Not quite. ${name}: ${one(s)}, so the answer is ${a}.` });
      solved();
    } else {
      cue("tryAgain");
      setMsg({ ok: false, text: `Not quite. ${name}: ${one(s)}. Try again.` });
    }
  };
  useEffect(() => {
    if (stage === "verb") tiles.current?.querySelector<HTMLElement>("[role=radio]:not([aria-disabled])")?.focus({ preventScroll: true });
  }, [stage]);
  useDigits(labels.length, (i) => stage === "verb" && choose(i));

  return (
    <>
      <p class="ln-prompt">{stage === "subject" ? "Tap the subject." : "Now pick the verb that fits the blank."}</p>
      {stage === "subject" ? (
        <div class="ln-chips" role="group" aria-label="Words in the sentence">
          {before.map((w, i) => (
            <button key={i} type="button" class="ln-cw" onClick={() => tap(w)}>{w.text}</button>
          ))}
          <span class="ln-gap" aria-label="blank" role="img" />
          {after.map((w, i) => (
            <button key={i} type="button" class="ln-cw" onClick={() => tap({ text: w, kind: "other" })}>{w}</button>
          ))}
        </div>
      ) : (
        <div class="ln-stage ln-try-stage">
          <BeatSentence parts={s.parts} predicate={s.predicate} answer={a} number={s.number} beat={correct !== null ? 3 : 2} />
          <p class="sr-only">{correct !== null ? plainOf(s) : `${s.parts.map((p) => p.text).join(" ")} blank ${s.predicate}`}</p>
          {correct !== null && !reduced && (
            <span class="ln-burst" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => <i key={i} style={`--a:${i * 36}deg`} />)}
            </span>
          )}
        </div>
      )}
      {stage === "verb" && (
        <div ref={tiles}>
          <AnswerTiles tiles={labels.map((label, i) => ({ label, struck: struck.includes(i) && correct !== i }))} value={null} correct={correct} onSelect={choose} />
        </div>
      )}
      <Live msg={msg} />
    </>
  );
}

/* ---------- the screen ---------- */
function titleOf(item: Item, move: Move): string {
  if (item.k === "intro") return move.title;
  if (item.k === "summary") return "The move in one line";
  const c = item.card;
  return c.kind === "agree" ? "One subject, one verb form" : c.kind === "why" ? c.question : c.title;
}

export function Learn({ move, lang, coach, doneLabel, onDone, onClose, skippableBasics }: LearnProps) {
  const lesson = lessons.find((l) => l.moveId === move.moveId) ?? lessons[0]!;
  const reduced = useReducedMotion();
  const deck = useMemo<Item[]>(
    () => [
      { k: "intro" },
      ...BASICS.map((card): Item => ({ k: "card", card, basics: true })),
      ...lesson.cards.map((card): Item => ({ k: "card", card, basics: false })),
      { k: "summary" },
    ],
    [lesson],
  );
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(false);
  const { error, busy, run } = useAction();
  const item = deck[i]!;
  const gated = item.k === "card" && (item.card.kind === "why" || item.card.kind === "try" || (item.card.kind === "worked" && reduced));
  const canNext = !gated || ok;
  const last = i === deck.length - 1;
  const go = (n: number) => (setI(n), setOk(false));
  const advance = () => canNext && !last && go(i + 1);
  const unreviewed = lesson.review.status !== "approved";
  const firstBasics = item.k === "card" && item.basics && deck[i - 1]?.k === "intro";
  const solved = () => setOk(true);

  useKeys((e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "Escape" && onClose) onClose();
    // Enter on a plain button or link does that button's own job; on the answer buttons or elsewhere it presses Continue.
    else if (e.key === "Enter" && !(e.target as HTMLElement).closest?.("input, textarea, select, a, button:not(.ln-opt, [role=radio])")) {
      e.preventDefault();
      if (last) void run(async () => void (await onDone()));
      else advance();
    }
  });

  const props: CardProps = { reduced, solved };
  const card = item.k === "card" ? item.card : null;
  return (
    <div class="ln">
      <header class="ln-top">
        {onClose && (
          <button type="button" class="ln-close" aria-label="Close the lesson" onClick={onClose}>
            <Icon name="close" size={24} />
          </button>
        )}
        <div class="ln-progress" role="progressbar" aria-label="Lesson progress" aria-valuemin={1} aria-valuemax={deck.length} aria-valuenow={i + 1}>
          <span style={`transform:scaleX(${(i + 1) / deck.length})`} />
        </div>
        {unreviewed && <span class="coach-tag ln-tag">Unreviewed</span>}
      </header>
      <div class="ln-scroll">
        <section class={`ln-card ln-${item.k === "card" ? item.card.kind : item.k}`} key={i} aria-labelledby="ln-h">
          <p class="ln-kick">{item.k === "intro" ? "Learn the move" : item.k === "card" && item.basics ? "The basics" : move.title}</p>
          <Heading>{titleOf(item, move)}</Heading>
          {item.k === "intro" && (
            <>
              {coach === "character" && <div class="ln-hero"><Bo pose="wave" size={160} /></div>}
              <CoachBubble mode={coach} pose="idle" speaks={false}>{lesson.intro}</CoachBubble>
              {lang === "pcm" && <p class="ln-note">Lesson in English</p>}
              <p class="ln-note">About two minutes. Nothing here is scored.</p>
            </>
          )}
          {card?.kind === "define" && <Define card={card} />}
          {card?.kind === "agree" && <Agree {...props} />}
          {card?.kind === "pair" && <Pair card={card} {...props} />}
          {card?.kind === "worked" && <Worked card={card} {...props} />}
          {card?.kind === "why" && <Why card={card} {...props} />}
          {card?.kind === "try" && <Try card={card} {...props} />}
          {item.k === "summary" && (
            <aside class="ls-rule ln-rule">
              <Icon name="lightbulb" size={24} /> <strong>{move.title}</strong>
              <p>{move.coach[lang].rule}</p>
            </aside>
          )}
        </section>
      </div>
      <footer class="ln-bar">
        {error && <ErrorText>{error}</ErrorText>}
        {last ? (
          <Button disabled={busy} onClick={() => run(async () => void (await onDone()))}>{doneLabel}</Button>
        ) : (
          <>
            {skippableBasics && firstBasics && <Button variant="tertiary" onClick={() => go(deck.findIndex((x) => x.k === "card" && !x.basics))}>I know the basics</Button>}
            <Button disabled={!canNext} onClick={advance}>Continue</Button>
          </>
        )}
      </footer>
    </div>
  );
}
