import type { ComponentChildren } from "preact";
import { useLocation } from "preact-iso";
import { Icon, type IconName } from "../components/Icon";
import { useProgress } from "../progress";
import "./shell.css";

// Proof is left out until a Proof screen exists (docs/spec.md section 10: no empty Proof tab).
const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "map" },
  { href: "/practice", label: "Practice", icon: "target" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

/** Wraps Home, Practice and Settings for an onboarded learner. The left rail shows from 1280 px; below that the page fills the width. */
export function AppShell({ children }: { children: ComponentChildren }) {
  const { path } = useLocation();
  const { store } = useProgress();
  const nickname = store.progress.learner?.nickname;
  return (
    <div class="shell">
      <aside class="shell-rail">
        <p class="shell-brand"><Icon name="tether" size={24} /> Tether</p>
        <nav aria-label="Main">
          <ul class="shell-nav">
            {ITEMS.map((i) => (
              <li key={i.href}>
                <a class="shell-link" href={i.href} aria-current={path === i.href ? "page" : undefined}>
                  <Icon name={i.icon} />
                  {i.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {nickname && (
          <div class="shell-learner">
            <strong>{nickname}</strong>
            <span>JAMB Use of English</span>
          </div>
        )}
      </aside>
      <div class="shell-content">{children}</div>
    </div>
  );
}
