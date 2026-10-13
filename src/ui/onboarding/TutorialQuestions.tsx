import { Button } from "../components/Button";
import { StepHeading } from "./parts";

// Placeholder: the lead replaces this body with the reusable question view (origin "tutorial").
// Tutorial answers must change no scores, dots or claims; that rule lives in that view.
export function TutorialQuestions({ onDone }: { onDone: () => void }) {
  return (
    <>
      <div class="ob-body">
        <StepHeading>Try three questions</StepHeading>
        <p class="ob-placeholder">Three tutorial questions</p>
      </div>
      <div class="ob-actions">
        <Button onClick={onDone}>Continue</Button>
      </div>
    </>
  );
}
