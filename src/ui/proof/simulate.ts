// Demo-only simulated date (roadmap step 13). It lives in the URL (?demo=YYYY-MM-DD) and nowhere else:
// nothing here reads or writes saved progress, so a simulated day never alters a real record.
import { atCivilDate } from "../../rules/proof.ts";

const param = () => new URLSearchParams(location.search).get("demo");

/** True when the demo tools were asked for with ?demo or ?demo=DATE. */
export const demoOn = () => param() !== null;

/** The simulated civil date, or null for real time. */
export const simulatedDate = () => {
  const d = param();
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
};

/** "Now" for due checks: the simulated date in the cycle's zone, else the real clock. */
export const appNow = (timeZone: string) => {
  const d = simulatedDate();
  return d ? atCivilDate(d, timeZone) : Date.now();
};

/** Query string to carry onto links so the simulation follows the learner. */
export const demoQuery = () => (simulatedDate() ? `?demo=${simulatedDate()}` : "");
