// The solo check and recheck at /run/:kind (spec section 7). Timer, no help, no feedback until the result.
// Lifecycle: recover an active run (resume / timeout / convert) or plan a fresh one -> save it -> play ->
// each answer is saved before the screen advances -> the finished run is saved with completeRunBatch ->
// only then setProofMode(false), celebrate on a pass, and go to /result/<runId>.
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { before, sentence, type Question } from "../../content/generate.ts";
import { clockWentBack, finish, lowTime, RUN_RULES, seen, submit, type Run as RunState, type RunKind } from "../../rules/runs.ts";
import { onReturn } from "../../rules/runs.ts";
import { cue, setProofMode } from "../../platform/sound.ts";
import { speak, useCanSpeak } from "../../platform/speech.ts";
import { acquireWake, releaseWake } from "../../platform/wakeLock.ts";
import { completeRunBatch, convertBatch, recoverRun, type Batch, type SavedRun } from "../../storage/progress.ts";
import { AnswerTiles } from "../components/AnswerTiles";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { SentenceCard } from "../components/SentenceCard";
import { targetTile } from "../components/answerKeys";
import { NotFound } from "../screens/NotFound";
import { useMove, withMove } from "../move.ts";
import { useProgress } from "../progress";
import { planRun } from "./plan.ts";
import "../practice/QuestionView.css";
import "./Run.css";

type View =
  | { t: "loading" }
  | { t: "refused" }
  | { t: "starting" }
  | { t: "play" }
  | { t: "closing"; timedOut: boolean }
  | { t: "converted"; why: "away" | "clock" };

