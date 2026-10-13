import { useState } from "preact/hooks";
import { requestPersistentStorage } from "../../platform/storage.ts";
import { cleanNickname, newLearner, type Learner } from "../../storage/progress.ts";
import { Bo } from "../components/Bo";
import { Button } from "../components/Button";
import { CoachBubble } from "../components/CoachBubble";
import { Icon } from "../components/Icon";
import { useProgress } from "../progress";
import { Lesson } from "./Lesson";
import { ErrorText, Screen, StepHeading, useAction } from "./parts";
import { resumeStep, type Step } from "./resume.ts";
import { TutorialQuestions } from "./TutorialQuestions";

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <>
      <div class="ob-body ob-center">
        <p class="ob-brand"><Icon name="tether" size={24} /> Tether</p>
        <Bo pose="wave" size={160} />
        <StepHeading>Learning that doesn't drift</StepHeading>
        <p class="ob-lead">Fix one JAMB English mistake for good, in 5 minutes a day. Works without data.</p>
      </div>
      <div class="ob-actions">
        <Button onClick={onStart}>Start</Button>
        <p class="ob-foot">JAMB Use of English · Move 1</p>
      </div>
    </>
  );
}

function Nickname({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const { save } = useProgress();
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const { error, busy, run } = useAction();
  const submit = (e: Event) => {
    e.preventDefault();
    const name = cleanNickname(value);
    setInvalid(!name);
    if (!name) return;
    run(async () => {
      await save({ learner: newLearner(name) });
      void requestPersistentStorage(); // after the save, never blocking
      onSaved();
    });
  };
  return (
    <form class="ob-form" onSubmit={submit} noValidate>
      <div class="ob-body">
        <button type="button" class="ob-back" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <StepHeading>What should we call you?</StepHeading>
        <p class="ob-lead">A first name or nickname is fine. It stays on this device.</p>
        <label class="ob-label" for="nickname">Nickname</label>
        <input
          id="nickname"
          class="ob-input"
          value={value}
          autoComplete="nickname"
          aria-invalid={invalid}
          aria-describedby="nickname-error"
          onInput={(e) => (setValue(e.currentTarget.value), setInvalid(false))}
        />
        <div id="nickname-error">
          {invalid && <ErrorText>Type a nickname of 1 to 30 characters.</ErrorText>}
          {error && <ErrorText>{error}</ErrorText>}
        </div>
      </div>
      <div class="ob-actions">
        <Button type="submit" disabled={busy}>Continue</Button>
      </div>
    </form>
  );
}

function FirstWin({ learner, onYours, onSkip, busy, error }: { learner: Learner; onYours: () => void; onSkip: () => void; busy: boolean; error: string }) {
  return (
    <>
      <div class="ob-body ob-center">
        <Bo pose={learner.coach === "character" ? "pleased" : "idle"} size={140} />
        <StepHeading>First win</StepHeading>
        <p class="ob-lead">You finished the introduction. You know the move now: cover the side phrase, read what's left, match the verb.</p>
        <div class="ls-card ob-left">
          <h2 class="ob-card-title">Next: practice</h2>
          <p>The three tutorial questions earned no scores or dots. Practice starts from zero, with help when you need it.</p>
        </div>
      </div>
      <div class="ob-actions">
        {error && <ErrorText>{error}</ErrorText>}
        <Button onClick={onYours} disabled={busy}>Make Tether yours</Button>
        <Button variant="tertiary" onClick={onSkip} disabled={busy}>Skip for now</Button>
      </div>
    </>
  );
}

function Choice<T extends string>({ legend, name, value, options, onChange }: { legend: string; name: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <fieldset class="ob-choice">
      <legend class="ob-label">{legend}</legend>
      <div class="ob-choice-row">
        {options.map(([v, label]) => (
          <label key={v}>
            <input class="ob-radio sr-only" type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
            <span class="ob-face">
              <span class="ob-tick"><Icon name="check" size={20} /></span>
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Preferences({ learner, onFinish, onBack }: { learner: Learner; onFinish: (next: Learner) => Promise<void>; onBack: () => void }) {
  const [part, setPart] = useState<"choices" | "partner">("choices");
  const [coach, setCoach] = useState(learner.coach);
  const [lang, setLang] = useState(learner.lang);
  const [name, setName] = useState(learner.partner?.name ?? "");
  const [phone, setPhone] = useState(learner.partner?.phone ?? "");
  const { error, busy, run } = useAction();
  const finish = (withPartner: boolean) =>
    run(() => {
      const partner = withPartner && (name.trim() || phone.trim()) ? { ...(name.trim() && { name: name.trim() }), ...(phone.trim() && { phone: phone.trim() }) } : null;
      return onFinish({ ...learner, coach, lang, partner });
    });

  if (part === "partner")
    return (
      <>
        <div class="ob-body">
          <button type="button" class="ob-back" onClick={() => setPart("choices")} aria-label="Back to choices"><Icon name="back" /></button>
          <StepHeading>Want someone to see your wins?</StepHeading>
          <p class="ob-lead">Optional. Add a parent, tutor or friend. Tether sends nothing unless you tap Share, and only your wins.</p>
          <label class="ob-label" for="partner-name">Their name (optional)</label>
          <input id="partner-name" class="ob-input" value={name} placeholder="e.g. Mrs Okafor" autoComplete="off" onInput={(e) => setName(e.currentTarget.value)} />
          <label class="ob-label" for="partner-phone">WhatsApp number (optional)</label>
          <input id="partner-phone" class="ob-input" type="tel" inputMode="tel" value={phone} placeholder="+234 801 234 5678" autoComplete="off" onInput={(e) => setPhone(e.currentTarget.value)} />
        </div>
        <div class="ob-actions">
          {error && <ErrorText>{error}</ErrorText>}
          <Button onClick={() => finish(true)} disabled={busy}>Done</Button>
          <Button variant="tertiary" onClick={() => finish(false)} disabled={busy}>Skip for now</Button>
        </div>
      </>
    );

  return (
    <>
      <div class="ob-body">
        <button type="button" class="ob-back" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <StepHeading>Make Tether yours</StepHeading>
        <p class="ob-lead">All optional. You can change any of it later in Settings.</p>
        <Choice legend="Coach style" name="coach" value={coach} onChange={setCoach} options={[["character", "Character"], ["text", "Text only"]]} />
        <Choice legend="Coach language" name="lang" value={lang} onChange={setLang} options={[["en", "English"], ["pcm", "Pidgin"]]} />
        {lang === "pcm" && <p class="ob-note"><span class="coach-tag">Unreviewed</span> Pidgin coaching is new and not yet reviewed.</p>}
        <p class="ob-note">Coming next: Français. More languages later.</p>
        <button type="button" class="ob-link-card" onClick={() => setPart("partner")}>
          <span>
            <strong>Someone to see your wins</strong>
            <span class="ob-note">{name || phone ? `${name || "Added"}. Tap to change.` : "Optional. Only wins, only when you tap Share."}</span>
          </span>
          <Icon name="chevron-right" />
        </button>
      </div>
      <div class="ob-actions">
        {error && <ErrorText>{error}</ErrorText>}
        <Button onClick={() => finish(true)} disabled={busy}>Done</Button>
        <Button variant="tertiary" onClick={() => run(() => onFinish({ ...learner, onboarded: true }))} disabled={busy}>Skip, use the defaults</Button>
      </div>
    </>
  );
}

/** Welcome → Nickname → Learn the move → tutorial questions → First win → Make Tether yours. Finishing saves `onboarded`. */
export function Onboarding() {
  const { store, save } = useProgress();
  const learner = store.progress.learner;
  const [step, setStep] = useState<Step>(() => resumeStep(learner));
  const { error, busy, run } = useAction();
  const saveLearner = (next: Learner) => save({ learner: next });
  const finish = (next: Learner) => saveLearner({ ...next, onboarded: true }); // the gate then shows Home

  // The learner exists from the nickname step on.
  if (step === "welcome") return <Screen><Welcome onStart={() => setStep("nickname")} /></Screen>;
  if (step === "nickname" || !learner)
    return <Screen><Nickname onBack={() => setStep("welcome")} onSaved={() => setStep("lesson")} /></Screen>;
  if (step === "lesson")
    return (
      <Screen>
        <Lesson coach={learner.coach} lang={learner.lang} onDone={async () => (await saveLearner({ ...learner, lessonDone: true }), setStep("questions"))} />
      </Screen>
    );
  if (step === "questions") return <Screen><TutorialQuestions onDone={() => setStep("win")} /></Screen>;
  if (step === "win")
    return (
      <Screen>
        <FirstWin learner={learner} busy={busy} error={error} onYours={() => setStep("preferences")} onSkip={() => run(() => finish(learner))} />
      </Screen>
    );
  return <Screen><Preferences learner={learner} onBack={() => setStep("win")} onFinish={finish} /></Screen>;
}
