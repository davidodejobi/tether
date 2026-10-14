import { readiness } from "../../rules/practice.ts";
import { proofStatus } from "../../rules/proof.ts";
import { attemptsOf, runStartsOf } from "../../storage/progress.ts";
import { Identity } from "../components/Avatar";
import { CoachBubble } from "../components/CoachBubble";
import { Dots } from "../components/Dots";
import { Icon } from "../components/Icon";
import { HomeMap } from "../home/HomeMap";
import { latestSolo, moveOne } from "../home/view.ts";
import { OfflineCues } from "../offline/OfflineCues";
import { ProofCard } from "../proof/ProofCard";
import { appNow } from "../proof/simulate";
import { useProgress } from "../progress";
import { when } from "../results/dates.ts";
import "../home/home.css";

export function Home() {
  const { store } = useProgress();
  const p = store.progress;
  const { dots } = readiness(attemptsOf(p), runStartsOf(p));
  const cycle = p.cycles.get("strip-disguise") ?? null;
  const { state, due } = moveOne(proofStatus(cycle, appNow(cycle?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)));
  const solo = latestSolo(p);
  const coach = p.learner?.coach ?? "character";
  // Same state as the primary action in ProofCard, so the bubble never contradicts the button.
  const coachLine = due && state !== "fading" ? "Your recheck is ready. Five questions, no help."
    : state === "fading" ? "Your proof needs a quick restore."
    : state === "proved" || state === "held" ? "Your proof is holding. Practise to keep it sharp."
    : dots < 3 ? "Start with Move 1." : "You are ready to try Move 1 alone.";
  return (
    <main class="page hm">
      <div class="hm-main">
        <header class="hm-head">
          <h1>Tether</h1>
          <a class="hm-settings" href="/settings"><Icon name="settings" /> Settings</a>
        </header>
        {p.learner && <Identity learner={p.learner} />}
        <div class="hm-status"><OfflineCues /></div>
        <CoachBubble mode={coach}>{coachLine}</CoachBubble>
        <p class="hm-move">JAMB English concord. Move 1: Strip the Disguise.</p>
        <a class="btn btn-tertiary hm-course" href="/course">English course: Lexis and Structure → Concord</a>
        <ProofCard />
        <a class="btn btn-secondary hm-solo" href="/solo-entry">Solo check</a>
        <p class="hm-solo-note">Ten questions on your own. Always open, whatever your dots say.</p>
        <p class="hm-ready"><Dots filled={dots as 0 | 1 | 2 | 3} /></p>
        {/* Spec section 8: the latest saved solo decides; without a practice score it shows alone and how to get a first gap. */}
        {!solo ? (
          <p class="hm-gap hm-gap-none">No gap yet. Take your first solo check.</p>
        ) : solo.gap === null ? (
          <p class="hm-gap hm-gap-none"><strong>Alone: {solo.alone} of 10</strong> on {when(solo.at)}. Answer ten practice questions, then take another solo check, to see your first gap.</p>
        ) : (
          <p class="hm-gap"><strong>{solo.raw! <= 0 ? "No help gap on your latest solo check" : `Latest gap: ${solo.gap}`}</strong> (with help {solo.practice}, alone {solo.alone}) on {when(solo.at)}</p>
        )}
      </div>
      <HomeMap state={state} due={due} />
    </main>
  );
}
