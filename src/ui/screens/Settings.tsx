// Minimal for now: identity and Sounds. Step 14 completes this screen (docs/roadmap.md) and keeps both.
import { useState } from "preact/hooks";
import { cue, setSoundsOn, unlockSound } from "../../platform/sound.ts";
import { Identity } from "../components/Avatar";
import { Button } from "../components/Button";
import { useProgress } from "../progress";

export function Settings() {
  const { store, save } = useProgress();
  const learner = store.progress.learner;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<(() => void) | null>(null);
  if (!learner) return <main />;
  const sounds = learner.sounds === true;

  // Saved first; the switch shows the new value only once the save landed, and Retry repeats the same change.
  const setSounds = (value: boolean) => {
    const go = async () => {
      setBusy(true);
      try {
        await save({ learner: { ...learner, sounds: value } });
        setFailed(null);
        if (value) (setSoundsOn(true), cue("toggle")); // the saved value reaches the service on re-render; the cue should not wait for it
      } catch {
        setSoundsOn(sounds);
        setFailed(() => go);
      } finally {
        setBusy(false);
      }
    };
    if (value) unlockSound(); // inside the click, so the browser lets audio start
    else setSoundsOn(false); // mute at once; a failed save restores the saved value below
    void go();
  };

  return (
    <main class="page">
      <h1>Settings</h1>
      <Identity learner={learner} />
      <p>
        <label>
          <input
            type="checkbox"
            checked={sounds}
            disabled={busy}
            onChange={(e) => {
              e.currentTarget.checked = sounds; // controlled: the saved value decides
              setSounds(!sounds);
            }}
          />{" "}
          Sounds
        </label>
        <br />
        <small>Quiet cues for taps and answers. Separate from read-aloud.</small>
      </p>
      {failed && (
        <p role="alert">
          Couldn't save this change. <Button variant="secondary" disabled={busy} onClick={failed}>Retry</Button>
        </p>
      )}
      <a href="/">Home</a>
    </main>
  );
}