const HEARTBEAT_MS = 2000;
const TICK_MS = 250;
const newId = () => `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function RunScreen({ kind }: { kind?: string }) {
  // Keyed by kind and move, so a redirect to a recovered run of another kind or move starts the runner afresh.
  const moveId = useMove().moveId;
  return kind === "solo" || kind === "recheck" ? <Runner key={`${kind}:${moveId}`} kind={kind} /> : <NotFound />;
}

function Runner({ kind }: { kind: RunKind }) {
  const { store, save, idle } = useProgress();
  const { route } = useLocation();
  const pack = useMove();
  const hasLearner = !!store.progress.learner;
  const [view, setView] = useState<View>({ t: "loading" });
  const [saved, setSavedState] = useState<SavedRun | null>(null);
  // Links go to the move of the run on screen (a recovered run may belong to another move than the URL names).
  const moveId = saved?.questions[0]?.moveId ?? pack.moveId;
  const [now, setNow] = useState(Date.now());
  const [failed, setFailed] = useState<(() => void) | null>(null);
  const [pending, setPending] = useState(0);
  const [awake, setAwake] = useState(true);
  const [toast, setToast] = useState(false);
  const live = useRef<SavedRun | null>(null); // the latest run, readable from timers
  const blocked = useRef({ pending: 0, failed: false }); // saves in flight / awaiting Retry, readable from timers
  const chain = useRef<Promise<void>>(Promise.resolve());
  const hiddenAt = useRef<number | null>(null);
  const ended = useRef(false); // finishing or converting has begun: timers stop
  // A conversion decided while an answer was still saving or awaiting Retry: it runs once that save lands, so it includes the answer.
  const deferred = useRef<(() => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  const setSaved = (s: SavedRun | null) => {
    live.current = s;
    setSavedState(s);
  };
  const busy = pending > 0 || !!failed;

  // One save at a time, in order. `then` runs only after the save landed; on failure the screen stays and Retry repeats it.
  // The batch is built when its turn comes, from the latest committed run, never from a snapshot taken at click time.
  const commit = (build: () => Batch, then: () => void) => {
    const go = () => {
      blocked.current.failed = false;
      blocked.current.pending++;
      setFailed(null);
      setPending((n) => n + 1);
      chain.current = chain.current.then(async () => {
        try {
          await save(build());
          if (mounted.current) then();
        } catch {
          blocked.current.failed = true;
          if (mounted.current) setFailed(() => go);
        } finally {
          blocked.current.pending--;
          if (mounted.current) setPending((n) => n - 1);
          const d = deferred.current;
          if (d && mounted.current && blocked.current.pending === 0 && !blocked.current.failed) {
            deferred.current = null;
            d();
          }
        }
      });
    };
    go();
  };

  const finishRun = (t: number) => {
    ended.current = true;
    let done = live.current!;
    setView({ t: "closing", timedOut: !!finish(done.run, t).result?.timedOut });
    commit(() => {
      done = { ...live.current!, run: finish(live.current!.run, t) };
      return completeRunBatch(store.progress, done, zone());
    }, () => {
      setProofMode(false);
      if (done.run.result?.passed) cue("celebrate");
      route(`/result/${done.run.id}`);
    });
  };
  const convertRun = (status: "converted" | "exited", why: "away" | "clock" = "away") => {
    ended.current = true;
    const t = Date.now();
    let c!: ReturnType<typeof convertBatch>;
    commit(() => (c = convertBatch(live.current!, t, status)).batch, () => {
      setProofMode(false);
      if (status === "exited") route("/");
      else {
        setSaved(c.saved);
        setView({ t: "converted", why });
      }
    });
  };

  // Marks the run seen at `t`, in the save order, on top of whatever has committed by then. A missed beat only shortens what a reload can resume.
  const beatSave = (t: number) => {
    chain.current = chain.current.then(() => {
      const cur = live.current;
      if (!cur || ended.current) return;
      const next = seen(cur.run, t);
      if (next === cur.run) return;
      const upd = { ...cur, run: next };
      setSaved(upd);
      return save({ runs: [upd] }).catch(() => {});
    });
  };

  // Plans and saves a fresh run; it starts only once saved.
  const begin = () => {
    ended.current = false;
    setView({ t: "loading" });
    const t = Date.now();
    const plan = planRun(store.progress, pack, kind, t, newId(), () => store.moment(t), Math.random);
    if (!plan) return setView({ t: "refused" });
    setView({ t: "starting" });
    const first: SavedRun = plan;
    commit(() => ({ runs: [first] }), () => {
      setSaved(first);
      setView({ t: "play" });
    });
  };

  // On entry: an active saved run is resumed, timed out or converted before anything new starts.
  useEffect(() => {
    if (!hasLearner) return route("/", true);
    let alive = true;
    idle().then(() => {
      if (!alive) return;
      const t = Date.now();
      const r = recoverRun(store.progress, t, zone());
      if (!r) return begin();
      if (r.outcome === "continue") {
        if (r.saved.run.kind !== kind || r.saved.questions[0]!.moveId !== pack.moveId) return route(withMove(`/run/${r.saved.run.kind}`, r.saved.questions[0]!.moveId), true);
        setSaved(seen(r.saved.run, t) === r.saved.run ? r.saved : { ...r.saved, run: seen(r.saved.run, t) });
        setToast(true);
        return setView({ t: "play" });
      }
      ended.current = true;
      setSaved(r.saved);
      if (r.outcome === "timeout") return finishRun(t);
      commit(() => r.batch, () => setView({ t: "converted", why: clockWentBack(r.saved.run, t) ? "clock" : "away" }));
    });
    return () => void (alive = false);
  }, [hasLearner]);

  const playing = view.t === "play";
  // No cue plays during a run, and the screen stays awake where the browser allows it.
  useEffect(() => {
    if (!playing) return;
    setProofMode(true);
    void acquireWake().then(setAwake);
    return () => {
      setProofMode(false);
      releaseWake();
    };
  }, [playing]);

  // Clock tick: the deadline is real; heartbeat: saves "seen" so a reload within ten seconds can resume.
  useEffect(() => {
    if (!playing) return;
    const tick = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const cur = live.current;
      // While hidden nothing is decided: coming back judges the absence first, then the deadline (as recoverRun does).
      if (!cur || ended.current || cur.run.status !== "active" || hiddenAt.current !== null || document.visibilityState === "hidden") return;
      if (clockWentBack(cur.run, t)) return convertRun("converted", "clock");
      // A saving or failed answer is never finalised over: the deadline waits for it, and Retry then finishes the run with it.
      if (t >= cur.run.deadline && !blocked.current.pending && !blocked.current.failed) finishRun(t);
    }, TICK_MS);
    const beat = setInterval(() => {
      const cur = live.current;
      if (!cur || ended.current || document.visibilityState !== "visible" || pending > 0 || failed) return;
      const next = seen(cur.run, Date.now());
      if (next === cur.run) return;
      beatSave(Date.now());
    }, HEARTBEAT_MS);
    return () => (clearInterval(tick), clearInterval(beat));
  }, [playing, pending, failed]);

  // Hiding the page starts the absence; coming back decides continue, timeout or convert.
  useEffect(() => {
    if (!playing) return;
    const onVis = () => {
      const cur = live.current;
      if (!cur || ended.current) return;
      const t = Date.now();
      if (document.visibilityState === "hidden") {
        hiddenAt.current = t;
        beatSave(t);
        return;
      }
      const since = hiddenAt.current;
      hiddenAt.current = null;
      void acquireWake().then(setAwake);
      const out = onReturn(cur.run, t, since);
      if (out === "convert") {
        const why = since !== null && t < since ? "clock" : clockWentBack(cur.run, t) ? "clock" : "away";
        if (!blocked.current.pending && !blocked.current.failed) return convertRun("converted", why);
        // An answer is saving or awaiting Retry: stop the run now (no more answers, no deadline), convert once it lands.
        ended.current = true;
        deferred.current = () => convertRun("converted", why);
        return;
      }
      if (out === "timeout") return blocked.current.failed ? setToast(false) : finishRun(t); // failed: the tick finishes it after Retry
      beatSave(t);
      setToast(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [playing]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(false), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const answer = (q: Question, word: string) => {
    const cur = live.current;
    if (!cur || busy || ended.current) return;
    const t = Date.now();
    if (clockWentBack(cur.run, t)) return convertRun("converted", "clock");
    const next = submit(cur.run, q.id, word === q.answer, store.moment(t));
    if (next === cur.run) return; // past the deadline: the tick finishes it
    const upd = { ...cur, run: next };
    if (next.status === "completed") {
      setSaved(upd);
      return finishRun(t);
    }
    commit(() => ({ runs: [upd] }), () => setSaved(upd));
  };

  const retryBar = failed && (
    <div class="qv-fail" role="alert">
      <span>Couldn't save this. Your progress may not be kept.</span>
      <Button variant="secondary" silent disabled={pending > 0} onClick={failed}>Retry</Button>
    </div>
  );

  if (view.t === "loading") return <main class="run-note" aria-busy="true"><p>Getting your questions ready…</p></main>;
  if (view.t === "refused")
    return (
      <main class="run-note">
        <h1>No recheck is due</h1>
        <p>Nothing is waiting for a recheck yet. Keep practising, or try a solo check.</p>
        <div class="run-actions">
          <Button onClick={() => route(withMove("/practice", moveId))}>Keep practising</Button>
          <Button variant="secondary" onClick={() => route("/")}>Back to Home</Button>
        </div>
      </main>
    );
  if (view.t === "starting")
    return (
      <main class="run-note" aria-busy={!failed}>
        <p>Getting your questions ready…</p>
        {retryBar}
      </main>
    );
  if (view.t === "closing")
    return (
      <main class="run-note">
        <h1>{view.timedOut ? "Time's up" : "Saving your result"}</h1>
        {view.timedOut && <p>Questions you did not answer count as wrong.</p>}
        {retryBar}
      </main>
    );
  if (view.t === "converted") {
    const left = saved ? saved.questions.length - saved.run.submissions.length : 0;
    return (
      <main class="run-note">
        <h1>{view.why === "clock" ? "Your clock changed" : "You were away too long"}</h1>
        <p>
          {view.why === "clock"
            ? "We can't trust the time left, so this became practice."
            : "Away for 10 seconds or more turns a run into practice."}{" "}
          Your answers so far count as practice. No score or stamp comes from this run.
        </p>
        <div class="run-actions">
          <Button onClick={begin}>Start a fresh {kind === "solo" ? "solo run" : "recheck"}</Button>
          {left > 0 && <Button variant="secondary" onClick={() => route(withMove("/practice", moveId))}>Practise the rest</Button>}
          <Button variant="tertiary" onClick={() => route("/")}>Back to Home</Button>
        </div>
      </main>
    );
  }

  if (!saved) return null;
  const run: RunState = saved.run;
  const total = RUN_RULES[kind].questions;
  const n = run.submissions.length;
  const q = saved.questions[n];
  if (!q) return null;
  const low = lowTime(run, now);
  return (
    <div class="qv run">
      <header class="qv-top run-top">
        <button type="button" class="qv-close" aria-label="Leave this run" onClick={() => dialog.current?.showModal()}>
          <Icon name="close" size={24} />
        </button>
        <span class="run-pill"><Icon name="eye-off" size={20} /> No help</span>
        <span class={`run-pill run-timer${low ? " run-low" : ""}`} role="timer" aria-label="Time left">
          <Icon name={low ? "warning" : "timer"} size={20} /> {clock(run.deadline - now)}
        </span>
        <div class="run-segs" role="progressbar" aria-label={`Question ${n + 1} of ${total}`} aria-valuemin={1} aria-valuemax={total} aria-valuenow={n + 1}>
          {saved.questions.map((x, i) => <span key={x.id} class={i < n ? "run-seg run-seg-done" : "run-seg"} />)}
        </div>
      </header>
      <main class="qv-main">
        {toast && <p class="run-toast" role="status"><Icon name="check" size={20} /> Welcome back. Your {kind === "solo" ? "solo run" : "recheck"} is still on.</p>}
        {low && <p class="run-low-note" role="status"><Icon name="warning" size={20} /> Time is almost up. Less than 20 seconds left.</p>}
        <QuestionStep key={q.id} q={q} n={n + 1} of={total} busy={busy} onSubmit={(w) => answer(q, w)} />
        {retryBar}
        <p class="run-foot">
          <Icon name="eye-off" size={20} />
          {awake ? "Screen stays awake during the run." : "Keep this screen open."} Away 10 s or more turns this into practice.
        </p>
      </main>
      <dialog ref={dialog} class="qv-sheet" aria-labelledby="run-leave">
        <h2 id="run-leave">Leave this run?</h2>
        <p>Your answers so far become practice. No score or stamp comes from a run you leave.</p>
        <Button onClick={() => dialog.current?.close()}>Keep going</Button>
        <Button variant="secondary" disabled={busy} onClick={() => (dialog.current?.close(), live.current && convertRun("exited"))}>Leave</Button>
      </dialog>
    </div>
  );
}

// The sentence, blank, four tiles and Next. Selecting is not submitting; nothing says right or wrong.
function QuestionStep({ q, n, of, busy, onSubmit }: { q: Question; n: number; of: number; busy: boolean; onSubmit(word: string): void }) {
  const [sel, setSel] = useState<number | null>(null);
  const canSpeak = useCanSpeak();
  const go = () => sel !== null && !busy && onSubmit(q.options[sel]!);
  const key = useRef<(e: KeyboardEvent) => void>(() => {});
  key.current = (e) => {
    const t = e.target as HTMLElement;
    if (e.altKey || e.ctrlKey || e.metaKey || t.closest("input, textarea, select, dialog")) return;
    if (e.key.toLowerCase() === "r") return speak(sentence(q, "blank"), "en"); // reading aloud is not help, and works from any button
    if (t.closest("button:not([role=radio])")) return;
    if (e.key === "Enter") return e.preventDefault(), go();
    if (/^[1-4]$/.test(e.key) && !t.closest(".tiles")) {
      const to = targetTile(e.key, 0, [false, false, false, false]);
      if (to !== null && !busy) setSel(to);
    }
  };
  // Layout effect: the shortcuts are live in the same commit that shows the question, so "visible" implies "keys work".
  useLayoutEffect(() => {
    const h = (e: KeyboardEvent) => key.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return (
    <>
      <h1 class="run-prompt">Question {n} of {of} · Pick the verb that fits.</h1>
      <section class="run-card">
        <SentenceCard before={before(q)} after={q.predicate} filled={sel === null ? undefined : q.options[sel]} />
        {canSpeak && (
          <button type="button" class="qv-read" onClick={() => speak(sentence(q, "blank"), "en")}>
            <Icon name="speaker" size={20} /> Read aloud
          </button>
        )}
        {!canSpeak && <p class="qv-source">Read aloud isn't available on this device.</p>}
      </section>
      <AnswerTiles tiles={q.options.map((label) => ({ label }))} value={sel} disabled={busy} onSelect={(i) => setSel(i)} />
      <div class="run-bar">
        <Button disabled={sel === null || busy} onClick={go}>{n === of ? "Finish" : "Next"}</Button>
      </div>
    </>
  );
}
