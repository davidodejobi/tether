import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import "./onboarding.css";

/** The heading of each new step takes focus when it appears, so keyboard and screen-reader users start there. */
export function StepHeading({ level = 1, children }: { level?: 1 | 2; children: ComponentChildren }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  const Tag = level === 1 ? "h1" : "h2";
  return (
    <Tag class="ob-heading" ref={ref} tabIndex={-1}>
      {children}
    </Tag>
  );
}

/** Screen shell shared by onboarding and the startup screens. */
export function Screen({ children, kind }: { children: ComponentChildren; kind?: "welcome" }) {
  return <main class={kind ? `ob ob-${kind}` : "ob"}>{children}</main>;
}

/** Errors are announced as they appear. */
export function ErrorText({ children }: { children?: ComponentChildren }) {
  return (
    <p class="ob-error" role="alert">
      {children}
    </p>
  );
}

/** Runs a save, tracking busy and failure so a failed save keeps the screen and offers retry. */
export function useAction() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch {
      setError("Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, run };
}

export function useReducedMotion(): boolean {
  const query = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  const [reduced, setReduced] = useState(query?.matches ?? false);
  useEffect(() => {
    if (!query) return;
    const on = () => setReduced(query.matches);
    query.addEventListener("change", on);
    return () => query.removeEventListener("change", on);
  }, []);
  return reduced;
}
