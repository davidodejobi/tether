// What a share card says (spec section 11). Pure text: the canvas draws it, the preview and the message reuse it.
// No Bo here. A gap appears only when the saved result holds both practice and alone scores.
import { stripDisguise as pack } from "../../content/strip-disguise.ts";
import { snapshotOf, type Snapshot } from "../../rules/gap.ts";
import { inOrder } from "../../rules/moment.ts";
import type { Learner, Progress } from "../../storage/progress.ts";
import { when, type ResultView, type ShareKind } from "../results/view.ts";

export interface CardModel {
  kind: ShareKind;
  nickname: string;
  exam: string;
  headline: string;
  /** Proof state word for the stamp ring (gold); null on a progress card, which has no newly earned stamp. */
  badge: string | null;
  score: string;
  scoreLabel: string;
  date: string;
  details: string[];
  support: string;
  source: string;
  /** Editable starting text for the message. */
  message: string;
}

const gapLine = (s: Snapshot) =>
  s.gap === null || s.practice === null ? null : s.raw !== null && s.raw <= 0 ? "No help gap on this check" : `Gap ${s.gap}: ${s.practice} with help, ${s.alone} alone`;

/** Null when the spec does not allow this share for this result. */
export function cardModel(p: Progress, v: ResultView, kind: ShareKind, learner: Learner): CardModel | null {
  if (!v.shares.includes(kind)) return null;
  const run = v.saved.run;
  const date = when(run.endedAt ?? run.started.at);
  const name = learner.partner?.name?.trim();
  const base = {
    kind, nickname: learner.nickname, exam: `JAMB English · ${pack.title}`, date, source: `Source: ${pack.source.line}`,
    support: name ? `Ask ${name} how it went` : "One move at a time. Small steps hold.",
  };
  const hi = name ? `Hi ${name}, ` : "";

  if (kind === "progress") {
    const c = v.gap!.comparison;
    if (c.kind !== "later") return null;
    const { previous: a, latest: b } = c;
    return {
      ...base, headline: "My gap is shrinking", badge: null, score: `${b.alone} of 10`, scoreLabel: "alone now, no help",
      details: [`Gap ${a.gap} to ${b.gap}`, `Alone ${a.alone} to ${b.alone} (since ${when(a.at)})`],
      message: `${hi ? `${hi}my` : "My"} gap shrank from ${a.gap} to ${b.gap} and my alone score rose from ${a.alone} to ${b.alone} on JAMB English (${date}). I am still practising.`,
    };
  }

  const state = v.proof!.state;
  const badge = state === "held" ? "Held" : "Proved";
  if (v.kind === "solo") {
    const s = v.gap?.snapshot;
    const gap = s && gapLine(s);
    return {
      ...base, headline: v.proof!.earnedNow ? "Proved: passed with no help" : "Passed with no help", badge,
      score: `${v.score} of ${v.total}`, scoreLabel: "alone, no help", details: gap ? [gap] : [],
      message: `${hi}I got ${v.score} of ${v.total} on my own in JAMB English concord, with no help (${date}).`,
    };
  }
  // A recheck is today's five questions only; an older solo and gap keep their own score and date.
  const prior = [...p.runs.values()].map((r) => snapshotOf(r.run))
    .filter((x): x is Snapshot => x !== null && inOrder(x.order, run.started) < 0)
    .sort((x, y) => inOrder(x.order, y.order)).at(-1);
  const priorGap = prior && gapLine(prior);
  const details = prior ? [`Last solo check: ${prior.alone} of 10 on ${when(prior.at)}`, ...(priorGap ? [priorGap] : [])] : [];
  return {
    ...base, headline: "Recheck passed", badge, score: `${v.score} of ${v.total}`, scoreLabel: "today's recheck, no help", details,
    message: `${hi}I passed today's ${v.score} of ${v.total} recheck in JAMB English concord, with no help (${date}).`,
  };
}
