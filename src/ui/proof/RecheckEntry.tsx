// /recheck-entry: what a recheck is, then a link to the runner at /run/recheck (step 11).
import { recheckAvailable } from "../../rules/proof.ts";
import { Dots } from "../components/Dots";
import { Icon, type IconName } from "../components/Icon";
import { useProgress } from "../progress";
import { appNow, simulatedDate } from "./simulate";
import "../components/Button.css";
import "../solo/Solo.css";
import "./proof.css";

const FACTS: { icon: IconName; text: string }[] = [
  { icon: "target", text: "5 questions. Pass is 4 of 5." },
  { icon: "eye-off", text: "No help, no move sheet." },
  { icon: "timer", text: "5 minutes." },
  { icon: "warning", text: "Away for 10 seconds or more turns it into practice. A short call is fine." },
];

export function RecheckEntry() {
  const { store } = useProgress();
  const cycle = store.progress.cycles.get("strip-disguise") ?? null;
  const avail = recheckAvailable(cycle, cycle ? appNow(cycle.timeZone) : Date.now());
  const sim = simulatedDate();
  return (
    <main class="so rc">
      <section class="so-card" aria-labelledby="rc-title">
        {sim && <p class="pc-sim" role="status">Simulated date: {sim}. Demo only; your saved progress is not changed.</p>}
        <h1 id="rc-title">{!avail ? "No recheck is due yet" : avail.purpose === "recovery" ? "Restore your proof" : "Time for your recheck"}</h1>
        {avail ? (
          <ul class="so-facts">
            {FACTS.map((f) => (
              <li key={f.icon}><Icon name={f.icon} size={24} /><span>{f.text}</span></li>
            ))}
          </ul>
        ) : (
          <p class="so-lead">Keep practising; your recheck will show on Home when it is due.</p>
        )}
      </section>
      <div class="so-actions">
        {avail && (sim ? (
          // Read-only preview: the runner always uses the real date and real records.
          <><button class="btn btn-primary" type="button" disabled>Start recheck (demo preview)</button><p class="so-lead">Return to the real date to start.</p></>
        ) : (
          <a class="btn btn-primary" href="/run/recheck">Start recheck</a>
        ))}
        <a class="btn btn-tertiary" href={avail ? "/practice" : "/"}>{avail ? "Keep practising" : "Back to Home"}</a>
      </div>
    </main>
  );
}
