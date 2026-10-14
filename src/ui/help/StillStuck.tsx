// Still stuck? (spec section 5a): an online AI explanation of the reviewed move, shown at the bottom of Go deeper.
// One request at a time, cancellable, 15 s timeout. Only an accepted explanation records help("ai"); every other
// ending records a local usage status only. Unmounting aborts the request, so a late reply never reaches another
// question or a proof run. Every failure falls back to the reviewed explanation, labelled "The move".
import { useEffect, useRef, useState } from "preact/hooks";
import type { Question } from "../../content/generate.ts";
import type { Lang } from "../../content/types.ts";
import type { AiResult } from "../../storage/progress.ts";
import { Button } from "../components/Button";
import { useProgress } from "../progress";
import { moveOrFirst } from "../../content/moves.ts";
import "./help.css";

const TIMEOUT_MS = 15_000;
type Style = "plain" | "analogy";
type Failure = Exclude<AiResult, "genuine" | "cancelled">;
type View = { s: "idle" } | { s: "loading" } | { s: "text"; text: string } | { s: "cancelled" } | { s: Failure };

const NOTE: Record<Failure, string> = {
  offline: "Online AI help needs internet. Carry on with the steps above; the move below works offline.",
  rate: "Too many requests just now. Wait a minute, or carry on with the steps above.",
  timeout: "AI help took too long. Carry on with the steps above.",
  invalid: "AI help could not give a safe explanation this time. Here is the move instead.",
  unavailable: "AI help isn't available right now. Carry on with the steps above.",
};

export function StillStuck({ question: q, lang, blocked, onAccepted }: { question: Question; lang: Lang; blocked: boolean; onAccepted(then: () => void): void }) {
  const { store } = useProgress();
  const [view, setView] = useState<View>({ s: "idle" });
  const run = useRef<AbortController | null>(null);
  const live = useRef(true);
  const accepted = useRef(onAccepted); // the save must see the attempt as it is now, not as it was when the button was pressed
  accepted.current = onAccepted;
  const [saving, setSaving] = useState(false); // accepted and being recorded: too late to cancel
  const gen = useRef(0); // bumped by every ask and cancel, so a save finishing after Cancel cannot show the text
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      run.current?.abort();
    };
  }, []);

  const note = (result: AiResult) => void store.recordAiUse({ at: Date.now(), result }).catch(() => {});

  // An accepted reply waits until no other save is running or waiting for Retry: the question drops a save asked for
  // while blocked, which would leave Loading stuck. It then records help("ai") on the attempt as it is by then.
  const [pending, setPending] = useState<{ text: string; mine: number } | null>(null);
  useEffect(() => {
    if (!pending || blocked) return;
    const { text, mine } = pending;
    setPending(null);
    accepted.current(() => {
      if (!live.current || gen.current !== mine) return;
      setSaving(false);
      note("genuine");
      setView({ s: "text", text });
    });
  }, [pending, blocked]);

  const ask = async (style: Style) => {
    if (run.current || blocked) return;
    if (!navigator.onLine) return note("offline"), setView({ s: "offline" });
    const ac = new AbortController();
    const mine = ++gen.current;
    run.current = ac;
    let timedOut = false;
    const timer = setTimeout(() => ((timedOut = true), ac.abort()), TIMEOUT_MS);
    setSaving(false);
    setView({ s: "loading" });
    const end = (result: AiResult, next: View) => {
      if (!live.current) return;
      note(result);
      setView(next);
    };
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ moveId: q.moveId, contentVersion: q.contentVersion, style }),
        signal: ac.signal,
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; text?: unknown; reason?: string } | null;
      if (!live.current) return;
      if (ac.signal.aborted) return void (timedOut && end("timeout", { s: "timeout" })); // a stalled body is a timeout, a Cancel is not
      if (res.ok && body?.ok === true && typeof body.text === "string") {
        setSaving(true);
        setPending({ text: body.text, mine });
      } else if (res.status === 429) end("rate", { s: "rate" });
      else if (res.status === 504 || body?.reason === "timeout") end("timeout", { s: "timeout" });
      else if (body?.reason === "invalid") end("invalid", { s: "invalid" });
      else end("unavailable", { s: "unavailable" });
    } catch {
      if (!live.current) return;
      if (timedOut) end("timeout", { s: "timeout" });
      else if (ac.signal.aborted) return;
      else end(navigator.onLine ? "unavailable" : "offline", { s: navigator.onLine ? "unavailable" : "offline" });
    } finally {
      clearTimeout(timer);
      if (run.current === ac) run.current = null;
    }
  };

  const cancel = () => {
    if (saving) return;
    run.current?.abort();
    run.current = null;
    gen.current++;
    note("cancelled");
    setView({ s: "cancelled" });
  };

  const failed = view.s !== "idle" && view.s !== "loading" && view.s !== "text" && view.s !== "cancelled";
  return (
    <section class="hp-ai" aria-label="Still stuck?">
      <h3 class="hp-ai-title">Still stuck?</h3>
      {(view.s === "idle" || view.s === "cancelled" || view.s === "text" || failed) && (
        <div class="hp-two">
          <Button variant="secondary" disabled={blocked} onClick={() => ask("plain")}>In plain words</Button>
          <Button variant="secondary" disabled={blocked} onClick={() => ask("analogy")}>With an example</Button>
        </div>
      )}
      <div role="status" aria-live="polite" class="hp-ai-body">
        {view.s === "idle" && <p class="hp-ai-note">Get the move explained another way. AI help needs internet.</p>}
        {view.s === "loading" && (
          <>
            <p class="hp-ai-note">Asking for an explanation. You can keep going with the steps above.</p>
            {!saving && <Button variant="tertiary" onClick={cancel}>Cancel</Button>}
          </>
        )}
        {view.s === "cancelled" && <p class="hp-ai-note">Cancelled. Nothing changed.</p>}
        {view.s === "text" && (
          <div class="hp-ai-card">
            <p class="hp-ai-label">AI help · based on the reviewed move explanation{lang === "pcm" ? " · AI help · English" : ""}</p>
            <p class="hp-ai-text">{view.text}</p>
          </div>
        )}
        {failed && (
          <>
            <p class="hp-ai-note">{NOTE[view.s as Failure]}</p>
            <div class="hp-ai-card">
              <p class="hp-ai-label">The move</p>
              <p class="hp-ai-text">{moveOrFirst(q.moveId).coach[lang].explanation}</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
