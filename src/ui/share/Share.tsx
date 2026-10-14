// Share preview at /share/:runId?kind=proof|progress (spec section 11). Sharing happens only on a tap; cancelling changes nothing.
import { useEffect, useState } from "preact/hooks";
import { useLocation, useRoute } from "preact-iso";
import { Button } from "../components/Button";
import { useOnline } from "../offline/sw.ts";
import { useProgress } from "../progress";
import { resultView } from "../results/view.ts";
import { cardModel } from "./card.ts";
import { drawCard } from "./draw.ts";
import "../results/Result.css";
import "./Share.css";

const laptop = () => matchMedia("(min-width: 1280px)").matches;

export function Share() {
  const { params, query } = useRoute();
  const { store } = useProgress();
  const { route } = useLocation();
  const v = resultView(store.progress, params.runId ?? "", Date.now());
  const learner = store.progress.learner!;
  const kind = query.kind === "progress" ? "progress" : "proof";
  const model = v && cardModel(store.progress, v, kind, learner);
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [message, setMessage] = useState(model?.message ?? "");
  const [note, setNote] = useState("");
  const online = useOnline();
  useEffect(() => {
    if (!model) return;
    let url = "";
    let gone = false;
    drawCard(model).then(
      (blob) => !gone && setImage({ blob, url: (url = URL.createObjectURL(blob)) }),
      () => !gone && setNote("Couldn't make the card image. You can still copy the text."),
    );
    return () => ((gone = true), url && URL.revokeObjectURL(url));
  }, [model?.kind, v?.saved.run.id]);

  const back = () => route(`/result/${params.runId}`);
  if (!v || !model)
    return (
      <main class="rs rs-missing">
        <h1>Nothing to share</h1>
        <p>This result has no card to share.</p>
        <Button onClick={v ? back : () => route("/")}>{v ? "Back to result" : "Back to Home"}</Button>
      </main>
    );

  const file = image && new File([image.blob], `tether-${kind}.png`, { type: "image/png" });
  const canShare = !laptop() && !!file && typeof navigator.share === "function" && !!navigator.canShare?.({ files: [file] });
  const download = () => {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image.url;
    a.download = `tether-${kind}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setNote("Text copied.");
    } catch {
      setNote("Couldn't copy. Select the text and copy it yourself.");
    }
  };
  const share = async () => {
    try {
      await navigator.share({ files: [file!], text: message });
    } catch (e) {
      // Cancelling is a normal choice, not an error.
      if ((e as Error).name !== "AbortError") setNote("Couldn't open sharing. Download the card or copy the text instead.");
    }
  };

  return (
    <main class="rs sh">
      <h1>{kind === "proof" ? "Share your proof" : "Share your progress"}</h1>
      {image ? <img class="sh-card" src={image.url} alt={`Share card: ${model.headline}, ${model.score}, ${model.date}${model.move ? `, ${model.move}` : ""}`} /> : <div class="sh-card sh-wait" aria-hidden="true" />}
      <label class="sh-msg">
        <span>Message</span>
        <textarea rows={4} value={message} onInput={(e) => setMessage(e.currentTarget.value)} />
      </label>
      {!online && <p class="rs-note">You're offline. The card and download still work; sending it to someone may need a connection.</p>}
      <p class="rs-note" role="status">{note}</p>
      <div class="rs-actions">
        {canShare && <Button icon="share" onClick={share}>Share</Button>}
        <Button variant={canShare ? "secondary" : "primary"} disabled={!image} onClick={download}>Download card</Button>
        <Button variant="secondary" onClick={copy}>Copy text</Button>
        <Button variant="tertiary" onClick={back}>Back to result</Button>
      </div>
    </main>
  );
}
