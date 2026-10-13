import { readiness } from "../../rules/practice.ts";
import { proofStatus } from "../../rules/proof.ts";
import { attemptsOf, runStartsOf } from "../../storage/progress.ts";
import { Identity } from "../components/Avatar";
import { CoachBubble } from "../components/CoachBubble";
import { Dots } from "../components/Dots";
import { Icon } from "../components/Icon";
import { HomeMap } from "../home/HomeMap";
import { latestGap, moveOne } from "../home/view.ts";
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
  const gap = latestGap(p);
  const coach = p.learner?.coach ?? "character";
  return (
    <main class="page hm">
      <div class="hm-main">
        <header class="hm-head">
          <h1>Tether</h1>
          <a class="hm-settings" href="/settings"><Icon name="settings" /> Settings</a>
        </header>
        {p.learner && <Identity learner={p.learner} />}
        <div class="hm-status"><OfflineCues /></div>
        <CoachBubble mode={coach}>{state === "fading" ? "Your proof needs a quick restore." : dots < 3 ? "Start with Move 1." : "You are ready to try Move 1 alone."}</CoachBubble>
        <ProofCard />
        <a class="btn btn-secondary hm-solo" href="/solo-entry">Solo check</a>
        <p class="hm-solo-note">Ten questions on your own. Always open, whatever your dots say.</p>
        <p class="hm-ready"><Dots filled={dots as 0 | 1 | 2 | 3} /></p>
        {gap ? (
          <p class="hm-gap"><strong>{gap.raw! <= 0 ? "No help gap on your latest solo check" : `Latest gap: ${gap.gap}`}</strong> (with help {gap.practice}, alone {gap.alone}) on {when(gap.at)}</p>
        ) : (
          <p class="hm-gap hm-gap-none">No gap yet. Do 10 practice questions, then a solo check, to see yours.</p>
        )}
      </div>
      <HomeMap state={state} due={due} />
    </main>
  );
}
