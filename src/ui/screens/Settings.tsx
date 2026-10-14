// Settings (spec sections 10 and 14a). Every change is saved first and shows only once the save lands; a failed
// save keeps the old value and offers Retry, which repeats the same change. Controls stay disabled while saving.
import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { cue, setSoundsOn, unlockSound } from "../../platform/sound.ts";
import { extrasOf, SUBJECT_SOURCE, withEnglish } from "../../content/subjects.ts";
import { cleanNickname, type Learner } from "../../storage/progress.ts";
import { Identity } from "../components/Avatar";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { SubjectPicker } from "../onboarding/SubjectPicker";
import { useProgress } from "../progress";
import "./settings.css";

const PARTNER_MAX = 40;

// One tappable card; the panel opens beneath the row inside the same card (Figma S14a SettingsRow).
function Row({ id, label, value, open, onToggle, children }: { id: string; label: string; value: string; open: boolean; onToggle: () => void; children: ComponentChildren }) {
  return (
    <div class={`st-card${open ? " st-open" : ""}`}>
      <button type="button" class="st-row" aria-expanded={open} aria-controls={`st-p-${id}`} aria-label={`${label}, ${value}`} onClick={onToggle}>
        <span class="st-label">{label}</span>
        <span class="st-value">{value}</span>
        <Icon name="chevron-right" />
      </button>
      {open && <div class="st-panel" id={`st-p-${id}`}>{children}</div>}
    </div>
  );
}

