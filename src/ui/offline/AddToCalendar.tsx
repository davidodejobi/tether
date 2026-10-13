// Add to calendar (spec section 11): the next scheduled recheck as an .ics download. Works offline; the use is recorded
// locally in IndexedDB (meta:calendarUses) and never uploaded.
import { proofStatus } from "../../rules/proof.ts";
import { Button } from "../components/Button";
import { useProgress } from "../progress";
import { simulatedDate } from "../proof/simulate";
import { buildIcs } from "./ics.ts";

const MOVE_ID = "strip-disguise";

export function AddToCalendar() {
  const { store } = useProgress();
  const cycle = store.progress.cycles.get(MOVE_ID) ?? null;
  const date = cycle && cycle.state !== "fading" ? proofStatus(cycle, Date.now())?.nextDue : null;
  if (!cycle || !date) return null;

  const add = () => {
    const now = Date.now();
    const ics = buildIcs({
      date,
      timeZone: cycle.timeZone,
      summary: "Tether recheck",
      description: "Five questions on your own to keep your Strip the Disguise proof.",
      uid: `recheck-${date}@tether`,
      now,
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    a.download = `tether-recheck-${date}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    store.recordCalendarUse(now).catch(() => {}); // ponytail: a metric, not a promise; never blocks the download
  };

  // A simulated date is a read-only preview: no download and no pilot-metric record.
  if (simulatedDate()) return <Button variant="tertiary" icon="calendar" disabled>Add to calendar (demo preview)</Button>;
  return <Button variant="tertiary" icon="calendar" onClick={add}>Add to calendar</Button>;
}
