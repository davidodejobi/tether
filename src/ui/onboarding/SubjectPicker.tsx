import "./onboarding.css";
import { MAX_EXTRA_SUBJECTS, SUBJECTS } from "../../content/subjects.ts";

/** Use of English is fixed; up to three others are a preference. Shared by onboarding and Settings. */
export function SubjectPicker({ value, onChange, disabled }: { value: string[]; onChange: (next: string[]) => void; disabled?: boolean }) {
  const full = value.length >= MAX_EXTRA_SUBJECTS;
  return (
    <div class="sub">
      <label class="sub-row sub-fixed">
        <input type="checkbox" checked disabled aria-describedby="sub-english-note" />
        <span><strong>Use of English</strong><small id="sub-english-note">Everyone takes Use of English</small></span>
      </label>
      <p class="ob-note" id="sub-limit" aria-live="polite">
        {full ? `You picked ${MAX_EXTRA_SUBJECTS} of ${MAX_EXTRA_SUBJECTS}. Untick one to pick another.` : `Pick up to ${MAX_EXTRA_SUBJECTS} more, or none. ${value.length} of ${MAX_EXTRA_SUBJECTS} picked.`}
      </p>
      {SUBJECTS.map(({ id, name }) => {
        const on = value.includes(id);
        return (
          <label key={id} class="sub-row">
            <input
              type="checkbox"
              checked={on}
              disabled={disabled || (full && !on)}
              aria-describedby="sub-limit"
              onChange={() => onChange(on ? value.filter((v) => v !== id) : [...value, id])}
            />
            <span><strong>{name}</strong><small>Coming soon</small></span>
          </label>
        );
      })}
    </div>
  );
}
