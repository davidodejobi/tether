import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { Button } from "../components/Button";
import { Onboarding } from "./Onboarding";
import { Screen, StepHeading } from "./parts";
import { useProgressState } from "../progress";

/** What the app shows before learning: opening, storage problems, read-only, onboarding. Home and the rest are its children. */
export function Gate({ children }: { children: ComponentChildren }) {
  const state = useProgressState();
  const [acknowledged, setAcknowledged] = useState(false);

  if (state.status === "opening")
    return (
      <Screen>
        <div class="ob-body ob-center" aria-busy="true">
          <p class="ob-brand">Tether</p>
        </div>
      </Screen>
    );

  if (state.status === "couldNotOpen")
    return (
      <Screen>
        <div class="ob-body">
          <StepHeading>Couldn't open your saved progress</StepHeading>
          <p class="ob-lead">Your progress may still be on this device. Try again before you carry on.</p>
        </div>
        <div class="ob-actions">
          <Button onClick={state.retry}>Retry</Button>
          <Button variant="tertiary" onClick={state.continueWithoutSaving}>Continue without saving</Button>
          <p class="ob-foot">Without saving, nothing you do is kept when this page closes.</p>
        </div>
      </Screen>
    );

  const { store, reopen } = state;
  if (store.readOnly === "otherTab")
    return (
      <Screen>
        <div class="ob-body">
          <StepHeading>Tether is open in another tab</StepHeading>
          <p class="ob-lead">Use that tab to keep learning. Nothing can be saved here. If you closed it, try again.</p>
        </div>
        <div class="ob-actions">
          <Button onClick={reopen}>Try again</Button>
        </div>
      </Screen>
    );
  if (store.readOnly === "newerSchema")
    return (
      <Screen>
        <div class="ob-body">
          <StepHeading>Tether needs an update</StepHeading>
          <p class="ob-lead">Your saved progress is from a newer version of Tether. Reload to get the latest version. Nothing can be saved until then.</p>
        </div>
        <div class="ob-actions">
          <Button onClick={() => location.reload()}>Reload</Button>
        </div>
      </Screen>
    );

  if (!store.durable && !acknowledged)
    return (
      <Screen>
        <div class="ob-body">
          <StepHeading>Progress is temporary on this device</StepHeading>
          <p class="ob-lead">Tether can't keep your progress on this device. What you do will be lost when you close or reload this page.</p>
        </div>
        <div class="ob-actions">
          <Button onClick={() => setAcknowledged(true)}>Continue</Button>
        </div>
      </Screen>
    );

  return store.progress.learner?.onboarded ? <>{children}</> : <Onboarding />;
}
