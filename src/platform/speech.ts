// Read-aloud through the device's own speech (spec section 13). Exam sentences stay English; coach text uses
// the selected language. Never promised: callers check speechOk() and keep text controls usable without it.
import { useEffect, useState } from "preact/hooks";
import type { Lang } from "../content/types.ts";

export const speechOk = () => typeof window !== "undefined" && "speechSynthesis" in window;

const norm = (l: string) => l.replace("_", "-").toLowerCase();

/** Pidgin: a pcm voice, then en-NG. English: en-NG, then any English. With no pcm voice (including none loaded yet), Pidgin is read in English and labelled so. */
function pick(lang: Lang): { voice?: SpeechSynthesisVoice; exact: boolean; label: string } {
  const voices = speechOk() ? window.speechSynthesis.getVoices() : [];
  const by = (p: (l: string) => boolean) => voices.find((v) => p(norm(v.lang)));
  const pcm = lang === "pcm" ? by((l) => l === "pcm" || l.startsWith("pcm-")) : undefined;
  if (pcm) return { voice: pcm, exact: true, label: "" };
  const ng = by((l) => l === "en-ng");
  const voice = ng ?? by((l) => l.startsWith("en"));
  return { voice, exact: lang === "en", label: lang === "pcm" ? (ng ? "Read in a Nigerian English voice" : "Read in an English voice") : "" };
}

/** True while the device is reading aloud (or about to); interaction sounds stay quiet meanwhile. */
export const readingAloud = () => speechOk() && (window.speechSynthesis.speaking || window.speechSynthesis.pending);

export function speak(text: string, lang: Lang = "en") {
  if (!speechOk()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const { voice } = pick(lang);
  if (voice) u.voice = voice;
  // No matching voice (or voices not loaded yet): ask for Nigerian English explicitly, as the label says.
  u.lang = voice?.lang ?? "en-NG";
  synth.speak(u);
}

/** Text to show beside a read button when Pidgin is read by an English voice; empty otherwise. Updates when voices load. */
export function useVoiceNote(lang: Lang): string {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!speechOk()) return;
    const synth = window.speechSynthesis;
    const on = () => tick((n) => n + 1);
    synth.addEventListener("voiceschanged", on);
    return () => synth.removeEventListener("voiceschanged", on);
  }, []);
  return pick(lang).label;
}
