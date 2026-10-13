import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { Button } from "../components/Button";
import { SentenceCard } from "../components/SentenceCard";
import { AnswerTiles, type Tile } from "../components/AnswerTiles";
import { Dots } from "../components/Dots";
import { Stamp } from "../components/Stamp";
import { Score } from "../components/Score";
import { Bo, type Pose } from "../components/Bo";
import { CoachBubble } from "../components/CoachBubble";
import { Icon, ICON_NAMES } from "../components/Icon";
import "./Kit.css";

const POSES: Pose[] = ["idle", "thinking", "nudge", "pleased", "concerned", "wave"];
const WORDS = ["is", "are", "was", "were"];
const plain: Tile[] = WORDS.map((label) => ({ label }));
const noop = () => {};

function Group({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section class="kit-group">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Interactive() {
  const [value, setValue] = useState<number | null>(null);
  const [struck, setStruck] = useState<number[]>([]);
  const tiles: Tile[] = WORDS.map((label, i) => ({ label, struck: struck.includes(i) }));
  return (
    <>
      <SentenceCard before="Chidi, as well as his friends," after="late for class." filled={value === null ? undefined : WORDS[value]} />
      <AnswerTiles tiles={tiles} value={value} onSelect={setValue} />
      <div class="kit-row">
        <Button disabled={value === null} onClick={() => value !== null && (setStruck([...struck, value]), setValue(null))}>
          Check (strikes it out)
        </Button>
        <Button variant="tertiary" onClick={() => (setStruck([]), setValue(null))}>Reset</Button>
      </div>
    </>
  );
}

function Panel({ theme }: { theme: "light" | "dark" }) {
  return (
    <div class="kit-panel" data-theme={theme}>
      <h2>{theme === "light" ? "Light: Naija Green" : "Dark: Adire Night"}</h2>

      <Group title="Button">
        <div class="kit-row">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
        </div>
        <div class="kit-row">
          <Button icon="play">With icon</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>Disabled</Button>
        </div>
      </Group>

      <Group title="SentenceCard: empty / filled / correct">
        <SentenceCard before="Chidi, as well as his friends," after="late for class." />
        <SentenceCard before="Chidi, as well as his friends," after="late for class." filled="is" />
        <SentenceCard before="Chidi, as well as his friends," after="late for class." filled="is" correct />
      </Group>

      <Group title="Answer tiles: idle / selected / struck out / correct">
        <AnswerTiles tiles={plain} value={null} onSelect={noop} />
        <AnswerTiles tiles={plain} value={0} onSelect={noop} />
        <AnswerTiles tiles={[{ label: "is" }, { label: "are", struck: true }, { label: "was" }, { label: "were", struck: true }]} value={null} onSelect={noop} />
        <AnswerTiles tiles={plain} value={0} correct={0} onSelect={noop} />
      </Group>

      <Group title="Try it (keys 1-4, arrows, Space)">
        <Interactive />
      </Group>

      <Group title="Readiness dots">
        <div class="kit-col">
          {([0, 1, 2, 3] as const).map((n) => <Dots key={n} filled={n} />)}
        </div>
      </Group>

      <Group title="Stamp: none / proved / held / fading / proved + due">
        <div class="kit-row">
          <Stamp state="none" />
          <Stamp state="proved" />
          <Stamp state="held" />
          <Stamp state="fading" />
          <Stamp state="proved" due />
        </div>
        <div class="pin-light kit-card">
          <p class="kit-note">Proof card: pinned light in either theme</p>
          <div class="kit-row"><Stamp state="held" /><Stamp state="fading" /></div>
        </div>
      </Group>

      <Group title="Scores: with help / alone, present and absent">
        <Score kind="help" value={7} />
        <Score kind="help" value={null} />
        <Score kind="alone" value={5} />
        <Score kind="alone" value={null} />
      </Group>

      <Group title="Bo and coach bubble (character, Pidgin, text only)">
        <div class="kit-row">
          {POSES.map((p) => <figure key={p}><Bo pose={p} /><figcaption>{p}</figcaption></figure>)}
        </div>
        <CoachBubble pose="nudge">Cover the side phrase and read it again.</CoachBubble>
        <CoachBubble pose="nudge" unreviewed>Cover di side phrase, read am again.</CoachBubble>
        <CoachBubble mode="text">Cover the side phrase and read it again.</CoachBubble>
      </Group>

      <Group title="Icons">
        <div class="kit-icons">
          {ICON_NAMES.map((n) => <figure key={n}><Icon name={n} /><figcaption>{n}</figcaption></figure>)}
        </div>
      </Group>
    </div>
  );
}

export default function Kit() {
  return (
    <main class="kit">
      <h1>Component kit</h1>
      <p class="kit-note">Dev only. Not in the production bundle.</p>
      <div class="kit-panels">
        <Panel theme="light" />
        <Panel theme="dark" />
      </div>
    </main>
  );
}
