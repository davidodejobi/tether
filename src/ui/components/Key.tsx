import type { ComponentChildren } from "preact";

// A keyboard hint chip for the laptop layout. Decorative: the real shortcuts are in the spec, not announced here.
export const Key = ({ k, children }: { k: string; children: ComponentChildren }) => (
  <span class="qv-key"><kbd>{k}</kbd> {children}</span>
);