export function Settings() {
  const { store, save, idle } = useProgress();
  const learner = store.progress.learner;
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<(() => void) | null>(null);
  const [name, setName] = useState<string | null>(null); // unsaved nickname edit
  const [partner, setPartner] = useState<{ name: string; phone: string } | null>(null); // unsaved partner edit
  if (!learner) return <main />;
  const sounds = learner.sounds !== false;
  const savedPartner = { name: learner.partner?.name ?? "", phone: learner.partner?.phone ?? "" };

  // The saved value decides what shows; `hooks` are the Sounds toggle's audio side effects.
  const change = (patch: Partial<Learner>, hooks: { onOk?: () => void; onFail?: () => void; onSaved?: () => void } = {}) => {
    const go = async () => {
      setBusy(true);
      try {
        // A save started before this screen opened (the learner left and came back mid-save) lands first; then the
        // change applies to the latest saved learner, so neither it nor a Retry brings back an older value.
        await idle();
        await save({ learner: { ...store.progress.learner!, ...patch } });
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
  const choice = <K extends "coach" | "lang" | "theme">(key: K, value: Learner[K], label: string, extra?: string) => (
    <label class="st-choice">
      <input type="radio" name={key} checked={(learner[key] ?? (key === "theme" ? "system" : undefined)) === value} disabled={busy} onChange={() => change({ [key]: value })} /> {label}
      {extra && <span class="st-tag">{extra}</span>}
    </label>
  );

  const row = (id: string, label: string, value: string, children: ComponentChildren) => (
    <Row id={id} label={label} value={value} open={openId === id} onToggle={() => setOpenId(openId === id ? null : id)}>{children}</Row>
  );
  const COACH = { character: "Character", text: "Text only" };
  const THEME = { system: "Match my device", light: "Light", dark: "Dark" };
  const LANG = { en: "English", pcm: "Pidgin" };
  const extras = extrasOf(learner).length;

  return (
    <main class="page st">
      <header class="st-head">
        <a class="st-back" href="/" aria-label="Home"><Icon name="back" /></a>
        <h1>Settings</h1>
      </header>
      <Identity learner={learner} />

      <section class="st-sec" aria-labelledby="st-cap-study">
        <h2 class="st-cap" id="st-cap-study">Study</h2>
        {row("coach", "Coach style", COACH[learner.coach ?? "character"], (
          <fieldset class="st-fields">
            <legend>Coach style</legend>
            {choice("coach", "character", "Character")}
            {choice("coach", "text", "Text only")}
            <small>Text only keeps every teaching caption.</small>
          </fieldset>
        ))}
        {row("theme", "Appearance", THEME[learner.theme ?? "system"], (
          <fieldset class="st-fields">
            <legend>Appearance</legend>
            {choice("theme", "system", "Match my device")}
            {choice("theme", "light", "Light")}
            {choice("theme", "dark", "Dark")}
            <small>Proof cards stay light in both, so they read well when shared.</small>
          </fieldset>
        ))}
        {row("lang", "Language", LANG[learner.lang ?? "en"], (
          <fieldset class="st-fields">
            <legend>Language</legend>
            {choice("lang", "en", "English")}
            {choice("lang", "pcm", "Pidgin")}
            <small>Coming next: Français. More languages later.</small>
            <small>Exam questions stay in English whatever you choose.</small>
          </fieldset>
        ))}
        {row("read", "Read coach words out", learner.readAloud ? "On" : "Off", (
          <div class="st-fields">
            <label class="st-choice">
              <input type="checkbox" checked={learner.readAloud} disabled={busy} onChange={(e) => (e.currentTarget.checked = learner.readAloud, change({ readAloud: !learner.readAloud }))} /> Read-aloud
            </label>
            <small>Reads coach words out. Off by default; you can still tap to hear any line.</small>
          </div>
        ))}
        {row("sounds", "Sounds", sounds ? "On" : "Off", (
          <div class="st-fields">
            <label class="st-choice">
              <input type="checkbox" checked={sounds} disabled={busy} onChange={(e) => (e.currentTarget.checked = sounds, setSounds(!sounds))} /> Sounds
            </label>
            <small>Quiet cues for taps and answers. Separate from read-aloud.</small>
          </div>
        ))}
        {row("subjects", "Subjects", extras ? `English + ${extras}` : "English", (
          <div class="st-fields">
            <SubjectPicker value={extrasOf(learner)} disabled={busy} onChange={(next) => change({ subjects: withEnglish(next) })} />
            <small>{SUBJECT_SOURCE}. A preference, not advice on what you can take.</small>
          </div>
        ))}
      </section>

      <section class="st-sec" aria-labelledby="st-cap-people">
        <h2 class="st-cap" id="st-cap-people">People</h2>
        {row("nick", "Nickname", learner.nickname, (
          <form class="st-fields" onSubmit={(e) => (e.preventDefault(), nickname && change({ nickname }, { onSaved: () => setName(null) }))}>
            <label for="st-nick">Nickname</label>
            <input id="st-nick" value={name ?? learner.nickname} maxLength={60} disabled={busy} onInput={(e) => setName(e.currentTarget.value)} aria-invalid={nickname ? undefined : true} />
            <Button type="submit" variant="secondary" disabled={busy || !nickname || nickname === learner.nickname}>Save nickname</Button>
            <small>Your avatar stays the same.</small>
          </form>
        ))}
        {row("partner", "Partner", savedPartner.name || savedPartner.phone || "None", (
          <form
            class="st-fields"
            onSubmit={(e) => {
              e.preventDefault();
              const n = edited.name.trim();
              const ph = edited.phone.trim();
              change({ partner: n || ph ? { ...(n && { name: n }), ...(ph && { phone: ph }) } : null }, { onSaved: () => setPartner(null) });
            }}
          >
            <label for="st-pname">Partner name</label>
            <input id="st-pname" value={edited.name} maxLength={PARTNER_MAX} disabled={busy} onInput={(e) => setPartner({ ...edited, name: e.currentTarget.value })} />
            <label for="st-pphone">Partner phone</label>
            <input id="st-pphone" type="tel" inputMode="tel" value={edited.phone} maxLength={PARTNER_MAX} disabled={busy} onInput={(e) => setPartner({ ...edited, phone: e.currentTarget.value })} />
            <Button type="submit" variant="secondary" disabled={busy || !partnerDirty}>Save partner</Button>
            <small>Used only when you choose to share. Saved on this phone.</small>
          </form>
        ))}
      </section>

      {failed && (
        <p role="alert" class="st-alert">
          Couldn't save this change. <Button variant="secondary" disabled={busy} onClick={failed}>Retry</Button>
        </p>
      )}
    </main>
  );
}
