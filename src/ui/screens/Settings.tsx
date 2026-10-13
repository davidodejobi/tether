// Settings (spec sections 10 and 14a). Every change is saved first and shows only once the save lands; a failed
// save keeps the old value and offers Retry, which repeats the same change. Controls stay disabled while saving.
import { useState } from "preact/hooks";
import { cue, setSoundsOn, unlockSound } from "../../platform/sound.ts";
import { cleanNickname, type Learner } from "../../storage/progress.ts";
import { Identity } from "../components/Avatar";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { useProgress } from "../progress";
import "./settings.css";

const PARTNER_MAX = 40;

export function Settings() {
  const { store, save } = useProgress();
  const learner = store.progress.learner;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<(() => void) | null>(null);
  const [name, setName] = useState<string | null>(null); // unsaved nickname edit
  const [partner, setPartner] = useState<{ name: string; phone: string } | null>(null); // unsaved partner edit
  if (!learner) return <main />;
  const sounds = learner.sounds === true;
  const savedPartner = { name: learner.partner?.name ?? "", phone: learner.partner?.phone ?? "" };

  // The saved value decides what shows; `hooks` are the Sounds toggle's audio side effects.
  const change = (patch: Partial<Learner>, hooks: { onOk?: () => void; onFail?: () => void; onSaved?: () => void } = {}) => {
    const go = async () => {
      setBusy(true);
      try {
        await save({ learner: { ...learner, ...patch } });
        setFailed(null);
        hooks.onSaved?.();
        hooks.onOk?.();
      } catch {
        hooks.onFail?.();
        setFailed(() => go);
      } finally {
        setBusy(false);
      }
    };
    void go();
  };

  const setSounds = (value: boolean) => {
    if (value) unlockSound(); // inside the click, so the browser lets audio start
    else setSoundsOn(false); // mute at once; a failed save restores the saved value
    change({ sounds: value }, { onOk: () => value && (setSoundsOn(true), cue("toggle")), onFail: () => setSoundsOn(sounds) });
  };

  const nickname = cleanNickname(name ?? learner.nickname);
  const edited = partner ?? savedPartner;
  const partnerDirty = partner !== null && (partner.name.trim() !== savedPartner.name || partner.phone.trim() !== savedPartner.phone);

  // Radios and checkboxes are controlled: the saved value decides, so a failed save leaves the old one showing.
  const choice = <K extends "coach" | "lang">(key: K, value: Learner[K], label: string, extra?: string) => (
    <label class="st-choice">
      <input type="radio" name={key} checked={learner[key] === value} disabled={busy} onChange={() => change({ [key]: value })} /> {label}
      {extra && <span class="st-tag">{extra}</span>}
    </label>
  );

  return (
    <main class="page st">
      <a class="st-back" href="/"><Icon name="back" /> Home</a>
      <h1>Settings</h1>
      <Identity learner={learner} />

      <form class="st-group" onSubmit={(e) => (e.preventDefault(), nickname && change({ nickname }, { onSaved: () => setName(null) }))}>
        <label for="st-nick">Nickname</label>
        <input id="st-nick" value={name ?? learner.nickname} maxLength={60} disabled={busy} onInput={(e) => setName(e.currentTarget.value)} aria-invalid={nickname ? undefined : true} />
        <Button type="submit" variant="secondary" disabled={busy || !nickname || nickname === learner.nickname}>Save nickname</Button>
        <small>Your avatar stays the same.</small>
      </form>

      <fieldset class="st-group">
        <legend>Coach style</legend>
        {choice("coach", "character", "Character")}
        {choice("coach", "text", "Text only")}
        <small>Text only keeps every teaching caption.</small>
      </fieldset>

      <fieldset class="st-group">
        <legend>Language</legend>
        {choice("lang", "en", "English")}
        {choice("lang", "pcm", "Pidgin", "Unreviewed")}
        <small>Coming next: Français. More languages later.</small>
        <small>Exam questions stay in English whatever you choose.</small>
      </fieldset>

      <div class="st-group">
        <label class="st-choice">
          <input type="checkbox" checked={learner.readAloud} disabled={busy} onChange={(e) => (e.currentTarget.checked = learner.readAloud, change({ readAloud: !learner.readAloud }))} /> Read-aloud
        </label>
        <small>Reads coach words out. Off by default; you can still tap to hear any line.</small>
      </div>

      <div class="st-group">
        <label class="st-choice">
          <input type="checkbox" checked={sounds} disabled={busy} onChange={(e) => (e.currentTarget.checked = sounds, setSounds(!sounds))} /> Sounds
        </label>
        <small>Quiet cues for taps and answers. Separate from read-aloud.</small>
      </div>

      <form
        class="st-group"
        onSubmit={(e) => {
          e.preventDefault();
          const n = edited.name.trim();
          const ph = edited.phone.trim();
          change({ partner: n || ph ? { ...(n && { name: n }), ...(ph && { phone: ph }) } : null }, { onSaved: () => setPartner(null) });
        }}
      >
        <h2>Study partner (optional)</h2>
        <label for="st-pname">Partner name</label>
        <input id="st-pname" value={edited.name} maxLength={PARTNER_MAX} disabled={busy} onInput={(e) => setPartner({ ...edited, name: e.currentTarget.value })} />
        <label for="st-pphone">Partner phone</label>
        <input id="st-pphone" type="tel" inputMode="tel" value={edited.phone} maxLength={PARTNER_MAX} disabled={busy} onInput={(e) => setPartner({ ...edited, phone: e.currentTarget.value })} />
        <Button type="submit" variant="secondary" disabled={busy || !partnerDirty}>Save partner</Button>
        <small>Used only when you choose to share. Saved on this phone.</small>
      </form>

      {failed && (
        <p role="alert" class="st-alert">
          Couldn't save this change. <Button variant="secondary" disabled={busy} onClick={failed}>Retry</Button>
        </p>
      )}
    </main>
  );
}
