// Home's offline cues (spec sections 11 and 13): Ready offline, Retry, Update ready and install guidance.
// Only Home renders this, so an update never activates mid-question or mid-run.
import { useEffect, useState } from "preact/hooks";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { canPromptInstall, isInstalled, isIos, onInstallChange, promptInstall } from "./install.ts";
import { offlineState } from "./state.ts";
import { swSupported, useServiceWorker } from "./sw.ts";
import "./offline.css";

export function OfflineCues() {
  const sw = useServiceWorker();
  const state = offlineState({ supported: swSupported(), online: sw.online, missing: sw.missing });
  return (
    <section class="oc" aria-label="Offline and install">
      {state === "ready" && <p class="oc-line oc-ready"><Icon name="check" size={20} />Ready offline</p>}
      {state === "preparing" && <p class="oc-line" aria-live="polite">Getting ready for offline use...</p>}
      {state === "needsDownload" && <p class="oc-line" aria-live="polite">You are offline. Tether needs one download first. Connect once and open it again.</p>}
      {state === "partial" && (
        <div class="oc-row">
          <p class="oc-line" aria-live="polite">Not everything is saved for offline yet.</p>
          <Button variant="secondary" onClick={() => void sw.retry()}>Retry</Button>
        </div>
      )}
      {sw.update && (
        <div class="oc-row">
          <p class="oc-line">A new version is ready.</p>
          <Button variant="secondary" onClick={sw.update}>Update ready</Button>
        </div>
      )}
      <InstallCard />
    </section>
  );
}

function InstallCard() {
  const [, tick] = useState(0);
  const [hidden, setHidden] = useState(false);
  useEffect(() => onInstallChange(() => tick((n) => n + 1)), []);
  if (hidden || isInstalled()) return null;
  const prompt = canPromptInstall();
  return (
    <div class="oc-install">
      <p class="oc-title"><Icon name="tether" size={20} />Add Tether to your home screen</p>
      <p class="oc-line">
        {prompt
          ? "Opens like an app and works without data."
          : isIos()
            ? "In Safari, tap Share, then Add to Home Screen."
            : "In your browser menu, choose Install app or Add to Home screen."}
      </p>
      <div class="oc-row">
        {prompt && <Button onClick={() => void promptInstall()}>Add</Button>}
        <Button variant="tertiary" onClick={() => setHidden(true)}>Not now</Button>
      </div>
    </div>
  );
}
