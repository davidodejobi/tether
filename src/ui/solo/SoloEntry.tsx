// The solo check's entry card (spec sections 6, 7 and 10). Ready or not, it never blocks: "Try anyway" starts it.
// No Bo here: Bo is absent from solo (spec section 7).
import { stripDisguise as pack } from "../../content/strip-disguise.ts";
import { Button } from "../components/Button";
import { Dots } from "../components/Dots";
import { Icon, type IconName } from "../components/Icon";
import "./Solo.css";

const FACTS: { icon: IconName; text: string }[] = [
  { icon: "target", text: "10 questions. Pass is 8 of 10." },
  { icon: "eye-off", text: "No help, no move sheet." },
  { icon: "timer", text: "10 minutes." },
  { icon: "warning", text: "Away for 10 seconds or more turns it into practice. A short call is fine." },
];

export function SoloEntry({ dots, onStart, onPractise }: { dots: 0 | 1 | 2 | 3; onStart(): void; onPractise(): void }) {
  const ready = dots === 3;
  return (
    <main class="so">
      <div class="so-hero"><Dots filled={dots} hero /></div>
      <div class="so-side">
        <section class="so-card" aria-labelledby="so-title">
          <h1 id="so-title" tabIndex={-1}>
            {ready ? `You're solo-ready on ${pack.title}.` : "You're not solo-ready yet."}
          </h1>
          {!ready && <p class="so-lead">We recommend 3 dots first.</p>}
          <ul class="so-facts">
            {FACTS.map((f) => (
              <li key={f.icon}>
                <Icon name={f.icon} size={24} />
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </section>
        <div class="so-actions">
          {ready ? (
            <>
              <Button onClick={onStart}>Start solo checkpoint</Button>
              <Button variant="tertiary" onClick={onPractise}>Keep practising</Button>
            </>
          ) : (
            <>
              <Button onClick={onPractise}>Keep practising</Button>
              <Button variant="secondary" onClick={onStart}>Try anyway</Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
