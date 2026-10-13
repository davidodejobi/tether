// Hook for roadmap step 9a (online AI explanation). Rendered at the bottom of the Go deeper view; renders
// nothing until 9a replaces this body. Its request/cancel/offline handling and the help("ai") call belong there.
import type { Question } from "../../content/generate.ts";
import type { Lang } from "../../content/types.ts";

export function StillStuck(_props: { question: Question; lang: Lang }) {
  return null;
}
