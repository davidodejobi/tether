// Home's proof stamp, due/recovery card and primary action (spec sections 9 and 10).
import { useLocation } from "preact-iso";
import { homeAction, proofStatus } from "../../rules/proof.ts";
import { resumePoint } from "../../storage/progress.ts";
import "../components/Button.css";
import { Stamp } from "../components/Stamp";
import { day } from "../results/dates.ts";
import { useProgress } from "../progress";
import { appNow, demoOn, demoQuery, simulatedDate } from "./simulate";
import "./proof.css";

const MOVE_ID = "strip-disguise";

export function ProofCard() {
  const { store } = useProgress();
  const { route } = useLocation();
  const cycle = store.progress.cycles.get(MOVE_ID) ?? null;
  const zone = cycle?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = appNow(zone);
  const status = proofStatus(cycle, now);
  const action = homeAction(cycle, now, resumePoint(store.progress) !== null);
  const q = demoQuery();
  const sim = simulatedDate();

  return (
    <section class="pc" aria-label="Your proof">
      {sim && <p class="pc-sim" role="status">Simulated date: {day(sim)}. Demo only; your saved progress is not changed.</p>}
      {status && (
        <div class="pc-stamp">
          <Stamp state={status.state} due={status.due} size={72} />
          <div>
            {status.due && <p class="pc-line"><strong>{status.overdue ? "Your recheck is waiting." : "Recheck due today."}</strong></p>}
            {status.state === "fading" && <p class="pc-line">It slipped a bit. Practise the move, then pass 4 of 5 to restore it.</p>}
            {status.state === "held" && !status.due && (status.nextDue ? <p class="pc-line">Next recheck: {day(status.nextDue)}</p> : <p class="pc-line">Every scheduled recheck passed.</p>)}
            {status.state === "proved" && !status.due && status.nextDue && <p class="pc-line">First recheck: {day(status.nextDue)}</p>}
          </div>
        </div>
      )}
      <div class="pc-actions">
        {sim && (action === "recheck" || action === "recover") ? (
          // Read-only preview: nothing here starts a run, so a simulated day cannot change saved progress.
          <>
            <button class="btn btn-primary" type="button" disabled>{action === "recheck" ? "Start recheck (demo preview)" : "Practise to recover (demo preview)"}</button>
            {action === "recover" && <button class="btn btn-secondary" type="button" disabled>Try anyway (demo preview)</button>}
            <p class="pc-line">Return to the real date to start.</p>
          </>
        ) : (
          <>
            {action === "recheck" && <a class="btn btn-primary" href={`/recheck-entry${q}`}>Start recheck</a>}
            {action === "recover" && (
              <>
                <a class="btn btn-primary" href="/practice">Practise to recover</a>
                <a class="btn btn-secondary" href={`/recheck-entry${q}`}>Try anyway</a>
              </>
            )}
          </>
        )}
        {action === "practice" && <a class="btn btn-primary" href="/practice">Practise Move 1</a>}
        {action === "continue" && <a class="btn btn-primary" href="/practice">Continue where you stopped</a>}
      </div>
      {demoOn() && (
        <form class="pc-demo" onSubmit={(e) => {
          e.preventDefault();
          const v = new FormData(e.currentTarget as HTMLFormElement).get("date");
          route(v ? `/?demo=${v}` : "/?demo");
        }}>
          <label>Demo: simulate date <input type="date" name="date" value={sim ?? ""} /></label>
          <button class="btn btn-tertiary" type="submit">Apply</button>
          <a href="/?demo">Real date</a>
        </form>
      )}
    </section>
  );
}
