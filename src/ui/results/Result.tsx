// The result and gap card at /result/:runId (spec sections 8 and 9). Reads a saved run; never saves the run itself.
// No Bo and no sound here: Bo is absent from results, and the run screen plays the celebration after its save.
import { useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso";
import { sentence } from "../../content/generate.ts";
import { moveOrFirst, stripDisguiseMove, unreviewed } from "../../content/moves.ts";
import { startAttempt } from "../../rules/practice.ts";
import { Button } from "../components/Button";
import { Score } from "../components/Score";
import { Stamp } from "../components/Stamp";
import { AddToCalendar } from "../offline/AddToCalendar";
import { ShowMe } from "../help/ShowMe";
import { moveLabel, withMove } from "../move.ts";
import { useProgress } from "../progress";
import { day, when } from "./dates.ts";
import { resultView, type ResultView } from "./view.ts";
import "./Result.css";


export function Result() {
  const { params } = useRoute();
  const { store } = useProgress();
  const { route } = useLocation();
  const [misses, setMisses] = useState(false);
  const v = resultView(store.progress, params.runId ?? "", Date.now());

  if (!v)
    return (
      <main class="rs rs-missing">
        <h1>Result not found</h1>
        <p>This result is not saved on this device.</p>
        <Button onClick={() => route("/")}>Back to Home</Button>
      </main>
    );
  if (misses) return <Misses v={v} onBack={() => setMisses(false)} />;
  return <Card v={v} onMisses={() => setMisses(true)} />;
}

function Headline({ v }: { v: ResultView }) {
  const p = v.proof;
  if (v.kind === "recheck")
    return v.passed ? (
      <><h1>Held</h1><p class="rs-lead">You passed {v.score} of {v.total} with no help.</p></>
    ) : (
      <><h1>Not yet</h1><p class="rs-lead">It slipped a bit. Practise the move, then pass 4 of 5 to restore it.</p></>
    );
  if (v.passed) return <><h1>{p?.earnedNow ? "Passed. You are Proved." : "Passed"}</h1><p class="rs-lead">{v.score} of {v.total} with no help.</p></>;
  return (
    <>
      <h1>Not yet</h1>
      <p class="rs-lead">
        {v.score} of {v.total}. {v.oneAway ? "One more correct answer would pass." : `You need ${v.pass} of ${v.total}. Practise the move and try again.`}
        {v.timedOut && " Time ran out, so unanswered questions count as missed."}
      </p>
    </>
  );
}

function GapNote({ v }: { v: ResultView }) {
  const g = v.gap;
  if (!g) return null;
  const c = g.comparison;
  const s = g.snapshot;
  if (s.gap === null || s.practice === null)
    return <p class="rs-note">Answer ten practice questions, then take another solo check, to see your first gap.</p>;
  return (
    <div class="rs-gap">
      <p class="rs-gapline">
        {g.noGap ? <strong>No help gap on this check</strong> : <><strong>Gap {s.gap}</strong> <span>({s.practice} with help, {s.alone} alone)</span></>}
      </p>
      {c.kind === "first" && <p class="rs-note">Your first gap. Nothing to compare yet.</p>}
      {c.kind === "later" && (
        <p class="rs-note">
          {c.improved
            ? `Your gap shrank from ${c.previous.gap} to ${c.latest.gap} and your alone score rose from ${c.previous.alone} to ${c.latest.alone}.`
            : `Compared with ${when(c.previous.at)}: gap ${c.previous.gap} then, ${c.latest.gap} now; alone ${c.previous.alone} then, ${c.latest.alone} now. Practise to bring them closer.`}
          {" "}Last result: {when(c.previous.at)}.
        </p>
      )}
    </div>
  );
}

function Card({ v, onMisses }: { v: ResultView; onMisses(): void }) {
  const { route } = useLocation();
  const p = v.proof;
  const s = v.gap?.snapshot;
  const move = moveOrFirst(v.saved.questions[0]?.moveId);
  return (
    <main class="rs">
      <div class="rs-card pin-light">
        {move !== stripDisguiseMove && <p class="rs-move">{moveLabel(move)}{unreviewed(move, "en") && <> <span class="coach-tag">Unreviewed</span></>}</p>}
        <Headline v={v} />
        {p && (
          <div class="rs-stamp">
            <Stamp state={p.state} />
            <p class="rs-note">
              {p.earnedNow ? "Earned today." : `Proof dated ${day(p.earnedOn)}.`}
              {p.state === "fading" && " It is fading until you pass a recovery check."}
              {p.state !== "fading" && (p.nextDue ? ` Next check: ${day(p.nextDue)}.` : " No more checks are scheduled.")}
            </p>
          </div>
        )}
        {v.kind === "solo" && s ? (
          <div class="rs-scores">
            <Score kind="help" value={s.practice} />
            <Score kind="alone" value={s.alone} />
          </div>
        ) : (
          <div class="rs-scores"><Score kind="alone" value={v.score} total={v.total} label={v.kind === "recheck" ? "Recheck" : undefined} note={v.kind === "recheck" ? "Recheck. No help." : undefined} /></div>
        )}
        {v.kind === "recheck" && <p class="rs-note">Today's five-question check. It does not change your alone score or gap.</p>}
        <GapNote v={v} />
      </div>
      <div class="rs-actions">
        {v.shares.map((k, i) => (
          <Button key={k} variant={i === 0 ? "secondary" : "tertiary"} icon="share" onClick={() => route(`/share/${v.saved.run.id}?kind=${k}`)}>
            {k === "proof" ? "Share proof" : "Share progress"}
          </Button>
        ))}
        {p && <AddToCalendar move={move} />}
        {v.misses.length > 0 && <Button variant="secondary" onClick={onMisses}>See your misses</Button>}
        {v.passed ? (
          <Button onClick={() => route("/")}>Back to Home</Button>
        ) : (
          <>
            <Button onClick={() => route(withMove("/practice", move.moveId))}>Practise again</Button>
            <Button variant="tertiary" onClick={() => route(withMove(v.kind === "solo" ? "/solo-entry" : "/run/recheck", move.moveId))}>Try anyway</Button>
            <Button variant="tertiary" onClick={() => route("/")}>Back to Home</Button>
          </>
        )}
      </div>
    </main>
  );
}

// A post-run review changes neither the practice window, dots nor the saved result (spec section 7). Each look is saved as a
// free look on a "converted" attempt that never completes, so it is measured (section 15) but never scored or resumed.
function Misses({ v, onBack }: { v: ResultView; onBack(): void }) {
  const { store, save } = useProgress();
  const learner = store.progress.learner!;
  const [playing, setPlaying] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const look = async (i: number) => {
    const question = v.misses[i]!;
    const id = `${v.saved.run.id}:look:${question.id}`;
    setBusy(true);
    try {
      if (!store.progress.attempts.has(id))
        await save({ attempts: [{ attempt: { ...startAttempt(id, question.id, "converted", store.moment(Date.now())), freeLook: true }, question }] });
      setFailed(false);
      setPlaying(i);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main class="rs">
      <h1>See your misses</h1>
      <p class="rs-lead">Looking costs nothing. Your score and practice are unchanged.</p>
      <ul class="rs-misses">
        {v.misses.map((q, i) => (
          <li key={q.id}>
            <p class="rs-sentence">{sentence(q, q.answer)}</p>
            <Button variant="secondary" icon="play" disabled={busy} onClick={() => look(i)}>Show me</Button>
            {playing === i && (
              <ShowMe question={q} lang={learner.lang} coach="text" doneLabel="Done" note="Free look: nothing lost" onDone={() => setPlaying(null)} />
            )}
          </li>
        ))}
      </ul>
      {failed && <p role="alert" class="rs-note">Couldn't save that look. Try again.</p>}
      <div class="rs-actions">
        <Button onClick={onBack}>Back to result</Button>
      </div>
    </main>
  );
}
