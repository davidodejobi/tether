import { useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { moveNumber, moves } from "../../content/moves.ts";
import { readiness } from "../../rules/practice.ts";
import { attemptsOf, runStartsOf } from "../../storage/progress.ts";
import { Identity } from "../components/Avatar";
import { CoachBubble } from "../components/CoachBubble";
import { Dots } from "../components/Dots";
import { Icon } from "../components/Icon";
import { CourseProgress } from "../course/CourseProgress";
import { HomeMap } from "../home/HomeMap";
import { Splitter } from "../home/Splitter";
import { focusMove, latestSolo, moveState } from "../home/view.ts";
import { withMove } from "../move.ts";
import { OfflineCues } from "../offline/OfflineCues";
import { ProofCard } from "../proof/ProofCard";
import { appNow } from "../proof/simulate";
import { useProgress } from "../progress";
import { when } from "../results/dates.ts";
import "../home/home.css";

export function Home() {
  const { store } = useProgress();
  const [more, setMore] = useState(false);
  const p = store.progress;
  const { query } = useLocation();
  const focus = focusMove(p, appNow, query.move);
  const n = moveNumber(focus);
  const { dots } = readiness(attemptsOf(p, focus.moveId), runStartsOf(p, focus.moveId));
  const states = Object.fromEntries(moves.map((m) => [m.moveId, moveState(p, m.moveId, focus.moveId, appNow)]));
  const { state, due } = states[focus.moveId]!;
  const solo = latestSolo(p, focus.moveId);
  const coach = p.learner?.coach ?? "character";
  // Same state as the primary action in ProofCard, so the bubble never contradicts the button.
  const coachLine = due && state !== "fading" ? "Recheck ready: five questions, no help."
    : state === "fading" ? "Your proof needs a quick restore."
    : state === "proved" || state === "held" ? "Proof holding. Practise to stay sharp."
    : dots < 3 ? `Start with Move ${n}.` : `You are ready to try Move ${n} alone.`;
  return (
    <main class={`page hm${more ? " hm-more-open" : ""}`}>
      <div class="hm-main">
        <header class="hm-head">
          <h1>Tether</h1>
          {p.learner && <Identity learner={p.learner} size={32} />}
          <a class="hm-settings" href="/settings"><Icon name="settings" /> Settings</a>
        </header>
        <div class="hm-top">
          <div class="hm-status"><OfflineCues /></div>
          <CoachBubble mode={coach}>{coachLine}</CoachBubble>
        </div>
        <div class="hm-act">
          <div class="hm-line">
            <p class="hm-move">JAMB English concord. Move {n}: {focus.title}.</p>
            <p class="hm-ready"><Dots filled={dots as 0 | 1 | 2 | 3} /></p>
          </div>
          <ProofCard move={focus} />
          <div class="hm-row">
            <a class="btn btn-secondary hm-solo" href={withMove("/solo-entry", focus.moveId)}>Solo check</a>
            <button class="btn btn-tertiary hm-morebtn" type="button" aria-expanded={more} onClick={() => setMore(!more)}>{more ? "Less" : "More"}</button>
          </div>
          {/* Spec section 8: the latest saved solo decides; without a practice score it shows alone and how to get a first gap. */}
          {solo && (solo.gap === null ? (
            <p class="hm-gap hm-gap-none"><strong>Alone: {solo.alone} of 10</strong> on {when(solo.at)}. Answer ten practice questions, then take another solo check, to see your first gap.</p>
          ) : (
            <p class="hm-gap"><strong>{solo.raw! <= 0 ? "No help gap on your latest solo check" : `Latest gap: ${solo.gap}`}</strong> (with help {solo.practice}, alone {solo.alone}) on {when(solo.at)}</p>
          ))}
          {/* Measurable progress is never behind More (spec section 10). */}
          <CourseProgress link={false} />
          <div class="hm-more">
            {!solo && <p class="hm-gap hm-gap-none">No gap yet. Take your first solo check.</p>}
            <a class="btn btn-tertiary hm-course" href="/course">English course: Lexis and Structure → Concord</a>
            <p class="hm-solo-note">Ten questions on your own. Always open, whatever your dots say.</p>
          </div>
        </div>
      </div>
      <Splitter />
      <HomeMap focus={focus} states={states} coach={coach} />
    </main>
  );
}
